import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { automationActor, automationDenied, automationFailure, privateNoStore } from "@/lib/accounting/automation-api";
import { AutomationError, bankStatementDetail } from "@/lib/accounting/bank-automation-service";
import { writeAudit } from "@/lib/audit";

function safeCell(value: string | null | undefined) {
  const text = value ?? "";
  return /^[\s]*[=+@\-\t\r]/.test(text) ? `'${text}` : text;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string; statementId: string }> }) {
  const { id, statementId } = await params;
  const actor = await automationActor(id, "bank-statements:export");
  if (!actor) return automationDenied();
  try {
    const statement = await bankStatementDetail(id, statementId);
    if (statement.reviewStatus !== "REVIEWED") throw new AutomationError("التصدير متاح بعد إقرار المراجعة فقط.", 409);
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet("حركات كشف البنك", { views: [{ rightToLeft: true }] });
    sheet.addRow(["Money Coder — كشف بنك مُراجع؛ ليس قيدًا محاسبيًا أو تسوية مع الدفاتر"]);
    sheet.addRow(["الحساب البنكي", safeCell(statement.bankAccount.bankName), "العملة", statement.currency]);
    sheet.addRow(["الرقم", "التاريخ", "المرجع", "الوصف الأصلي", "مدين أصلي", "دائن أصلي", "الرصيد الجاري", "الوصف المصحح", "مدين مصحح", "دائن مصحح", "حالة المراجعة"]);
    sheet.getRow(3).font = { bold: true };
    for (const row of statement.transactions) sheet.addRow([
      row.sequence, row.transactionDate.toISOString().slice(0, 10), safeCell(row.reference), safeCell(row.originalDescription),
      row.originalDebit.toString(), row.originalCredit.toString(), row.runningBalance.toString(),
      safeCell(row.correctedDescription), row.correctedDebit?.toString() ?? "", row.correctedCredit?.toString() ?? "", row.reviewStatus,
    ]);
    sheet.columns.forEach((column, index) => { column.width = index === 3 || index === 7 ? 42 : 20; });
    await writeAudit({ organizationId: id, actorUserId: actor.id, action: "BANK_STATEMENT_EXPORTED", entityType: "BankStatement", entityId: statementId, metadata: { transactionCount: statement.transactions.length }, request });
    const bytes = await book.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(bytes), { headers: { ...privateNoStore, "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="bank-statement-${statementId}.xlsx"`, "x-content-type-options": "nosniff" } });
  } catch (error) { return automationFailure(error); }
}
