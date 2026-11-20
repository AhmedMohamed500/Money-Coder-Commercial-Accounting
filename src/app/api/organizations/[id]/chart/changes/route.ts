import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { chartActor, chartBadOrigin, chartDenied, chartFailure, chartNoStore, chartSameOrigin } from "@/lib/accounting/chart-api";
import { requestChartChange } from "@/lib/accounting/chart-service";

const schema = z.object({
  action: z.enum(["UPDATE", "DEACTIVATE", "DELETE"]), accountId: z.uuid(), reason: z.string().trim().min(10).max(500),
  proposed: z.object({ code: z.string().regex(/^\d{4}(\d{2})*$/).max(24).optional(), parentId: z.uuid().optional(), accountClass: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]).optional(), reportGroup: z.enum(["ASSET_TOTAL", "LIABILITY_TOTAL", "REVENUE_TOTAL", "EXPENSE_TOTAL", "CURRENT_ASSET", "NONCURRENT_ASSET", "CURRENT_LIABILITY", "NONCURRENT_LIABILITY", "EQUITY", "TRADING_REVENUE", "CONTRA_REVENUE", "OTHER_INCOME", "COST_OF_SALES", "SELLING_EXPENSE", "ADMIN_EXPENSE", "STAFF_EXPENSE", "DEPRECIATION_EXPENSE", "FINANCE_COST", "OTHER_EXPENSE", "INCOME_TAX_EXPENSE"]).optional(), normalBalance: z.enum(["DEBIT", "CREDIT"]).optional(), isPostable: z.boolean().optional(), isActive: z.boolean().optional() }).strict().optional(),
}).strict();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!await chartActor(id, "accounting:chart:audit:view")) return chartDenied();
  const changes = await db.chartChangeRequest.findMany({ where: { organizationId: id }, orderBy: { createdAt: "desc" }, take: 100, include: { account: { select: { code: true, nameAr: true } } } });
  return NextResponse.json(changes, { headers: chartNoStore });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!chartSameOrigin(request)) return chartBadOrigin();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "طلب التغيير غير صالح." }, { status: 400, headers: chartNoStore });
  const permission = parsed.data.action === "DELETE" ? "accounting:chart:delete" : parsed.data.action === "DEACTIVATE" ? "accounting:chart:deactivate" : "accounting:chart:edit";
  const actor = await chartActor(id, permission);
  if (!actor) return chartDenied();
  try { const result = await requestChartChange(id, actor, parsed.data, request); return "denied" in result ? NextResponse.json({ error: result.reason }, { status: 409, headers: chartNoStore }) : NextResponse.json(result, { status: 201, headers: chartNoStore }); }
  catch (error) { return chartFailure(error); }
}
