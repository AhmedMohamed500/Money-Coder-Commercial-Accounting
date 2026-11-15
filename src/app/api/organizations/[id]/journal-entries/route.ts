import { NextResponse } from "next/server";
import { z } from "zod";
import { createJournalDraft, listJournalEntries } from "@/lib/accounting/journal-service";
import { journalActor, journalBadOrigin, journalDenied, journalFailure, journalJson, journalNoStore, journalSameOrigin } from "@/lib/accounting/journal-api";

const lineSchema = z.object({ accountId: z.uuid(), debit: z.string().max(30), credit: z.string().max(30), description: z.string().trim().max(500).optional(), sourceReference: z.string().trim().max(160).optional() }).strict();
export const journalDraftSchema = z.object({ fiscalYearId: z.uuid(), transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), postingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), reference: z.string().trim().min(2).max(80), description: z.string().trim().min(3).max(500), currency: z.string().trim().length(3), idempotencyKey: z.string().min(16).max(120).regex(/^[A-Za-z0-9:_-]+$/), sourceType: z.enum(["MANUAL", "BANK_STATEMENT", "DOCUMENT"]).optional(), sourceReference: z.string().trim().max(160).optional(), sourceRevision: z.string().trim().max(80).optional(), evidenceTimestamp: z.string().datetime().optional(), documentId: z.uuid().optional(), bankTransactionId: z.uuid().optional(), statementId: z.uuid().optional(), lines: z.array(lineSchema).min(2).max(200) }).strict();

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
