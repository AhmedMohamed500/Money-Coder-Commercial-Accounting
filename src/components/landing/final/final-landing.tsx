"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft, BarChart3, BookOpenCheck, BriefcaseBusiness, Building2, Check,
  CheckCircle2, ChevronLeft, ChevronRight, Cloud, Factory, Gauge, HardHat, Menu,
  MonitorSmartphone, Network,
  NotebookTabs, Quote, ReceiptText, ScanSearch, ShieldCheck, Sparkles,
  Store, UsersRound, UtensilsCrossed, X, Zap,
} from "lucide-react";
import "./final-landing.css";
import {
  DocumentJourney,
  FinancialTwinShowcase,
  MobileReportingShowcase,
  ProductFaq,
  SecurityApprovals,
  StartPaths,
} from "./enterprise-showcases";

type OfficeMode = "single" | "multi";
type IndustryId = "contracting" | "trade" | "manufacturing" | "hospitality" | "services";

const features = [
  { icon: ScanSearch, title: "التدقيق والأدلة", note: "متاح جزئيًا" },
  { icon: ShieldCheck, title: "الرقابة المالية", note: "ضمن Financial Twin" },
  { icon: Sparkles, title: "الأتمتة الذكية", note: "ضمن Financial Twin" },
  { icon: NotebookTabs, title: "القيود والترحيل", note: "ضمن Financial Twin" },
  { icon: BookOpenCheck, title: "دفتر الأستاذ", note: "ضمن Financial Twin" },
  { icon: BarChart3, title: "التقارير والقوائم", note: "ضمن Financial Twin" },
] as const;

const industries: Array<{ id: IndustryId; label: string; icon: typeof HardHat; image: string; copy: string }> = [
  { id: "contracting", label: "المقاولات", icon: HardHat, image: "/landing/global-skyline-v10.webp", copy: "مشروعات وعهد ومستخلصات" },
  { id: "trade", label: "التجارة والتوزيع", icon: Store, image: "/landing/commercial-warehouse-v5.webp", copy: "موردون وتحصيلات وتشغيل" },
  { id: "manufacturing", label: "التصنيع والإنتاج", icon: Factory, image: "/landing/factory-cutaway-v2.webp", copy: "تشغيل ومخزون وتكاليف" },
  { id: "hospitality", label: "المطاعم والكافيهات", icon: UtensilsCrossed, image: "/landing/industry-restaurants-v1.png", copy: "مبيعات ومشتريات وتشغيل" },
  { id: "services", label: "الخدمات", icon: BriefcaseBusiness, image: "/landing/global-office-v10.webp", copy: "عقود وفواتير ومصروفات" },
];

const roles = [
  { image: "/landing/role-owner-executive-v1.png", title: "مالك الشركة", icon: Building2, points: ["رؤية شاملة للأداء المالي", "مؤشرات مالية فورية", "اعتماد العمليات والصلاحيات"] },
  { image: "/landing/role-accountant-v5.webp", title: "المحاسب", icon: ReceiptText, points: ["صلاحيات محددة", "مراجعة المستندات", "توثيق المصدر"] },
  { image: "/landing/role-finance-v5.webp", title: "مدير المالية", icon: Gauge, points: ["متابعة الأداء المالي", "إدارة الميزانية", "التقارير التحليلية"] },
] as const;

const proofBrands = [
  { icon: HardHat, name: "Nile Contracting", sector: "المقاولات" },
  { icon: Store, name: "Delta Trading", sector: "التجارة" },
  { icon: UtensilsCrossed, name: "Cairo Food", sector: "الأغذية" },
  { icon: Factory, name: "Al Amal Manufacturing", sector: "التصنيع" },
] as const;

function BrandMark() {
  return <svg className="mcf-brand-symbol" viewBox="0 0 48 40" aria-hidden="true"><path d="M5 31h7V20H5zm10 0h7V14h-7zm10 0h7V8h-7zm10 0h7V3h-7z" fill="currentColor" /><path d="M4 35c12-5 25-7 40-7v5c-14 0-27 2-40 6z" fill="#f2b83f" /></svg>;
}

