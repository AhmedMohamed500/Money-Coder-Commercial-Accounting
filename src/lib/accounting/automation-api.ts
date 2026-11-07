import { NextResponse } from "next/server";
import { authorizeOrganization, getSessionUser } from "@/lib/auth";
import { accountingSameOrigin } from "./same-origin";
import { AutomationError } from "./bank-automation-service";
import { BankContractError } from "./bank-contract";
import type { Permission } from "@/lib/permissions";

export const privateNoStore = { "cache-control": "private, no-store" };
export async function automationActor(organizationId: string, permission: Permission) {
  const user = await getSessionUser();
  if (!user || !await authorizeOrganization(user.id, organizationId, permission)) return null;
  return { id: user.id, displayName: user.displayName };
}
export const automationDenied = () => NextResponse.json({ error: "غير مصرح." }, { status: 403, headers: privateNoStore });
export const automationBadOrigin = () => NextResponse.json({ error: "مصدر الطلب غير مسموح." }, { status: 403, headers: privateNoStore });
export function automationSameOrigin(request: Request) { return accountingSameOrigin(request); }
export async function automationJson(request: Request, maximum = 64_000) {
  if (Number(request.headers.get("content-length") ?? 0) > maximum) throw new AutomationError("الطلب أكبر من الحد المسموح.", 413);
  const reader = request.body?.getReader();
  const parts: Uint8Array[] = []; let total = 0;
  if (reader) while (true) {
    const chunk = await reader.read(); if (chunk.done) break;
    total += chunk.value.byteLength;
    if (total > maximum) { await reader.cancel(); throw new AutomationError("الطلب أكبر من الحد المسموح.", 413); }
    parts.push(chunk.value);
  }
  const body = Buffer.concat(parts).toString("utf8");
  try { return JSON.parse(body) as unknown; } catch { throw new AutomationError("بيانات الطلب غير صالحة."); }
}
export function automationFailure(error: unknown) {
  if (error instanceof AutomationError || error instanceof BankContractError) return NextResponse.json({ error: error.message }, { status: error.status, headers: privateNoStore });
  throw error;
}
