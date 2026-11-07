import { NextResponse } from "next/server";
import { chartActor, chartDenied, chartNoStore } from "@/lib/accounting/chart-api";
import { chartHistory } from "@/lib/accounting/chart-service";
import { cairoDayStartUtc, nextCalendarDay } from "@/lib/accounting/cairo-date";
import { z } from "zod";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!await chartActor(id, "accounting:chart:audit:view")) return chartDenied();
  const query = new URL(request.url).searchParams;
  for (const key of ["accountId", "actorUserId"]) {
    const value = query.get(key);
    if (value && !z.uuid().safeParse(value).success) return NextResponse.json({ error: "معرّف البحث غير صالح." }, { status: 400, headers: chartNoStore });
  }
  const from = query.get("from"); const to = query.get("to");
  const fromDate = from ? cairoDayStartUtc(from) : undefined;
  const nextDay = to ? nextCalendarDay(to) : undefined;
  const toDate = nextDay ? cairoDayStartUtc(nextDay) : undefined;
  if ((from && !fromDate) || (to && !toDate) || (fromDate && toDate && fromDate >= toDate)) return NextResponse.json({ error: "نطاق التاريخ غير صالح." }, { status: 400, headers: chartNoStore });
  const accountClass = z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]).safeParse(query.get("accountClass"));
  const approvalStatus = z.enum(["PENDING", "APPROVED", "REJECTED"]).safeParse(query.get("approvalStatus"));
  if (query.has("accountClass") && !accountClass.success || query.has("approvalStatus") && !approvalStatus.success) return NextResponse.json({ error: "مرشح التدقيق غير صالح." }, { status: 400, headers: chartNoStore });
  const events = await chartHistory(id, { accountId: query.get("accountId") || undefined, code: query.get("code") || undefined, action: query.get("action") || undefined, actorUserId: query.get("actorUserId") || undefined, accountClass: accountClass.success ? accountClass.data : undefined, approvalStatus: approvalStatus.success ? approvalStatus.data : undefined, from: fromDate ?? undefined, to: toDate ?? undefined });
  return NextResponse.json(events, { headers: chartNoStore });
}
