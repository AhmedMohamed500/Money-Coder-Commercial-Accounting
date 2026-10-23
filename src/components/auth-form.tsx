"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mode = "login" | "register" | "forgot" | "reset" | "resend-verification";

export function AuthForm({ mode, token }: { mode: Mode; token?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    if (token) body.token = token;
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر إكمال الطلب");
      if (mode === "login") { router.push("/dashboard"); router.refresh(); return; }
      if (mode === "reset") { setNotice("تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن."); return; }
      if (result.devVerificationUrl || result.devResetUrl) {
        setNotice("وضع الاختبار المحلي: تم إنشاء الرابط بأمان.");
        window.location.href = result.devVerificationUrl || result.devResetUrl;
      } else setNotice(result.message || "تم استلام الطلب.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "حدث خطأ غير متوقع"); }
    finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="grid gap-5">
    {mode === "register" && <>
      <label className="label">الاسم الكامل<input className="input" name="displayName" required minLength={2}/></label>
      <label className="label">نوع الحساب<select className="input" name="organizationType" defaultValue="COMMERCIAL_COMPANY"><option value="COMMERCIAL_COMPANY">شركة تجارية</option><option value="ACCOUNTING_OFFICE">مكتب محاسبة</option></select></label>
      <label className="label">الاسم القانوني للكيان<input className="input" name="legalName" required minLength={2}/></label>
      <label className="label">الاسم التجاري (اختياري)<input className="input" name="tradeName" /></label>
    </>}
    {mode !== "reset" && <label className="label">البريد الإلكتروني<input className="input" name="email" type="email" autoComplete="email" required /></label>}
    {(mode === "login" || mode === "register" || mode === "reset") && <label className="label">{mode === "reset" ? "كلمة المرور الجديدة" : "كلمة المرور"}<input className="input" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "login" ? 1 : 10}/><span className="text-xs font-normal text-slate-500">{mode !== "login" && "10 أحرف على الأقل، تتضمن حرفًا كبيرًا وصغيرًا ورقمًا."}</span></label>}
    {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700" role="alert">{error}</p>}
    {notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700" role="status">{notice}</p>}
    <button className="btn-primary" disabled={busy}>{busy ? "جارٍ التنفيذ…" : mode === "login" ? "تسجيل الدخول" : mode === "register" ? "إنشاء الحساب" : mode === "forgot" ? "إرسال رابط الاستعادة" : mode === "resend-verification" ? "إرسال رابط تأكيد جديد" : "تحديث كلمة المرور"}</button>
    {mode === "login" && <div className="flex justify-between text-sm"><Link className="text-blue-700" href="/auth/forgot-password">نسيت كلمة المرور؟</Link><Link className="font-bold" href="/auth/register">حساب جديد</Link></div>}
    {mode === "register" && <Link className="text-center text-sm font-bold text-teal-700" href="/auth/resend-verification">لديك حساب ولم يصلك رابط التأكيد؟</Link>}
    {mode !== "login" && <Link className="text-center text-sm font-bold text-blue-700" href="/auth/login">العودة إلى تسجيل الدخول</Link>}
  </form>;
}
