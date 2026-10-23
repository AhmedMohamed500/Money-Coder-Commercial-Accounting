import Link from "next/link";
import { ArrowLeft, Building2, Check, FileLock2, Landmark, Network, ShieldCheck, Sparkles, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Brand } from "@/components/brand";
import Image from "next/image";

const foundation = [
  [Building2, "ملف شركة منظم", "البيانات القانونية والضريبية والعناوين والإعدادات المحاسبية في مكان واحد."],
  [Users, "عضويات وصلاحيات", "يمكن للمستخدم الانضمام إلى أكثر من كيان، بصلاحية مستقلة داخل كل عضوية."],
  [FileLock2, "مستندات محمية", "بيانات الملف في PostgreSQL والتنزيل بعد فحص الصلاحية؛ التخزين المحلي للاختبار فقط."],
];

export default function Home() {
  return <main>
    <SiteHeader />
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_20%,#d9fff5,transparent_28%),radial-gradient(circle_at_15%_30%,#deefff,transparent_30%)]" />
      <div className="container-shell grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <span className="badge mb-6"><Sparkles className="ml-2 h-4 w-4" /> المرحلة الأولى متاحة للتجربة</span>
          <h1 className="text-4xl font-black leading-[1.18] tracking-tight sm:text-6xl">أساس محاسبي منظم.<br/><span className="gradient-text">من أول ملف شركة.</span></h1>
          <p className="muted mt-7 max-w-2xl text-lg leading-8">Money Coder تجمع تأسيس بيانات الشركات، عضويات الفريق، تفويض مكتب المحاسبة، والمستندات ضمن بنية متعددة الكيانات مصممة للنمو.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link className="btn-primary" href="/auth/register">أنشئ حسابك <ArrowLeft className="h-4 w-4" /></Link><Link className="btn-secondary" href="/#platform">استكشف المرحلة الأولى</Link></div>
          <p className="muted mt-5 text-sm">لن نعرض القيود والقوائم المالية كميزات جاهزة قبل تنفيذها واختبارها في المراحل القادمة.</p>
        </div>
        <div className="surface relative rounded-[34px] p-7 sm:p-10">
          <Image src="/money-coder-logo.jpg" alt="Money Coder — Where money meets code" width={500} height={500} priority className="mx-auto aspect-square w-full max-w-md rounded-3xl object-cover" />
          <div className="absolute -bottom-5 left-6 rounded-2xl bg-[#08204b] px-5 py-4 text-white shadow-2xl"><strong className="block">Phase 1</strong><span className="text-xs text-blue-100">Company & Office Foundation</span></div>
        </div>
      </div>
    </section>

    <section id="platform" className="bg-[#f4f9fc] py-20"><div className="container-shell"><div className="max-w-3xl"><span className="badge">منفذ فعليًا في Phase 1</span><h2 className="section-title mt-4">بنية موحدة للهوية والكيانات والملفات</h2><p className="muted mt-4 leading-7">البيانات الحقيقية فقط: إذا كان حسابك جديدًا تبدأ الأعداد من الصفر، وكل تعديل يمر عبر تحقق وصلاحية على الخادم.</p></div><div className="grid-cards mt-10">{foundation.map(([Icon,title,text]) => { const C = Icon as typeof Building2; return <article className="surface rounded-3xl p-7" key={String(title)}><C className="h-10 w-10 text-[#0875e1]"/><h3 className="mt-5 text-xl font-black">{String(title)}</h3><p className="muted mt-3 leading-7">{String(text)}</p></article>;})}</div></div></section>

    <section id="audiences" className="py-20"><div className="container-shell grid gap-7 lg:grid-cols-2">
      <article className="rounded-[32px] bg-[#08204b] p-9 text-white"><Landmark className="h-11 w-11 text-cyan-300"/><p className="mt-6 text-sm font-bold text-cyan-200">لمكاتب المحاسبة</p><h2 className="mt-2 text-3xl font-black">أدر العملاء والفريق من سياق واحد</h2><p className="mt-4 leading-8 text-blue-100">أرسل طلب تفويض، تابع حالته، وعيّن موظفين بصلاحيات محددة. إلغاء التفويض يوقف الوصول ويبقي ملكية البيانات للشركة.</p></article>
      <article className="rounded-[32px] border border-emerald-100 bg-emerald-50 p-9"><Building2 className="h-11 w-11 text-emerald-600"/><p className="mt-6 text-sm font-bold text-emerald-700">للشركات التجارية</p><h2 className="mt-2 text-3xl font-black">ملف مؤسسي يستمر معك</h2><p className="muted mt-4 leading-8">أكمل بيانات الشركة تدريجيًا، أضف الحسابات البنكية والمستندات، وقرّر بنفسك من يرى بياناتك ومن يستطيع تعديلها.</p></article>
    </div></section>

    <section id="how" className="bg-[#f4f9fc] py-20"><div className="container-shell"><h2 className="section-title text-center">كيف تبدأ؟</h2><div className="mt-10 grid gap-5 md:grid-cols-3">{[["01","اختر نوع الحساب","مكتب محاسبة أو شركة تجارية دون إنشاء هوية جديدة لكل عضوية."],["02","أكمل ملف الكيان","احفظ المسودة وأكمل البيانات القانونية والاتصال والإعدادات."],["03","نظّم الوصول","أضف الفريق أو فوّض مكتبًا مع صلاحيات قابلة للإلغاء."]].map(([n,t,d])=><div key={n} className="surface rounded-3xl p-7"><span className="gradient-text text-3xl font-black">{n}</span><h3 className="mt-4 text-xl font-black">{t}</h3><p className="muted mt-3 leading-7">{d}</p></div>)}</div></div></section>

    <section id="roadmap" className="py-20"><div className="container-shell grid gap-10 lg:grid-cols-2"><div><span className="badge">مخطط للمراحل القادمة — غير مفعّل الآن</span><h2 className="section-title mt-4">من البيانات الأساسية إلى دورة محاسبية متكاملة</h2><p className="muted mt-5 leading-8">بُنيت حدود الكيانات لتستوعب دليل الحسابات والأرصدة الافتتاحية ومعالجة المستندات لاحقًا، لكن لا توجد صفحات وهمية توحي بأنها مكتملة.</p></div><div className="grid gap-3">{["دليل حسابات مستقل لكل شركة","ميزان افتتاحي متوازن وقابل للاعتماد","معالجة كشوف البنوك وملفات Excel","القيود والأستاذ والقوائم المالية بعد الاعتماد"].map(x=><div className="flex gap-3 rounded-2xl border border-slate-200 p-4" key={x}><Check className="mt-1 h-5 w-5 text-teal-600"/><span className="font-bold">{x}</span></div>)}</div></div></section>

    <section className="pb-20"><div className="container-shell rounded-[36px] bg-gradient-to-l from-[#0875e1] to-[#08bd9b] px-8 py-12 text-center text-white"><Network className="mx-auto h-12 w-12"/><h2 className="mt-5 text-3xl font-black">ابدأ ببيانات نظيفة وصلاحيات واضحة</h2><p className="mx-auto mt-4 max-w-2xl text-cyan-50">أنشئ كيانك الأول ثم أكمل ملفه من لوحة التحكم.</p><Link href="/auth/register" className="btn-secondary mt-7 text-[#08204b]">إنشاء حساب</Link></div></section>
    <footer className="border-t border-slate-100 py-9"><div className="container-shell flex flex-col items-center justify-between gap-5 sm:flex-row"><Brand compact/><div className="muted flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4"/> Money Coder © 2026 — Where money meets code.</div></div></footer>
  </main>;
}
