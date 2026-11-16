import { NextResponse } from "next/server";
import { accountingPeriodsOverview } from "@/lib/accounting/journal-service";
import { journalActor, journalDenied, journalFailure, journalNoStore } from "@/lib/accounting/journal-api";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!await journalActor(id, "accounting:ledger:view")) return journalDenied();
  try {
    const fiscalYearId = new URL(request.url).searchParams.get("fiscalYearId") ?? undefined;
    return NextResponse.json(await accountingPeriodsOverview(id, fiscalYearId), { headers: journalNoStore });
  } catch (error) { return journalFailure(error); }
}
