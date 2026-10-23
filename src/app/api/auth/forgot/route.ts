import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailSchema } from "@/lib/schemas";
import { randomToken, sha256 } from "@/lib/security";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { databaseConfigured, emailConfigured } from "@/lib/config";
import { sendTransactionalEmail } from "@/lib/email";
import { databaseFailureResponse } from "@/lib/api-errors";
export async function POST(request: Request) {
  try { return await forgotRequest(request); }
  catch (cause) { const response=databaseFailureResponse(cause); if(response) return response; throw cause; }
}
async function forgotRequest(request: Request) {
  if(!databaseConfigured()) return NextResponse.json({error:"خدمة الاستعادة غير مهيأة على هذه البيئة."},{status:503});
  if(process.env.NODE_ENV==="production"&&!emailConfigured()) return NextResponse.json({error:"خدمة الاستعادة معطلة حتى تهيئة البريد الإنتاجي."},{status:503});
  if (!checkRateLimit(`forgot:${clientIp(request)}`, 5, 15*60_000).allowed) return NextResponse.json({ error: "محاولات كثيرة." }, { status: 429 });
  const email = emailSchema.safeParse((await request.json().catch(()=>null))?.email);
  if (!email.success) return NextResponse.json({ error: "بريد غير صالح." }, { status: 400 });
  const user = await db.user.findUnique({ where: { email: email.data } }); let devResetUrl: string | undefined;
  if (user && !user.deletedAt) {
    const token = randomToken();
    const row=await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now()+30*60_000) } });
    const resetUrl=`${process.env.APP_URL || new URL(request.url).origin}/auth/reset-password?token=${encodeURIComponent(token)}`;
    if(process.env.NODE_ENV!=="production") devResetUrl=resetUrl;
    else try { await sendTransactionalEmail({to:user.email,subject:"استعادة كلمة مرور Money Coder",text:`استخدم رابط الاستعادة خلال 30 دقيقة: ${resetUrl}`,html:`<p dir="rtl">استخدم الرابط التالي خلال 30 دقيقة:</p><p><a href="${resetUrl}">استعادة كلمة المرور</a></p>`}); }
    catch { await db.passwordResetToken.delete({where:{id:row.id}}).catch(()=>undefined); }
  }
  return NextResponse.json({ message: "إن كان البريد مسجلًا فسيصل رابط الاستعادة.", ...(devResetUrl ? { devResetUrl } : {}) });
}
