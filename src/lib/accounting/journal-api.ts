import { NextResponse } from "next/server";
import { authorizeOrganization, getSessionUser } from "@/lib/auth";
import type { Permission } from "@/lib/permissions";
import { accountingSameOrigin } from "./same-origin";
import { JournalError } from "./journal-service";
import { MoneyInputError } from "./opening-money";
import { Prisma } from "@prisma/client";

export const journalNoStore = { "cache-control": "private, no-store" };

export async function journalActor(organizationId: string, permission: Permission) {
  const user = await getSessionUser();
  if (!user || !await authorizeOrganization(user.id, organizationId, permission)) return null;
  return { id: user.id, displayName: user.displayName };
}

export const journalDenied = () => NextResponse.json({ error: "غير مصرح." }, { status: 403, headers: journalNoStore });
export const journalBadOrigin = () => NextResponse.json({ error: "مصدر الطلب غير مسموح." }, { status: 403, headers: journalNoStore });
export const journalSameOrigin = (request: Request) => accountingSameOrigin(request);

export async function journalJson(request: Request, maximum = 160_000) {
  if (Number(request.headers.get("content-length") ?? 0) > maximum) throw new JournalError("الطلب أكبر من الحد المسموح.", 413);
  const reader = request.body?.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  if (reader) while (true) {
    const chunk = await reader.read(); if (chunk.done) break;
    total += chunk.value.byteLength;
    if (total > maximum) { await reader.cancel(); throw new JournalError("الطلب أكبر من الحد المسموح.", 413); }
    chunks.push(chunk.value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown; }
  catch { throw new JournalError("بيانات الطلب غير صالحة."); }
}

export function journalFailure(error: unknown) {
  if (error instanceof JournalError) return NextResponse.json({ error: error.message }, { status: error.status, headers: journalNoStore });
  if (error instanceof MoneyInputError) return NextResponse.json({ error: error.message }, { status: 400, headers: journalNoStore });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const databaseCode = typeof error.meta?.code === "string" ? error.meta.code : null;
    if (error.code === "P2034" || databaseCode === "40001") return NextResponse.json({ error: "تعارضت العملية مع تحديث محاسبي متزامن. حدّث الصفحة ثم أعد المحاولة." }, { status: 409, headers: journalNoStore });
  }
  throw error;
}
