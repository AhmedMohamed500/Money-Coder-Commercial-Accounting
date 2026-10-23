import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export default function ResendVerificationPage() {
  return <AuthShell title="إعادة إرسال التأكيد" subtitle="أدخل البريد المستخدم في التسجيل وسنرسل رابط تأكيد جديدًا إذا كان الحساب ينتظر التفعيل."><AuthForm mode="resend-verification" /></AuthShell>;
}
