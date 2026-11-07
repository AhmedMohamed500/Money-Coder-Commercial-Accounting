import { NextResponse } from "next/server";
import { z } from "zod";
import { automationActor, automationBadOrigin, automationDenied, automationFailure, automationJson, automationSameOrigin, privateNoStore } from "@/lib/accounting/automation-api";
import { bankStatementDetail, decideBankStatement } from "@/lib/accounting/bank-automation-service";
import { authorizeOrganization } from "@/lib/auth";

type Context = { params: Promise<{ id: string; statementId: string }> };
export async function GET(_request: Request, { params }: Context) {
  const { id, statementId } = await params;
  const actor = await automationActor(id, "bank-statements:view");
  if (!actor) return automationDenied();
  try {
    const detail = await bankStatementDetail(id, statementId);
    const mayAudit = await authorizeOrganization(actor.id, id, "bank-statements:audit:view");
    return NextResponse.json({ ...detail, decisions: mayAudit ? detail.decisions : [] }, { headers: privateNoStore });
  }
  catch (error) { return automationFailure(error); }
}
export async function PATCH(request: Request, { params }: Context) {
  const { id, statementId } = await params;
  const actor = await automationActor(id, "bank-statements:review");
  if (!actor) return automationDenied();
  if (!automationSameOrigin(request)) return automationBadOrigin();
  try {
    const parsed = z.object({ action: z.enum(["REVIEW", "REJECT"]), revision: z.number().int().positive(), reason: z.string().trim().max(500).optional() }).strict().safeParse(await automationJson(request));
    if (!parsed.success) return NextResponse.json({ error: "قرار المراجعة غير صالح." }, { status: 400, headers: privateNoStore });
    return NextResponse.json(await decideBankStatement(id, statementId, actor, parsed.data), { headers: privateNoStore });
  } catch (error) { return automationFailure(error); }
}
