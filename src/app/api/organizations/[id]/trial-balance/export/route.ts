import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { trialBalance } from "@/lib/accounting/ledger-service";
import { journalActor, journalDenied, journalFailure, journalNoStore } from "@/lib/accounting/journal-api";
import { writeAudit } from "@/lib/audit";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const actor = await journalActor(id, "accounting:trial-balance:export"); if (!actor) return journalDenied();
  const parsed = z.object({ fiscalYearId: z.uuid(), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), view: z.enum(["DETAILED", "SUMMARY"]).optional() }).safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "بيانات التصدير غير صالحة." }, { status: 400, headers: journalNoStore });
  try {
    const report = await trialBalance(id, parsed.data); const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet("ميزان المراجعة", { views: [{ rightToLeft: true }] });
    sheet.addRow(["ميزان المراجعة", report.fiscalYear.name, parsed.data.from, parsed.data.to, report.currency]); sheet.addRow([]);
    sheet.addRow(["الكود", "الحساب / التصنيف", "افتتاحي مدين", "افتتاحي دائن", "حركة مدين", "حركة دائن", "ختامي مدين", "ختامي دائن"]);
    const rows = parsed.data.view === "SUMMARY"
      ? report.summary.map(row => ({ code: row.accountClass, name: row.accountClass, openingDebit: row.openingDebit, openingCredit: row.openingCredit, periodDebit: row.periodDebit, periodCredit: row.periodCredit, closingDebit: row.closingDebit, closingCredit: row.closingCredit }))
      : report.rows.map(row => ({ code: row.code, name: row.nameAr, openingDebit: row.openingDebit, openingCredit: row.openingCredit, periodDebit: row.periodDebit, periodCredit: row.periodCredit, closingDebit: row.closingDebit, closingCredit: row.closingCredit }));
    for (const row of rows) sheet.addRow([row.code, row.name, row.openingDebit, row.openingCredit, row.periodDebit, row.periodCredit, row.closingDebit, row.closingCredit]);
    sheet.addRow(["", "الإجمالي", report.totals.openingDebit, report.totals.openingCredit, report.totals.periodDebit, report.totals.periodCredit, report.totals.closingDebit, report.totals.closingCredit]);
    sheet.columns = [{ width: 16 }, { width: 38 }, ...Array.from({ length: 6 }, () => ({ width: 17 }))]; sheet.getRow(3).font = { bold: true, color: { argb: "FFFFFFFF" } }; sheet.getRow(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF102B4C" } };
    const buffer = await book.xlsx.writeBuffer(); await writeAudit({ organizationId: id, actorUserId: actor.id, action: "TRIAL_BALANCE_EXPORTED", entityType: "CompanyFiscalYear", entityId: report.fiscalYear.id, metadata: { rowCount: rows.length, reconciled: report.reconciled }, request });
    return new NextResponse(Buffer.from(buffer), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="trial-balance-${parsed.data.from}-${parsed.data.to}.xlsx"`, "cache-control": "private, no-store" } });
  } catch (error) { return journalFailure(error); }
}
