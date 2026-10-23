import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
export default function LoginPage(){ return <AuthShell title="مرحبًا بعودتك" subtitle="ادخل إلى الكيانات المصرح لك بها فقط."><AuthForm mode="login" /></AuthShell>; }
