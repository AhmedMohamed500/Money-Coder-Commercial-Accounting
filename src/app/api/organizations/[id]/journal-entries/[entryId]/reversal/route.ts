import { NextResponse } from "next/server";
import { z } from "zod";
import { createReversalDraft } from "@/lib/accounting/journal-service";
import { journalActor, journalBadOrigin, journalDenied, journalFailure, journalJson, journalNoStore, journalSameOrigin } from "@/lib/accounting/journal-api";

const schema = z.object({ postingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), idempotencyKey: z.string().min(16).max(120).regex(/^[A-Za-z0-9:_-]+$/), reason: z.string().trim().min(10).max(500) }).strict();
export async function POST(request: Request, { params }: { params: Promise<{ id: string; entryId: string }> }) {
  const { id, entryId } = await params;
  if (!journalSameOrigin(request)) return journalBadOrigin();
  const actor = await journalActor(id, "accounting:journal:reverse"); if (!actor) return journalDenied();
  try { const parsed = schema.safeParse(await journalJson(request)); if (!parsed.success) return NextResponse.json({ error: "بيانات العكس غير صالحة." }, { status: 400, headers: journalNoStore }); const result = await createReversalDraft(id, entryId, actor, parsed.data, request); return NextResponse.json(result, { status: result.duplicate ? 200 : 201, headers: journalNoStore }); }
  catch (error) { return journalFailure(error); }
}
