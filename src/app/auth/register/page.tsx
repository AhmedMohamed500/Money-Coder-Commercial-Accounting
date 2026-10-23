import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
export default function RegisterPage(){ return <AuthShell title="أنشئ كيانك الأول" subtitle="يمكنك إضافة عضويات وكيانات أخرى لاحقًا دون إنشاء حساب مستخدم جديد."><AuthForm mode="register" /></AuthShell>; }
