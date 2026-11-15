import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generalLedger } from "@/lib/accounting/ledger-service";
import { journalActor, journalDenied, journalFailure, journalNoStore } from "@/lib/accounting/journal-api";
import { writeAudit } from "@/lib/audit";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const actor = await journalActor(id, "accounting:ledger:export"); if (!actor) return journalDenied();
  const parsed = z.object({ accountId: z.uuid(), fiscalYearId: z.uuid(), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "بيانات التصدير غير صالحة." }, { status: 400, headers: journalNoStore });
  try {
    const report = await generalLedger(id, parsed.data); const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet("دفتر الأستاذ", { views: [{ rightToLeft: true }] });
    sheet.addRow(["دفتر الأستاذ العام", report.account.code, report.account.nameAr]); sheet.addRow(["الفترة", parsed.data.from, parsed.data.to, "العملة", report.currency]);
    sheet.addRow(["رصيد أول المدة", report.opening.debit, report.opening.credit]); sheet.addRow([]);
    sheet.addRow(["رقم القيد", "تاريخ الترحيل", "المرجع", "البيان", "مدين", "دائن", "الرصيد", "طبيعة الرصيد", "مرجع المصدر"]);
    for (const row of report.movements) sheet.addRow([row.entryNumber, row.postingDate.toISOString().slice(0, 10), row.journalReference, row.description, row.debit, row.credit, row.running, row.runningSide === "DEBIT" ? "مدين" : "دائن", row.sourceReference]);
    sheet.addRow(["الإجمالي", "", "", "", report.totals.debit, report.totals.credit, report.closing.debit !== "0.00" ? report.closing.debit : report.closing.credit, report.closing.side === "DEBIT" ? "مدين" : "دائن"]);
    sheet.columns = [{ width: 12 }, { width: 14 }, { width: 22 }, { width: 42 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 24 }]; sheet.getRow(5).font = { bold: true, color: { argb: "FFFFFFFF" } }; sheet.getRow(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF102B4C" } };
    const buffer = await book.xlsx.writeBuffer(); await writeAudit({ organizationId: id, actorUserId: actor.id, action: "GENERAL_LEDGER_EXPORTED", entityType: "ChartAccount", entityId: report.account.id, metadata: { rowCount: report.movements.length }, request });
    return new NextResponse(Buffer.from(buffer), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="general-ledger-${report.account.code}.xlsx"`, "cache-control": "private, no-store" } });
  } catch (error) { return journalFailure(error); }
}
