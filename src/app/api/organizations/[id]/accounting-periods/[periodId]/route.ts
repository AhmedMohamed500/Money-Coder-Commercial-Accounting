import { NextResponse } from "next/server";
import { z } from "zod";
import { closeAccountingPeriod } from "@/lib/accounting/journal-service";
import { journalActor, journalBadOrigin, journalDenied, journalFailure, journalJson, journalNoStore, journalSameOrigin } from "@/lib/accounting/journal-api";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; periodId: string }> }) {
  const { id, periodId } = await params; if (!journalSameOrigin(request)) return journalBadOrigin();
  const actor = await journalActor(id, "accounting:periods:manage"); if (!actor) return journalDenied();
  try { const parsed = z.object({ action: z.literal("CLOSE"), confirmation: z.string().trim().min(1).max(80) }).strict().safeParse(await journalJson(request)); if (!parsed.success) return NextResponse.json({ error: "إجراء الفترة غير صالح." }, { status: 400, headers: journalNoStore }); return NextResponse.json(await closeAccountingPeriod(id, periodId, actor, parsed.data.confirmation, request), { headers: journalNoStore }); }
  catch (error) { return journalFailure(error); }
}
