import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
export default function ForgotPage(){ return <AuthShell title="استعادة كلمة المرور" subtitle="سنرسل رابطًا مؤقتًا إن كان البريد مسجلًا. لا نكشف وجود الحساب من عدمه."><AuthForm mode="forgot" /></AuthShell>; }
