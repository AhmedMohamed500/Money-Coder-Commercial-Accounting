import { NextResponse } from "next/server";
import { z } from "zod";
import { createCorrectionDraft } from "@/lib/accounting/journal-service";
import { journalActor, journalBadOrigin, journalDenied, journalFailure, journalJson, journalNoStore, journalSameOrigin } from "@/lib/accounting/journal-api";

const schema = z.object({ idempotencyKey: z.string().min(16).max(120).regex(/^[A-Za-z0-9:_-]+$/) }).strict();
export async function POST(request: Request, { params }: { params: Promise<{ id: string; entryId: string }> }) {
  const { id, entryId } = await params;
  if (!journalSameOrigin(request)) return journalBadOrigin();
  const actor = await journalActor(id, "accounting:journal:edit"); if (!actor) return journalDenied();
  try { const parsed = schema.safeParse(await journalJson(request)); if (!parsed.success) return NextResponse.json({ error: "طلب التصحيح غير صالح." }, { status: 400, headers: journalNoStore }); const result = await createCorrectionDraft(id, entryId, actor, parsed.data.idempotencyKey, request); return NextResponse.json(result, { status: result.duplicate ? 200 : 201, headers: journalNoStore }); }
  catch (error) { return journalFailure(error); }
}
