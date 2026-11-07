import { NextResponse } from "next/server";
import { z } from "zod";
import { openingActor, openingBadOrigin, openingDenied, openingFailure, openingJson, openingNoStore, openingSameOrigin } from "@/lib/accounting/opening-api";
import { actOnOpeningBatch, openingBatchDetail } from "@/lib/accounting/opening-service";

type Context = { params: Promise<{ id: string; batchId: string }> };
const actionSchema = z.object({ action: z.enum(["VALIDATE", "SUBMIT", "REVIEW", "APPROVE", "REJECT"]), revision: z.number().int().positive(), reason: z.string().max(500).optional() });

export async function GET(_request: Request, { params }: Context) {
  const { id, batchId } = await params;
  if (!await openingActor(id, "accounting:opening:view")) return openingDenied();
  try { return NextResponse.json(await openingBatchDetail(id, batchId), { headers: openingNoStore }); }
  catch (error) { return openingFailure(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  const { id, batchId } = await params;
  if (!openingSameOrigin(request)) return openingBadOrigin();
  try {
    const parsed = actionSchema.safeParse(await openingJson(request));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "إجراء غير صالح." }, { status: 400, headers: openingNoStore });
    const permission = ({ VALIDATE: "accounting:opening:submit", SUBMIT: "accounting:opening:submit", REVIEW: "accounting:opening:review", APPROVE: "accounting:opening:approve", REJECT: "accounting:opening:review" } as const)[parsed.data.action];
    const actor = await openingActor(id, permission);
    if (!actor) return openingDenied();
    return NextResponse.json(await actOnOpeningBatch(id, batchId, actor, parsed.data.action, parsed.data.revision, parsed.data.reason, request), { headers: openingNoStore });
  } catch (error) { return openingFailure(error); }
}
