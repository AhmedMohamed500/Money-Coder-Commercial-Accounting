import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Building2, CalendarDays, CheckCircle2, Landmark, Settings2, ShieldCheck, Users } from "lucide-react";
import { CompanyShell } from "@/components/accounting/company-shell";
import { loadCompanyOperations } from "@/lib/accounting/company-operations";
import { requireUser } from "@/lib/auth";

const stages = ["دليل الحسابات", "أرصدة أول المدة", "القيود اليومية", "دفتر الأستاذ العام", "ميزان المراجعة", "القوائم المالية", "الإقفال المحاسبي"];
const activityNames = { COMMERCIAL: "تجاري", INDUSTRIAL: "صناعي", SERVICE: "خدمي" } as const;

function Metric({ label, value, note, icon }: { label: string; value: string; note: string; icon: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-sm font-bold text-slate-500">{icon}{label}</div><p className="mt-4 text-2xl font-black text-[#102B4C]">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div>;
}

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const data = await loadCompanyOperations(user.id, id);
  if (!data) notFound();
  const { company, settings, fiscalYear, installation } = data;
  const name = company.tradeName || company.legalName;
  const activity = settings?.businessActivity ? activityNames[settings.businessActivity] : "لم يُحدد محاسبيًا";
  const chartHref = `/company/${id}/accounting/chart-of-accounts`;
  const settingsHref = `/company/${id}/settings`;
  const canSetUpChart = data.canChart && data.canInitializeChart && !installation && (!settings?.businessActivity || settings.businessActivity === "COMMERCIAL");

  return <CompanyShell organizationId={id} companyName={name} userName={user.displayName} delegated={data.delegated} canChart={data.canChart} canAudit={data.canAudit} canManageTeam={data.canManageTeam}>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold text-teal-700">الشركة / الرئيسية</p><h1 className="mt-2 text-3xl font-black tracking-tight">لوحة تشغيل الشركة</h1><p className="mt-2 text-slate-600">{name} · {data.delegated ? "وصول عبر تفويض مكتب محاسبة" : "مساحة عمل الشركة"}</p></div><span className={`rounded-full px-4 py-2 text-xs font-black ${company.onboardingStatus === "COMPLETE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{company.onboardingStatus === "COMPLETE" ? "ملف الشركة مكتمل" : "ملف الشركة يحتاج استكمالًا"}</span></div>

    <section aria-labelledby="company-status-title" className="mt-8"><div className="mb-4 flex items-center gap-2"><Building2 size={21} className="text-teal-700"/><h2 id="company-status-title" className="text-xl font-black">حالة الشركة</h2></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={<Landmark size={17}/>} label="النشاط المحاسبي" value={activity} note="تصنيف القالب مستقل عن وصف النشاط في الملف"/>
      <Metric icon={<CalendarDays size={17}/>} label="السنة المالية" value={fiscalYear?.name || "غير مهيأة"} note={fiscalYear ? fiscalYear.isClosed ? "سنة مقفلة" : "سنة مسجلة" : "أكمل الإعداد المحاسبي في إعدادات الشركة"}/>
      <Metric icon={<Landmark size={17}/>} label="حسابات بنكية مسجلة" value={String(data.bankCount)} note="بيانات حسابات فقط، دون اتصال بنكي أو أرصدة حية"/>
      <Metric icon={<Users size={17}/>} label="أعضاء الفريق" value={data.teamCount === null ? "حسب الصلاحية" : String(data.teamCount)} note={data.teamCount === null ? "يتطلب صلاحية عرض الفريق" : "عضويات نشطة في الشركة"}/>
    </div></section>

    <section aria-labelledby="readiness-title" className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><BookOpen size={21} className="text-teal-700"/><h2 id="readiness-title" className="text-xl font-black">جاهزية النظام المحاسبي</h2></div>{data.canChart ? installation ? <div className="mt-5"><p className="inline-flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 size={18}/> دليل الحسابات مهيأ</p><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">النشاط والقالب</dt><dd className="mt-1 font-bold">{activityNames[installation.activity]}</dd></div><div className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">إصدار القالب</dt><dd className="mt-1 font-mono font-bold" dir="ltr">{installation.templateVersion}</dd></div><div className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">الحسابات الموجودة حاليًا</dt><dd className="mt-1 font-bold">{data.accountCount}</dd></div><div className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">سياسة الجرد</dt><dd className="mt-1 font-bold">{settings?.inventoryMethod === "PERPETUAL" ? "مستمر" : "دوري"}</dd></div></dl><p className="mt-4 text-xs text-slate-500">عدد الحسابات الحالي من قاعدة بيانات هذه الشركة؛ لا يمثل رصيدًا ماليًا. أرصدة أول المدة هي المرحلة التالية.</p></div> : <div className="mt-5"><p className="font-bold">لم يُنشأ دليل حسابات لهذه الشركة بعد.</p><p className="mt-2 text-sm text-slate-600">القالب التجاري جاهز محليًا. الصناعي والخدمي يحتاجان قوالب مستقلة.</p>{canSetUpChart ? <Link className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#064B50] px-5 py-3 text-sm font-bold text-white hover:bg-[#0A6970]" href={chartHref}>اختيار النشاط وتهيئة الدليل <ArrowLeft size={17}/></Link> : settings?.businessActivity === "INDUSTRIAL" || settings?.businessActivity === "SERVICE" ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">قالب النشاط المحدد قيد التطوير، ولا يمكن استخدام القالب التجاري بدلًا منه.</p> : <p className="mt-4 text-sm text-slate-500">التهيئة تتطلب صلاحية محاسبية مستقلة.</p>}</div> : <p className="mt-5 text-sm text-slate-600">تفاصيل دليل الحسابات تتطلب صلاحية عرض خاصة بهذه الشركة.</p>}</div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">إجراءات سريعة</h2><div className="mt-4 grid gap-2">{data.canChart && <Link href={chartHref} className="flex min-h-12 items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-bold text-teal-900 hover:bg-teal-100">{installation ? "فتح دليل الحسابات" : "عرض إعداد دليل الحسابات"}<ArrowLeft size={17}/></Link>}<Link href={settingsHref} className="flex min-h-12 items-center justify-between rounded-xl border border-slate-200 px-4 text-sm font-bold hover:bg-slate-50"><span className="flex items-center gap-2"><Settings2 size={17}/> إعدادات الشركة</span><ArrowLeft size={17}/></Link><Link href={`${settingsHref}?step=4`} className="flex min-h-12 items-center justify-between rounded-xl border border-slate-200 px-4 text-sm font-bold hover:bg-slate-50">الحسابات البنكية المسجلة<ArrowLeft size={17}/></Link>{data.canManageTeam && data.canChart && <Link href={`${chartHref}#team-access`} className="flex min-h-12 items-center justify-between rounded-xl border border-slate-200 px-4 text-sm font-bold hover:bg-slate-50">الفريق وصلاحيات الدليل<ArrowLeft size={17}/></Link>}</div></div>
    </section>

    <section aria-labelledby="stages-title" className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><ShieldCheck size={21} className="text-teal-700"/><h2 id="stages-title" className="text-xl font-black">مراحل النظام المحاسبي</h2></div><p className="mt-2 text-sm text-slate-600">حالة التطوير، وليست مؤشرات أداء مالي للشركة.</p><ol className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stages.map((stage, index) => <li key={stage} className={`rounded-xl border p-4 ${index === 0 ? "border-teal-200 bg-teal-50" : "border-slate-200 bg-slate-50"}`}><span className="text-xs font-bold text-slate-500">{String(index + 1).padStart(2, "0")}</span><p className="mt-2 font-bold">{stage}</p><span className={`mt-2 inline-block text-xs ${index === 0 ? "font-bold text-teal-800" : "text-slate-500"}`}>{index === 0 ? installation ? "مهيأ لهذه الشركة" : "الوحدة متاحة للتهيئة عند وجود الصلاحية" : "مرحلة قادمة - غير متاحة"}</span></li>)}</ol></section>
  </CompanyShell>;
}
