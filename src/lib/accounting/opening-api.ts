import { NextResponse } from "next/server";
import { authorizeOrganization, getSessionUser } from "@/lib/auth";
import type { Permission } from "@/lib/permissions";
import { MoneyInputError } from "./opening-money";
import { OpeningError } from "./opening-service";
import { accountingSameOrigin } from "./same-origin";

export const openingNoStore = { "Cache-Control": "private, no-store" };

export async function openingActor(organizationId: string, permission: Permission) {
  const user = await getSessionUser();
  if (!user || !await authorizeOrganization(user.id, organizationId, "accounting:chart:view") || !await authorizeOrganization(user.id, organizationId, permission)) return null;
  return { id: user.id, displayName: user.displayName };
}

export function openingDenied() {
  return NextResponse.json({ error: "غير مصرح بالوصول إلى أرصدة أول مدة هذه الشركة." }, { status: 403, headers: openingNoStore });
}

export function openingFailure(error: unknown) {
  if (error instanceof OpeningError || error instanceof MoneyInputError) return NextResponse.json({ error: error.message }, { status: error instanceof OpeningError ? error.status : 400, headers: openingNoStore });
  throw error;
}

export function openingSameOrigin(request: Request) {
  return accountingSameOrigin(request);
}

export function openingBadOrigin() {
  return NextResponse.json({ error: "مصدر الطلب غير مسموح." }, { status: 403, headers: openingNoStore });
}

export async function openingJson(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 64_000) throw new OpeningError("الطلب أكبر من الحد المسموح.", 413);
  const text = await request.text();
  if (text.length > 64_000) throw new OpeningError("الطلب أكبر من الحد المسموح.", 413);
  try { return JSON.parse(text) as unknown; }
  catch { throw new OpeningError("بيانات الطلب غير صالحة."); }
}
