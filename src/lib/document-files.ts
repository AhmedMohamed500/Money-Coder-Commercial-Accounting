import { createHash } from "node:crypto";

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export type AllowedDocumentMimeType = (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

const ALLOWED_EXTENSIONS: Record<AllowedDocumentMimeType, ReadonlySet<string>> = {
  "application/pdf": new Set(["pdf"]),
  "image/png": new Set(["png"]),
  "image/jpeg": new Set(["jpg", "jpeg"]),
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": new Set(["xlsx"]),
};

const XLSX_REQUIRED_ENTRIES = new Set([
  "[Content_Types].xml",
  "_rels/.rels",
  "xl/workbook.xml",
  "xl/_rels/workbook.xml.rels",
]);

export class DocumentValidationError extends Error {}

export function maximumUploadBytes() {
  const configured = Number(process.env.MAX_UPLOAD_BYTES ?? 5_242_880);
  return Number.isSafeInteger(configured) && configured >= 1 && configured <= 10_485_760 ? configured : 5_242_880;
}

export function normalizeOriginalFilename(value: string) {
  const leaf = value.replaceAll("\\", "/").split("/").pop()?.normalize("NFC") ?? "";
  const safe = leaf.replace(/[\u0000-\u001f\u007f]/g, "").replace(/["<>:|?*]/g, "_").trim();
  if (!safe || safe === "." || safe === ".." || safe.length > 180) throw new DocumentValidationError("اسم الملف غير صالح أو طويل جدًا.");
  return safe;
}

export function validateDeclaredDocument(input: { originalName: string; mimeType: string; sizeBytes: number }) {
  const originalName = normalizeOriginalFilename(input.originalName);
  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(input.mimeType as AllowedDocumentMimeType)) {
    throw new DocumentValidationError("نوع الملف غير مسموح. استخدم PDF أو PNG أو JPG أو XLSX.");
  }
  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > maximumUploadBytes()) {
    throw new DocumentValidationError("حجم الملف غير مسموح.");
  }
  const extension = originalName.includes(".") ? originalName.split(".").pop()!.toLowerCase() : "";
  if (!ALLOWED_EXTENSIONS[input.mimeType as AllowedDocumentMimeType].has(extension)) {
    throw new DocumentValidationError("امتداد الملف لا يطابق نوعه المعلن.");
  }
  return { originalName, mimeType: input.mimeType as AllowedDocumentMimeType, sizeBytes: input.sizeBytes };
}

function hasBytes(bytes: Buffer, expected: number[], offset = 0) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function validateXlsxArchive(bytes: Buffer) {
  const searchStart = Math.max(0, bytes.length - 65_557);
  let eocdOffset = -1;
  for (let offset = bytes.length - 22; offset >= searchStart; offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) { eocdOffset = offset; break; }
  }
  if (eocdOffset < 0) throw new DocumentValidationError("ملف XLSX غير صالح.");

  const entryCount = bytes.readUInt16LE(eocdOffset + 10);
  const centralSize = bytes.readUInt32LE(eocdOffset + 12);
  const centralOffset = bytes.readUInt32LE(eocdOffset + 16);
  if (!entryCount || entryCount > 256 || centralSize > bytes.length || centralOffset + centralSize > bytes.length) {
    throw new DocumentValidationError("بنية ملف XLSX غير آمنة.");
  }

  const names = new Set<string>();
  let offset = centralOffset;
  let totalUncompressed = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > bytes.length || bytes.readUInt32LE(offset) !== 0x02014b50) throw new DocumentValidationError("ملف XLSX غير صالح.");
    const flags = bytes.readUInt16LE(offset + 8);
    const compression = bytes.readUInt16LE(offset + 10);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const uncompressedSize = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const nextOffset = offset + 46 + nameLength + extraLength + commentLength;
    if ((flags & 0x1) !== 0 || ![0, 8].includes(compression) || nameLength < 1 || nameLength > 512 || nextOffset > bytes.length) {
      throw new DocumentValidationError("بنية ملف XLSX غير آمنة.");
    }
    const name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    if (!name || name.includes("\\") || name.startsWith("/") || name.split("/").some(part => part === "..") || name.includes("\0")) {
      throw new DocumentValidationError("بنية ملف XLSX غير آمنة.");
    }
    if (name.toLowerCase().endsWith("vbaproject.bin")) throw new DocumentValidationError("ملفات Excel التي تحتوي macros غير مسموحة.");
    if (compressedSize === 0 && uncompressedSize > 1_048_576) throw new DocumentValidationError("نسبة ضغط ملف XLSX غير آمنة.");
    if (compressedSize > 0 && uncompressedSize / compressedSize > 100) throw new DocumentValidationError("نسبة ضغط ملف XLSX غير آمنة.");
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > 67_108_864) throw new DocumentValidationError("محتوى ملف XLSX بعد فك الضغط كبير جدًا.");
    names.add(name);
    offset = nextOffset;
  }
  for (const required of XLSX_REQUIRED_ENTRIES) {
    if (!names.has(required)) throw new DocumentValidationError("الملف المضغوط ليس مصنف XLSX صالحًا.");
  }
}

export function validateStoredDocument(bytes: Buffer, mimeType: string, originalName: string) {
  const declared = validateDeclaredDocument({ originalName, mimeType, sizeBytes: bytes.length });
  if (declared.mimeType === "application/pdf") {
    if (bytes.length < 8 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-" || !bytes.subarray(Math.max(0, bytes.length - 2_048)).includes(Buffer.from("%%EOF"))) {
      throw new DocumentValidationError("محتوى الملف لا يطابق نوعه المعلن.");
    }
  } else if (declared.mimeType === "image/png") {
    if (!hasBytes(bytes, [137, 80, 78, 71, 13, 10, 26, 10]) || !bytes.subarray(Math.max(0, bytes.length - 32)).includes(Buffer.from("IEND"))) {
      throw new DocumentValidationError("محتوى الملف لا يطابق نوعه المعلن.");
    }
  } else if (declared.mimeType === "image/jpeg") {
    if (!hasBytes(bytes, [0xff, 0xd8, 0xff]) || !hasBytes(bytes, [0xff, 0xd9], bytes.length - 2)) {
      throw new DocumentValidationError("محتوى الملف لا يطابق نوعه المعلن.");
    }
  } else {
    if (!hasBytes(bytes, [0x50, 0x4b, 0x03, 0x04])) throw new DocumentValidationError("محتوى الملف لا يطابق نوعه المعلن.");
    validateXlsxArchive(bytes);
  }
  return { ...declared, sha256: createHash("sha256").update(bytes).digest("hex") };
}

export async function validateUpload(file: File) {
  const declared = validateDeclaredDocument({ originalName: file.name, mimeType: file.type, sizeBytes: file.size });
  const bytes = Buffer.from(await file.arrayBuffer());
  validateStoredDocument(bytes, declared.mimeType, declared.originalName);
  return bytes;
}
