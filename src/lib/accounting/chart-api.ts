import { NextResponse } from "next/server";
import { authorizeOrganization, getSessionUser } from "@/lib/auth";
import type { Permission } from "@/lib/permissions";
import { toChartResponseError } from "@/lib/accounting/chart-service";
import { accountingSameOrigin } from "@/lib/accounting/same-origin";

export const chartNoStore = { "Cache-Control": "private, no-store" };

export async function chartActor(organizationId: string, permission: Permission) {
  const user = await getSessionUser();
  if (!user || !await authorizeOrganization(user.id, organizationId, permission)) return null;
  return { id: user.id, displayName: user.displayName };
}

export function chartDenied() {
  return NextResponse.json({ error: "غير مصرح بالوصول إلى دليل حسابات هذه الشركة." }, { status: 403, headers: chartNoStore });
}

export function chartFailure(error: unknown) {
  const known = toChartResponseError(error);
  if (!known) throw error;
  return NextResponse.json({ error: known.message }, { status: known.status, headers: chartNoStore });
}

export function chartSameOrigin(request: Request) {
  return accountingSameOrigin(request);
}

export function chartBadOrigin() {
  return NextResponse.json({ error: "مصدر الطلب غير مسموح." }, { status: 403, headers: chartNoStore });
}