function Brand() {
  return <Link className="mcf-brand" href="/" aria-label="Money Coder — الصفحة الرئيسية"><BrandMark /><span><strong>Money Coder</strong><small>Commercial Accounting</small></span></Link>;
}

function Header({ signedIn }: { signedIn: boolean }) {
  const startHref = signedIn ? "/dashboard" : "/auth/register";
  return <header className="mcf-header"><div className="mcf-shell mcf-header-inner"><Brand /><span className="mcf-brand-tag">منصة محاسبية متكاملة<br />لإدارة أعمال شركتك</span><nav className="mcf-nav" aria-label="التنقل الرئيسي"><a className="is-active" href="#top">الرئيسية</a><a href="#financial-twin">Financial Twin</a><a href="#offices">مكاتب المحاسبة</a><a href="#workflow">رحلة المستند</a><a href="#security">الأمان</a><a href="#plans">ابدأ الآن</a></nav><div className="mcf-header-actions"><Link className="mcf-button mcf-button-ghost" href="/demo"><Gauge size={15} /> جرّب العرض</Link><Link className="mcf-button mcf-button-gold" href={startHref}>{signedIn ? "افتح لوحتك" : "ابدأ مجانًا"}</Link></div><details className="mcf-menu"><summary aria-label="فتح القائمة"><Menu size={23} /><X className="mcf-menu-close" size={23} /></summary><nav aria-label="قائمة الموبايل"><Link href="/demo">العرض التفاعلي</Link><a href="#financial-twin">Financial Twin</a><a href="#offices">مكاتب المحاسبة</a><a href="#workflow">رحلة المستند</a><a href="#mobile-reporting">تقارير الهاتف</a><a href="#security">الأمان</a><a href="#faq">الأسئلة الشائعة</a><Link href={signedIn ? "/dashboard" : "/auth/login"}>{signedIn ? "لوحة التحكم" : "تسجيل الدخول"}</Link><Link className="mcf-menu-cta" href={startHref}>{signedIn ? "افتح لوحتك" : "ابدأ مجانًا"}</Link></nav></details></div></header>;
}

function Hero({ signedIn }: { signedIn: boolean }) {
  const startHref = signedIn ? "/dashboard" : "/auth/register";
  return <section id="top" className="mcf-hero" aria-labelledby="mcf-title"><div className="mcf-shell mcf-hero-grid"><div className="mcf-hero-copy"><span className="mcf-eyebrow"><i /> FINANCIAL TWIN PLATFORM <i /></span><h1 id="mcf-title">من المستند اليومي إلى<br /><em>صورة مالية قابلة للفهم</em></h1><p>مساحات عمل آمنة للشركات ومكاتب المحاسبة اليوم، ورؤية Financial Twin تربط الأدلة والمراجعة والقرار في تجربة واحدة مستقبلًا.</p><div className="mcf-hero-actions"><Link className="mcf-button mcf-button-gold mcf-button-lg" href="/demo">جرّب العرض التفاعلي<ArrowLeft size={18} /></Link><Link className="mcf-button mcf-button-ghost mcf-button-lg" href={startHref}>{signedIn ? "افتح مساحة شركتك" : "إنشاء حساب حقيقي"}</Link></div><div className="mcf-hero-trust" aria-label="مزايا المنصة الحالية"><span><ShieldCheck /> صلاحيات واضحة</span><span><MonitorSmartphone /> متعدد الأجهزة</span><span><Cloud /> مساحات قابلة للتوسع</span><span><Zap /> تجربة عربية سهلة</span></div></div><div className="mcf-hero-visual"><Image src="/landing/financial-twin-hero-devices-v1.png" alt="مجموعة أجهزة واقعية تعرض لوحة Money Coder المالية" width={1774} height={887} priority sizes="(max-width: 820px) 100vw, 58vw" /><small><CheckCircle2 /> بيانات العرض افتراضية وليست بيانات عملاء</small></div></div><div id="product" className="mcf-shell mcf-feature-rail">{features.map(({ icon: Icon, title, note }) => <article key={title}><Icon /><strong>{title}</strong><small>{note}</small></article>)}</div></section>;
}

