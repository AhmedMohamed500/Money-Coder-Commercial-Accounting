import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
export default async function VerifiedPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) { const ok = (await searchParams).status === "ok"; return <AuthShell title={ok ? "تم تأكيد البريد" : "تعذر تأكيد البريد"} subtitle={ok ? "أصبح حسابك جاهزًا لتسجيل الدخول." : "قد يكون الرابط غير صالح أو منتهي الصلاحية."}><Link className="btn-primary w-full" href="/auth/login">الانتقال إلى تسجيل الدخول</Link></AuthShell>; }
