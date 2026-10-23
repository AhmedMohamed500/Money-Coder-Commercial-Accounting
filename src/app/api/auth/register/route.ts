import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/schemas";
import { defaultOwnerRole } from "@/lib/permissions";
import { hashPassword, randomToken, sha256 } from "@/lib/security";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { databaseConfigured, emailConfigured } from "@/lib/config";
import { sendTransactionalEmail } from "@/lib/email";
import { databaseFailureResponse } from "@/lib/api-errors";

export async function POST(request: Request) {
  try { return await registerRequest(request); }
  catch (cause) { const response=databaseFailureResponse(cause); if(response) return response; throw cause; }
}

async function registerRequest(request: Request) {
  if (!checkRateLimit(`register:${clientIp(request)}`, 5, 15 * 60_000).allowed) return NextResponse.json({ error: "محاولات كثيرة. حاول لاحقًا." }, { status: 429 });
  if (!databaseConfigured()) return NextResponse.json({ error: "إنشاء الحسابات معطل حتى تهيئة قاعدة البيانات." }, { status: 503 });
  if (process.env.NODE_ENV === "production" && !emailConfigured()) return NextResponse.json({ error: "إنشاء الحسابات معطل مؤقتًا حتى تهيئة خدمة تأكيد البريد." }, { status: 503 });
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  const input = parsed.data;
  if (await db.user.findUnique({ where: { email: input.email } })) return NextResponse.json({ error: "هذا البريد مستخدم بالفعل." }, { status: 409 });
  const token = randomToken();
  const passwordHash = await hashPassword(input.password);
  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { email: input.email, displayName: input.displayName, passwordHash } });
    const organization = await tx.organization.create({ data: { type: input.organizationType, legalName: input.legalName, tradeName: input.tradeName || null, createdById: created.id, profile: { create: { registrationProgress: 10 } } } });
    await tx.organizationMembership.create({ data: { userId: created.id, organizationId: organization.id, role: defaultOwnerRole(input.organizationType), permissions: [] } });
    await tx.emailVerificationToken.create({ data: { userId: created.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    await tx.auditEvent.create({ data: { actorUserId: created.id, organizationId: organization.id, action: "ACCOUNT_REGISTERED", entityType: "Organization", entityId: organization.id } });
    return created;
  });
  const origin = process.env.APP_URL || new URL(request.url).origin;
  const verificationUrl = `${origin}/api/auth/verify?token=${encodeURIComponent(token)}`;
  if (process.env.NODE_ENV === "production") {
    try {
      await sendTransactionalEmail({ to: user.email, subject: "تأكيد بريدك في Money Coder", text: `أكد بريدك عبر الرابط: ${verificationUrl}`, html: `<p dir="rtl">مرحبًا بك في Money Coder.</p><p><a href="${verificationUrl}">تأكيد البريد الإلكتروني</a></p>` });
    } catch {
      return NextResponse.json({ message: "تم إنشاء الحساب، لكن تعذر تسليم رسالة التأكيد. استخدم إعادة إرسال التأكيد." }, { status: 202 });
    }
  }
  return NextResponse.json({ message: "تم إنشاء الحساب. تحقق من بريدك الإلكتروني.", userId: user.id, ...(process.env.NODE_ENV !== "production" ? { devVerificationUrl: verificationUrl } : {}) }, { status: 201 });
}
