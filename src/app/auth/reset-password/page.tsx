import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) { const { token } = await searchParams; return <AuthShell title="كلمة مرور جديدة" subtitle="الرابط صالح للاستخدام مرة واحدة فقط.">{token ? <AuthForm mode="reset" token={token}/> : <p className="rounded-xl bg-red-50 p-4 text-red-700">رابط الاستعادة غير مكتمل.</p>}</AuthShell>; }
