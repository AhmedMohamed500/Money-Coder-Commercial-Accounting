import { NextResponse } from "next/server";
import { z } from "zod";
import { generalLedger } from "@/lib/accounting/ledger-service";
import { journalActor, journalDenied, journalFailure, journalNoStore } from "@/lib/accounting/journal-api";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!await journalActor(id, "accounting:ledger:view")) return journalDenied();
  const query = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = z.object({ accountId: z.uuid(), fiscalYearId: z.uuid(), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(query);
  if (!parsed.success) return NextResponse.json({ error: "حدد الحساب والسنة والنطاق الزمني." }, { status: 400, headers: journalNoStore });
  try { return NextResponse.json(await generalLedger(id, parsed.data), { headers: journalNoStore }); }
  catch (error) { return journalFailure(error); }
}
