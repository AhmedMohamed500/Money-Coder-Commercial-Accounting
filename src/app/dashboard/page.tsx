import Link from "next/link";
import { Building2, Landmark, Users, ArrowLeft, Clock3 } from "lucide-react";
import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireUser();
  return <>
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-bold text-teal-700">أهلًا، {user.displayName}</p><h1 className="mt-1 text-3xl font-black">مساحة العمل</h1><p className="muted mt-2">تعرض هذه الصفحة بيانات حسابك الحقيقية فقط.</p></div><span className="badge">{user.memberships.length} عضوية نشطة</span></div>
    {user.memberships.length === 0 ? <div className="surface mt-8 rounded-3xl p-10 text-center"><Clock3 className="mx-auto h-12 w-12 text-slate-400"/><h2 className="mt-4 text-xl font-black">لا توجد عضويات نشطة</h2><p className="muted mt-2">اطلب من مدير الكيان إرسال دعوة جديدة.</p></div> : <div className="mt-8 grid gap-5 md:grid-cols-2">{user.memberships.map(m => <article key={m.id} className="surface rounded-3xl p-7"><div className="flex items-start justify-between"><span className={`rounded-2xl p-3 ${m.organization.type === "ACCOUNTING_OFFICE" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{m.organization.type === "ACCOUNTING_OFFICE" ? <Landmark/> : <Building2/>}</span><span className="badge">{m.organization.onboardingStatus === "COMPLETE" ? "مكتمل" : "مسودة"}</span></div><h2 className="mt-5 text-xl font-black">{m.organization.tradeName || m.organization.legalName}</h2><p className="muted mt-2 text-sm">{m.role.replaceAll("_", " ")}</p><Link href={m.organization.type === "ACCOUNTING_OFFICE" ? `/office/${m.organizationId}` : `/company/${m.organizationId}`} className="mt-6 flex items-center gap-2 font-black text-blue-700">فتح لوحة الكيان <ArrowLeft className="h-4 w-4"/></Link></article>)}</div>}
    <div className="mt-8 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-900"><Users className="mt-0.5 h-5 w-5 shrink-0"/><p>الحساب الواحد يدعم عضويات متعددة. إضافة عضو جديد تتم بالدعوة؛ لا تشارك بيانات تسجيل الدخول.</p></div>
  </>;
}
