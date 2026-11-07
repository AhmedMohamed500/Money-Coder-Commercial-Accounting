import { NextResponse } from "next/server";
import { z } from "zod";
import { automationActor, automationBadOrigin, automationDenied, automationFailure, automationJson, automationSameOrigin, privateNoStore } from "@/lib/accounting/automation-api";
import { reviewBankTransaction } from "@/lib/accounting/bank-automation-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; statementId: string; transactionId: string }> }) {
  const { id, statementId, transactionId } = await params;
  if (!automationSameOrigin(request)) return automationBadOrigin();
  try {
    const parsed = z.object({ action: z.enum(["CORRECT", "REVIEW", "REJECT"]), revision: z.number().int().positive(), reason: z.string().trim().max(500).optional(), description: z.string().trim().max(1000).optional(), debit: z.string().max(30).optional(), credit: z.string().max(30).optional() }).strict().safeParse(await automationJson(request));
    if (!parsed.success) return NextResponse.json({ error: "بيانات الحركة غير صالحة." }, { status: 400, headers: privateNoStore });
    const permission = parsed.data.action === "CORRECT" ? "bank-statements:correct" : "bank-statements:review";
    const actor = await automationActor(id, permission);
    if (!actor) return automationDenied();
    return NextResponse.json(await reviewBankTransaction(id, statementId, transactionId, actor, parsed.data), { headers: privateNoStore });
  } catch (error) { return automationFailure(error); }
}
