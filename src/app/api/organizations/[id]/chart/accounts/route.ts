import { NextResponse } from "next/server";
import { z } from "zod";
import { chartActor, chartBadOrigin, chartDenied, chartFailure, chartNoStore, chartSameOrigin } from "@/lib/accounting/chart-api";
import { createChartAccount, suggestAccountCode } from "@/lib/accounting/chart-service";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ parentId: z.uuid(), code: z.string().regex(/^\d{4}(\d{2})*$/).max(24).optional(), nameAr: z.string().trim().min(2).max(180), nameEn: z.string().trim().max(180).nullable().optional(), description: z.string().trim().max(1000).nullable().optional(), isPostable: z.boolean().default(true) }).strict();

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  if (!await chartActor(id, "accounting:chart:view")) return chartDenied();
  const parentId = new URL(request.url).searchParams.get("parentId");
  if (!parentId || !z.uuid().safeParse(parentId).success) return NextResponse.json({ error: "الحساب الأب غير صالح." }, { status: 400, headers: chartNoStore });
  try { return NextResponse.json(await suggestAccountCode(id, parentId), { headers: chartNoStore }); }
  catch (error) { return chartFailure(error); }
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const actor = await chartActor(id, "accounting:chart:create");
  if (!actor) return chartDenied();
  if (!chartSameOrigin(request)) return chartBadOrigin();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات الحساب غير صالحة." }, { status: 400, headers: chartNoStore });
  try { return NextResponse.json(await createChartAccount(id, actor, parsed.data, request), { status: 201, headers: chartNoStore }); }
  catch (error) { return chartFailure(error); }
}
