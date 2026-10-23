import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { databaseConfigured, emailConfigured } from "@/lib/config";
import { emailSchema } from "@/lib/schemas";
import { randomToken, sha256 } from "@/lib/security";
import { sendTransactionalEmail } from "@/lib/email";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "خدمة التأكيد غير مهيأة." }, { status: 503 });
  if (process.env.NODE_ENV === "production" && !emailConfigured()) return NextResponse.json({ error: "خدمة التأكيد معطلة حتى تهيئة البريد الإنتاجي." }, { status: 503 });
  if (!checkRateLimit(`resend:${clientIp(request)}`, 5, 15 * 60_000).allowed) return NextResponse.json({ error: "محاولات كثيرة. حاول لاحقًا." }, { status: 429 });
  const parsed = emailSchema.safeParse((await request.json().catch(() => null))?.email);
  if (!parsed.success) return NextResponse.json({ error: "بريد غير صالح." }, { status: 400 });

  const user = await db.user.findUnique({ where: { email: parsed.data } });
  let devVerificationUrl: string | undefined;
  if (user && !user.deletedAt && !user.emailVerifiedAt) {
    const token = randomToken();
    const row = await db.$transaction(async (tx) => {
      await tx.emailVerificationToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
      return tx.emailVerificationToken.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 24 * 60 * 60_000) } });
    });
    const verificationUrl = `${process.env.APP_URL || new URL(request.url).origin}/api/auth/verify?token=${encodeURIComponent(token)}`;
    if (process.env.NODE_ENV !== "production") devVerificationUrl = verificationUrl;
    else try {
      await sendTransactionalEmail({ to: user.email, subject: "إعادة إرسال تأكيد بريد Money Coder", text: `أكد بريدك عبر الرابط: ${verificationUrl}`, html: `<p dir="rtl"><a href="${verificationUrl}">تأكيد البريد الإلكتروني</a></p>` });
    } catch {
      await db.emailVerificationToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }).catch(() => undefined);
      return NextResponse.json({ error: "تعذر إرسال رسالة التأكيد. حاول لاحقًا." }, { status: 503 });
    }
  }
  return NextResponse.json({ message: "إن كان الحساب موجودًا وغير مؤكد فسيصل رابط جديد.", ...(devVerificationUrl ? { devVerificationUrl } : {}) });
}
