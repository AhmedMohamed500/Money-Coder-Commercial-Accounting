import { NextResponse } from "next/server";
import { z } from "zod";
import { chartActor, chartBadOrigin, chartDenied, chartFailure, chartNoStore, chartSameOrigin } from "@/lib/accounting/chart-api";
import { editChartAccount } from "@/lib/accounting/chart-service";

const schema = z.object({ nameAr: z.string().trim().min(2).max(180).optional(), nameEn: z.string().trim().max(180).nullable().optional(), description: z.string().trim().max(1000).nullable().optional(), reason: z.string().trim().min(5).max(500) }).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; accountId: string }> }) {
  const { id, accountId } = await params;
  const actor = await chartActor(id, "accounting:chart:edit");
  if (!actor) return chartDenied();
  if (!chartSameOrigin(request)) return chartBadOrigin();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات التعديل غير صالحة." }, { status: 400, headers: chartNoStore });
  try { return NextResponse.json(await editChartAccount(id, accountId, actor, parsed.data, request), { headers: chartNoStore }); }
  catch (error) { return chartFailure(error); }
}
