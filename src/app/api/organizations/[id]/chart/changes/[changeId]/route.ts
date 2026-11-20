import { NextResponse } from "next/server";
import { z } from "zod";
import { chartActor, chartBadOrigin, chartDenied, chartFailure, chartNoStore, chartSameOrigin } from "@/lib/accounting/chart-api";
import { decideChartChange } from "@/lib/accounting/chart-service";

const schema = z.object({ decision: z.enum(["APPROVE", "REJECT"]), reason: z.string().trim().min(5).max(500) }).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; changeId: string }> }) {
  const { id, changeId } = await params;
  const actor = await chartActor(id, "accounting:chart:approve");
  if (!actor) return chartDenied();
  if (!chartSameOrigin(request)) return chartBadOrigin();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "قرار غير صالح." }, { status: 400, headers: chartNoStore });
  try { return NextResponse.json(await decideChartChange(id, changeId, actor, parsed.data.decision, parsed.data.reason, request), { headers: chartNoStore }); }
  catch (error) { return chartFailure(error); }
}
