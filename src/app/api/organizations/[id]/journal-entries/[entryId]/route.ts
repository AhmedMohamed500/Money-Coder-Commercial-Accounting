import { NextResponse } from "next/server";
import { z } from "zod";
import { journalDraftSchema } from "../route";
import { actOnJournalEntry, journalEntryDetail, replaceJournalDraft } from "@/lib/accounting/journal-service";
import { journalActor, journalBadOrigin, journalDenied, journalFailure, journalJson, journalNoStore, journalSameOrigin } from "@/lib/accounting/journal-api";

type Context = { params: Promise<{ id: string; entryId: string }> };
const updateSchema = journalDraftSchema.omit({ idempotencyKey: true }).extend({ revision: z.number().int().positive() }).strict();
const actionSchema = z.object({ action: z.enum(["SUBMIT", "APPROVE", "POST", "REJECT"]), revision: z.number().int().positive(), reason: z.string().trim().max(500).optional() }).strict();

export async function GET(_request: Request, { params }: Context) {
  const { id, entryId } = await params;
  if (!await journalActor(id, "accounting:journal:view")) return journalDenied();
  try { return NextResponse.json(await journalEntryDetail(id, entryId), { headers: journalNoStore }); }
  catch (error) { return journalFailure(error); }
}

export async function PUT(request: Request, { params }: Context) {
  const { id, entryId } = await params;
  if (!journalSameOrigin(request)) return journalBadOrigin();
  const actor = await journalActor(id, "accounting:journal:edit"); if (!actor) return journalDenied();
  try {
    const parsed = updateSchema.safeParse(await journalJson(request));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات القيد غير صالحة." }, { status: 400, headers: journalNoStore });
    const { revision, ...input } = parsed.data;
    return NextResponse.json(await replaceJournalDraft(id, entryId, actor, revision, input, request), { headers: journalNoStore });
  } catch (error) { return journalFailure(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  const { id, entryId } = await params;
  if (!journalSameOrigin(request)) return journalBadOrigin();
  try {
    const parsed = actionSchema.safeParse(await journalJson(request));
    if (!parsed.success) return NextResponse.json({ error: "إجراء القيد غير صالح." }, { status: 400, headers: journalNoStore });
    const permission = parsed.data.action === "SUBMIT" ? "accounting:journal:submit" : parsed.data.action === "APPROVE" || parsed.data.action === "REJECT" ? "accounting:journal:approve" : "accounting:journal:post";
    const actor = await journalActor(id, permission); if (!actor) return journalDenied();
    return NextResponse.json(await actOnJournalEntry(id, entryId, actor, parsed.data, request), { headers: journalNoStore });
  } catch (error) { return journalFailure(error); }
}
