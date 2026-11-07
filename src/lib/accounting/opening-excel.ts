import ExcelJS from "exceljs";
import { createHash } from "node:crypto";
import { OpeningError } from "./opening-service";

export type OpeningColumn = "code" | "name" | "debit" | "credit" | "explanation" | "sourceReference";
export type ColumnMap = Partial<Record<OpeningColumn, number>>;
export type StagedOpeningRow = { rowNumber: number; code: string; name: string; debit: string; credit: string; explanation: string; sourceReference: string };
const fields: OpeningColumn[] = ["code", "name", "debit", "credit", "explanation", "sourceReference"];
const aliases: Record<OpeningColumn, string[]> = {
  code: ["account code", "account number", "code", "كود الحساب", "رقم الحساب"],
  name: ["account name", "name", "اسم الحساب"],
  debit: ["opening debit", "debit", "مدين", "الرصيد المدين", "رصيد اول المده مدين"],
  credit: ["opening credit", "credit", "دائن", "الرصيد الدائن", "رصيد اول المده دائن"],
  explanation: ["notes", "note", "explanation", "ملاحظات", "البيان"],
  sourceReference: ["source reference", "reference", "المرجع", "مرجع المصدر"],
};
const normalize = (value: string) => value.trim().toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/\s+/g, " ");

// Inspect ZIP directory before ExcelJS allocates decompressed XML.
export function inspectXlsx(buffer: Buffer) {
  if (buffer.length > 2_000_000 || buffer.length < 22) throw new OpeningError("حجم ملف Excel غير مسموح (الحد 2 ميجابايت).", 413);
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0 || end + 22 > buffer.length) throw new OpeningError("ملف XLSX غير صالح.");
  const count = buffer.readUInt16LE(end + 10);
  const directorySize = buffer.readUInt32LE(end + 12);
  let at = buffer.readUInt32LE(end + 16);
  if (!count || count > 200 || at + directorySize > end) throw new OpeningError("بنية ملف Excel غير مسموحة.");
  let total = 0;
  for (let index = 0; index < count; index++) {
    if (at + 46 > end || buffer.readUInt32LE(at) !== 0x02014b50) throw new OpeningError("دليل ملف Excel تالف.");
    const flags = buffer.readUInt16LE(at + 8);
    const method = buffer.readUInt16LE(at + 10);
    const size = buffer.readUInt32LE(at + 24);
    const nameLength = buffer.readUInt16LE(at + 28);
    const extraLength = buffer.readUInt16LE(at + 30);
    const commentLength = buffer.readUInt16LE(at + 32);
    const name = buffer.subarray(at + 46, at + 46 + nameLength).toString("utf8");
    if (flags & 1 || ![0, 8].includes(method) || size > 8_000_000 || name.includes("..") || name.startsWith("/") || name.includes("\\")) throw new OpeningError("ملف Excel يحتوي مكونًا غير مسموح.");
    if (/(?:vbaProject|externalLinks|activeX|embeddings|connections|macros|oleObjects)/i.test(name)) throw new OpeningError("ملف Excel يحتوي محتوى نشطًا أو روابط خارجية.");
    total += size;
    if (total > 8_000_000) throw new OpeningError("الملف يتجاوز حد المعالجة الآمنة.", 413);
    at += 46 + nameLength + extraLength + commentLength;
  }
  if (at !== buffer.readUInt32LE(end + 16) + directorySize) throw new OpeningError("دليل ملف Excel غير متسق.");
}

function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value == null) return "";
  if (typeof value === "object") {
    if ("formula" in value || "sharedFormula" in value || "hyperlink" in value) throw new OpeningError(`الصيغ والروابط غير مسموحة في الخلية ${cell.address}.`);
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    throw new OpeningError(`نوع بيانات غير مدعوم في الخلية ${cell.address}.`);
  }
  if (typeof value === "boolean") throw new OpeningError(`قيمة غير مدعومة في الخلية ${cell.address}.`);
  return String(value).trim();
}

export function detectColumns(headers: string[]): ColumnMap {
  const result: ColumnMap = {};
  for (const field of fields) {
    const found = headers.findIndex(header => aliases[field].some(alias => normalize(header) === normalize(alias)));
    if (found >= 0) result[field] = found + 1;
  }
  return result;
}

export async function parseOpeningXlsx(buffer: Buffer, mapping?: ColumnMap) {
  inspectXlsx(buffer);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  if (workbook.worksheets.length !== 1) throw new OpeningError("استخدم ورقة عمل واحدة فقط في الملف.");
  const sheet = workbook.worksheets[0];
  if (sheet.actualColumnCount > 20 || sheet.rowCount > 1001) throw new OpeningError("الحد الأقصى 20 عمودًا و1000 صف بيانات.", 413);
  for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    for (let columnNumber = 1; columnNumber <= Math.min(sheet.columnCount, 20); columnNumber++) cellText(row.getCell(columnNumber));
  }
  const headers = Array.from({ length: Math.min(sheet.columnCount, 20) }, (_, i) => cellText(sheet.getRow(1).getCell(i + 1)));
  const columns = { ...detectColumns(headers), ...mapping };
  if (!columns.code || !columns.debit || !columns.credit || Object.values(columns).some(value => !Number.isInteger(value) || value! < 1 || value! > 20)) throw new OpeningError("حدد أعمدة كود الحساب والمدين والدائن بصورة صحيحة.");
  if (new Set(Object.values(columns)).size !== Object.values(columns).length) throw new OpeningError("لا يمكن ربط عمود واحد بأكثر من حقل.");
  const rows: StagedOpeningRow[] = [];
  for (let index = 2; index <= sheet.rowCount; index++) {
    const row = sheet.getRow(index);
    const get = (field: OpeningColumn) => columns[field] ? cellText(row.getCell(columns[field]!)) : "";
    const item: StagedOpeningRow = { rowNumber: index, code: get("code"), name: get("name"), debit: get("debit") || "0", credit: get("credit") || "0", explanation: get("explanation"), sourceReference: get("sourceReference") };
    if (item.code || item.name || item.debit !== "0" || item.credit !== "0" || item.explanation) rows.push(item);
  }
  if (!rows.length) throw new OpeningError("ملف Excel لا يحتوي أرصدة.");
  return { headers, columns, rows, sha256: createHash("sha256").update(buffer).digest("hex") };
}

export async function openingTemplate(accounts: Array<{ code: string; nameAr: string }>) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("أرصدة أول المدة", { views: [{ rightToLeft: true }] });
  sheet.columns = [
    { header: "كود الحساب", key: "code", width: 18 }, { header: "اسم الحساب", key: "name", width: 40 },
    { header: "مدين", key: "debit", width: 19 }, { header: "دائن", key: "credit", width: 19 },
    { header: "ملاحظات", key: "explanation", width: 35 }, { header: "مرجع المصدر", key: "sourceReference", width: 24 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getColumn(1).numFmt = "@";
  for (const account of accounts) sheet.addRow({ code: account.code, name: account.nameAr, debit: "", credit: "" });
  return Buffer.from(await book.xlsx.writeBuffer());
}