function Offices() {
  const [mode, setMode] = useState<OfficeMode>("multi");
  const companies = [["شركة النيل التجارية", "جاهزة للمراجعة", "good"], ["دلتا للصناعات", "مستندات جديدة", "warn"], ["أفق للتوزيع", "التفويض نشط", "good"], ["رؤية للخدمات", "بانتظار الموافقة", "wait"]] as const;
  const singleItems = [["مراجعة المستندات", "متاح الآن", true], ["مراجعة القيود", "ضمن Financial Twin", false], ["اعتماد المعاملات", "ضمن Financial Twin", false], ["ميزان المراجعة", "ضمن Financial Twin", false], ["القوائم المالية", "ضمن Financial Twin", false]] as const;
  const multiItems = [["بوابة آمنة للعملاء", "متاح الآن", true], ["صلاحيات فريق العمل", "متاح الآن", true], ["تقارير مجمعة ومفصلة", "ضمن Financial Twin", false], ["مراجعة واعتماد القيود", "ضمن Financial Twin", false], ["إدارة متعددة للشركات", "متاح الآن", true]] as const;
  const items = mode === "single" ? singleItems : multiItems;
  const summary = mode === "single"
    ? [["المستندات المتاحة", "18"], ["أعضاء الفريق", "4"], ["حالة الملف", "نشط"]]
    : [["شركات العرض", "4"], ["تعيينات الموظفين", "9"], ["تفويضات نشطة", "3"]];
  return (
    <section id="offices" className="mcf-office-section" aria-labelledby="mcf-office-title">
      <div className="mcf-shell mcf-office-card">
        <div className="mcf-office-media">
          <Image src="/landing/accounting-office-team-v1.png" alt="محاسبان يراجعان التقارير على حاسوب في مكتب احترافي، مشهد توضيحي" fill sizes="(max-width: 820px) 100vw, 44vw" />
          <span>مشهد توضيحي</span>
          <div className="mcf-company-panel" aria-label="معاينة إدارة شركات العملاء">
            <header><span><UsersRound size={16} /> مركز إدارة العملاء</span><small>بيانات افتراضية</small></header>
            {companies.map(([name, status, tone]) => <div key={name}><span><b>{name}</b><small>{status}</small></span><i className={tone}><Check size={11} /></i></div>)}
          </div>
          <div className="mcf-office-device" aria-hidden="true"><div /><span /><i /></div>
        </div>
        <div className="mcf-office-copy">
          <span className="mcf-section-kicker">ACCOUNTING OFFICE COMMAND CENTER</span>
          <h2 id="mcf-office-title">مركز قيادة لمكتبك وشركات عملائك</h2>
          <p>التفويضات، الموظفون والمستندات معزولة حسب الشركة ومتاحة وفق صلاحية المستخدم. القيود والتقارير المالية القادمة مميزة بوضوح.</p>
          <div className="mcf-office-tabs" role="tablist" aria-label="طريقة عمل مكتب المحاسبة"><button type="button" role="tab" aria-selected={mode === "single"} onClick={() => setMode("single")}>شركة واحدة</button><button type="button" role="tab" aria-selected={mode === "multi"} onClick={() => setMode("multi")}>عدة شركات</button></div>
          <div className="mcf-office-context" aria-live="polite">
            <header><span><strong>{mode === "single" ? "ملف شركة واحدة" : "محفظة شركات العملاء"}</strong><small>{mode === "single" ? "مستندات وفريق وحالة مراجعة" : "تبديل، تعيينات، صلاحيات وعزل بيانات"}</small></span><em>بيانات عرض</em></header>
            <div>{summary.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>
          </div>
          <div className="mcf-office-capabilities" role="tabpanel">{items.map(([title, status, ready]) => <article className={ready ? "is-ready" : ""} key={title}><span>{ready ? <CheckCircle2 /> : <Gauge />}</span><strong>{title}</strong><small>{status}</small></article>)}</div>
        </div>
      </div>
    </section>
  );
}

function Industries() {
  const [active, setActive] = useState<IndustryId>("trade");
  const shift = (direction: -1 | 1) => {
    const index = industries.findIndex(industry => industry.id === active);
    setActive(industries[(index + direction + industries.length) % industries.length].id);
  };
  return <section id="industries" className="mcf-section mcf-industries" aria-labelledby="mcf-industries-title"><div className="mcf-shell"><div className="mcf-section-heading"><h2 id="mcf-industries-title">مناسب لمختلف القطاعات</h2></div><div className="mcf-industry-stage"><button className="mcf-industry-arrow is-right" type="button" aria-label="القطاع التالي" onClick={() => shift(-1)}><ChevronRight /></button><div className="mcf-industry-grid" role="list">{industries.map(({ id, label, icon: Icon, image, copy }) => <button type="button" key={id} className={active === id ? "is-active" : ""} onClick={() => setActive(id)} aria-pressed={active === id}><Image src={image} alt="" fill sizes="(max-width: 700px) 74vw, 20vw" /><span><Icon /><strong>{label}</strong><small>{copy}</small></span></button>)}</div><button className="mcf-industry-arrow is-left" type="button" aria-label="القطاع السابق" onClick={() => shift(1)}><ChevronLeft /></button></div></div></section>;
}

function Roles() {
  return <section id="roles" className="mcf-section mcf-roles" aria-labelledby="mcf-roles-title"><div className="mcf-shell"><div className="mcf-section-heading"><h2 id="mcf-roles-title">حل متكامل لكل فريق داخل شركتك</h2></div><div className="mcf-role-grid">{roles.map(({ image, title, icon: Icon, points }) => <article key={title}><div className="mcf-role-image"><Image src={image} alt={`مشهد توضيحي لدور ${title}`} fill sizes="(max-width: 700px) 100vw, 16vw" /></div><div><span className="mcf-role-title"><Icon /><strong>{title}</strong></span><ul>{points.map(point => <li key={point}><Check />{point}</li>)}</ul></div></article>)}</div></div></section>;
}

function Benefits() {
  return <section className="mcf-section mcf-benefits" aria-labelledby="mcf-benefits-title"><div className="mcf-shell"><div className="mcf-section-heading"><h2 id="mcf-benefits-title">لماذا Money Coder؟</h2></div><div className="mcf-benefit-layout"><div className="mcf-benefit-cards"><article><Zap /><strong>سرعة وكفاءة</strong><p>إنجاز الأعمال المحاسبية في وقت أقل.</p></article><article><Network /><strong>مرونة وتوسع</strong><p>ينمو مع شركتك وتعدد فروعها.</p></article><article><Sparkles /><strong>أتمتة ذكية</strong><p>تقلل الوقت والجهد وتخفض الأخطاء.</p></article><article><ShieldCheck /><strong>رقابة وامتثال</strong><p>وفق أفضل الممارسات والمعايير المحاسبية.</p></article></div><div className="mcf-benefit-visual"><Image src="/landing/financial-twin-benefits-tablet-v1.png" alt="جهاز لوحي واقعي يعرض التحليل المالي في Money Coder" width={1774} height={887} sizes="(max-width: 820px) 100vw, 48vw" /></div></div><div className="mcf-social-proof"><div className="mcf-proof-brands"><div className="mcf-proof-heading"><strong>مصمم لخدمة شركات</strong><span>في مختلف القطاعات</span></div>{proofBrands.map(({ icon: Icon, name, sector }) => <article key={name}><Icon /><span><strong>{name}</strong><small>{sector}</small></span></article>)}</div><figure className="mcf-testimonial"><div className="mcf-testimonial-copy"><Quote /><blockquote>واجهة واضحة تجمع ملفات الشركة وفريقها وصلاحياتها في مكان واحد.</blockquote><figcaption>نموذج توضيحي لتجربة الاستخدام — وليس شهادة عميل حقيقية</figcaption></div><div className="mcf-testimonial-avatar"><Image src="/landing/role-owner-v5.webp" alt="صورة توضيحية لمستخدمة أعمال" fill sizes="72px" /></div></figure></div></div></section>;
}

function FinalCta({ signedIn }: { signedIn: boolean }) {
  void signedIn;
  return <section id="final-cta" className="mcf-final" aria-labelledby="mcf-final-title"><div className="mcf-shell mcf-final-grid"><div className="mcf-final-visual"><Image src="/landing/financial-twin-cta-devices-v1.png" alt="حاسوب وهاتف واقعيان يعرضان لوحة Money Coder" width={2172} height={724} sizes="(max-width: 820px) 100vw, 57vw" /></div><div><h2 id="mcf-final-title">ابدأ الآن وجرّب المنصة بنفسك</h2><p>استكشف رحلة المنتج ببيانات افتراضية، دون تسجيل أو اتصال ببيانات الإنتاج.</p><ul><li><Check /> ثلاث شركات افتراضية</li><li><Check /> مراجعة وقيود وتقارير مترابطة</li><li><Check /> إعادة فورية لنقطة البداية</li></ul><Link className="mcf-button mcf-button-gold mcf-button-xl" href="/demo">فتح العرض التفاعلي<ArrowLeft /></Link></div></div></section>;
}

function Footer({ signedIn }: { signedIn: boolean }) {
  return <footer className="mcf-footer"><div className="mcf-shell mcf-footer-grid"><div className="mcf-footer-brand"><Brand /><p>مساحات عمل آمنة للشركات ومكاتب المحاسبة، مع رؤية Financial Twin مالية مترابطة.</p></div><nav aria-label="روابط المنتج"><strong>المنتج</strong><a href="#financial-twin">Financial Twin</a><a href="#offices">مكاتب المحاسبة</a><a href="#mobile-reporting">تقارير الهاتف</a></nav><nav aria-label="روابط الموارد"><strong>الموارد</strong><a href="#workflow">رحلة المستند</a><a href="#security">الأمان والتفويضات</a><a href="#faq">الأسئلة الشائعة</a></nav><nav aria-label="روابط الحساب"><strong>الحساب</strong><Link href={signedIn ? "/dashboard" : "/auth/register"}>{signedIn ? "لوحة التحكم" : "إنشاء حساب"}</Link><Link href={signedIn ? "/dashboard" : "/auth/login"}>{signedIn ? "مساحة العمل" : "تسجيل الدخول"}</Link><a href="#plans">مسارات البداية</a></nav><div className="mcf-footer-social"><strong>القنوات الرسمية</strong><small>لا توجد حسابات تواصل اجتماعي رسمية منشورة أو موثقة في المشروع حاليًا.</small></div></div><div className="mcf-shell mcf-footer-bottom"><span>© 2026 Money Coder. جميع الحقوق محفوظة.</span><span>Commercial Accounting · Cairo, Egypt</span></div></footer>;
}

export function FinalLanding({ signedIn }: { signedIn: boolean }) {
  return <div className="mcf" dir="rtl"><Header signedIn={signedIn} /><main><Hero signedIn={signedIn} /><FinancialTwinShowcase /><Offices /><DocumentJourney /><MobileReportingShowcase /><Industries /><Roles /><Benefits /><SecurityApprovals /><StartPaths signedIn={signedIn} /><ProductFaq /><FinalCta signedIn={signedIn} /></main><Footer signedIn={signedIn} /></div>;
}
