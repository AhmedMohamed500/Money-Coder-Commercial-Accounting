import { NextResponse } from "next/server";
import { openingActor, openingDenied, openingFailure, openingNoStore } from "@/lib/accounting/opening-api";
import { openingAudit } from "@/lib/accounting/opening-service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; batchId: string }> }) {
  const { id, batchId } = await params;
  if (!await openingActor(id, "accounting:opening:audit:view")) return openingDenied();
  try { return NextResponse.json(await openingAudit(id, batchId), { headers: openingNoStore }); }
  catch (error) { return openingFailure(error); }
}
