import { NextResponse } from "next/server";
import { z } from "zod";
import { chartActor, chartBadOrigin, chartDenied, chartFailure, chartNoStore, chartSameOrigin } from "@/lib/accounting/chart-api";
import { initializeCommercialChart, listChart } from "@/lib/accounting/chart-service";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!await chartActor(id, "accounting:chart:view")) return chartDenied();
  return NextResponse.json(await listChart(id), { headers: chartNoStore });
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const actor = await chartActor(id, "accounting:chart:template:initialize");
  if (!actor) return chartDenied();
  if (!chartSameOrigin(request)) return chartBadOrigin();
  const body = z.object({ activity: z.enum(["COMMERCIAL", "INDUSTRIAL", "SERVICE"]) }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "اختر نشاطًا صالحًا." }, { status: 400, headers: chartNoStore });
  if (body.data.activity !== "COMMERCIAL") return NextResponse.json({ error: "قالب هذا النشاط لم يكتمل بعد؛ التهيئة متاحة للنشاط التجاري فقط." }, { status: 400, headers: chartNoStore });
  try {
    const result = await initializeCommercialChart(id, actor, request);
    return NextResponse.json({ ...result, message: result.created ? "تم إنشاء دليل الحسابات التجاري بنجاح" : "دليل الحسابات التجاري موجود بالفعل." }, { status: result.created ? 201 : 200, headers: chartNoStore });
  } catch (error) { return chartFailure(error); }
}
