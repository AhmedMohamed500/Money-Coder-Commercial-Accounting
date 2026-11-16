import { NextResponse } from "next/server";
import { createJournalDraft, listJournalEntries } from "@/lib/accounting/journal-service";
import { journalActor, journalBadOrigin, journalDenied, journalFailure, journalJson, journalNoStore, journalSameOrigin } from "@/lib/accounting/journal-api";
import { journalDraftSchema } from "@/lib/accounting/journal-schema";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!await journalActor(id, "accounting:journal:view")) return journalDenied();
  const url = new URL(request.url);
  return NextResponse.json(await listJournalEntries(id, { status: url.searchParams.get("status") ?? undefined, fiscalYearId: url.searchParams.get("fiscalYearId") ?? undefined, search: url.searchParams.get("search") ?? undefined, page: Number(url.searchParams.get("page") ?? 1) || 1 }), { headers: journalNoStore });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!journalSameOrigin(request)) return journalBadOrigin();
  const actor = await journalActor(id, "accounting:journal:create"); if (!actor) return journalDenied();
  try {
    const parsed = journalDraftSchema.safeParse(await journalJson(request));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات القيد غير صالحة." }, { status: 400, headers: journalNoStore });
    const result = await createJournalDraft(id, actor, parsed.data, request);
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201, headers: journalNoStore });
  } catch (error) { return journalFailure(error); }
}
