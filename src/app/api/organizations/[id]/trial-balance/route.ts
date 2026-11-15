import { NextResponse } from "next/server";
import { z } from "zod";
import { trialBalance } from "@/lib/accounting/ledger-service";
import { journalActor, journalDenied, journalFailure, journalNoStore } from "@/lib/accounting/journal-api";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!await journalActor(id, "accounting:trial-balance:view")) return journalDenied();
  const parsed = z.object({ fiscalYearId: z.uuid(), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), view: z.enum(["DETAILED", "SUMMARY"]).optional() }).safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "حدد السنة والنطاق الزمني." }, { status: 400, headers: journalNoStore });
  try { return NextResponse.json(await trialBalance(id, parsed.data), { headers: journalNoStore }); }
  catch (error) { return journalFailure(error); }
}
