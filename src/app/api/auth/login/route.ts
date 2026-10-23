import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/schemas";
import { verifyPassword } from "@/lib/security";
import { createSession } from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { databaseConfigured } from "@/lib/config";

export async function POST(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "خدمة تسجيل الدخول غير مهيأة على هذه البيئة." }, { status: 503 });
  if (!checkRateLimit(`login:${clientIp(request)}`, 10, 15 * 60_000).allowed) return NextResponse.json({ error: "محاولات كثيرة. حاول لاحقًا." }, { status: 429 });
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات الدخول غير صالحة." }, { status: 400 });
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const invalid = !user || user.deletedAt || (user.lockedUntil && user.lockedUntil > new Date()) || !(await verifyPassword(parsed.data.password, user.passwordHash));
  if (invalid) {
    if (user && !user.deletedAt) { const attempts = user.failedLoginAttempts + 1; await db.user.update({ where: { id: user.id }, data: { failedLoginAttempts: attempts >= 5 ? 0 : attempts, lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60_000) : user.lockedUntil } }); }
    return NextResponse.json({ error: "البريد أو كلمة المرور غير صحيحة." }, { status: 401 });
  }
  if (!user.emailVerifiedAt) return NextResponse.json({ error: "أكد بريدك الإلكتروني قبل تسجيل الدخول." }, { status: 403 });
  await db.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
