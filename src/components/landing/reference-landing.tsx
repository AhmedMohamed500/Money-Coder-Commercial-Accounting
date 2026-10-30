import Link from "next/link";
import { ArrowLeft, BarChart3, Building2, Check, ChevronLeft, FileText, Headphones, Landmark, ShieldCheck, Sparkles, UserRound, Users } from "lucide-react";
import { MobileNav } from "@/components/landing/mobile-nav";
import { PremiumMobileMockup } from "@/components/landing/premium-mobile-mockup";
import { BankProcessingShowcase } from "@/components/landing/bank-processing-showcase";
import { AccountingJourney } from "@/components/landing/accounting-journey";
import { FinancialClarity } from "@/components/landing/financial-clarity";
import { ProductFoundation } from "@/components/landing/product-foundation";
import { LandingFaq } from "@/components/landing/landing-faq";
import { IndustrySolutions } from "@/components/landing/industry-solutions";
import { FactoryFinanceStory } from "@/components/landing/factory-finance-story";
import { FinancialControl } from "@/components/landing/financial-control";
import { ProductReadiness } from "@/components/landing/product-readiness";
import { getSessionUser } from "@/lib/auth";
import "./reference-landing.css";
import "./accounting-journey.css";
import "./enterprise-sections.css";
import "./dimensional-art.css";
import "./enterprise-v2.css";
import "./hero-refinement.css";
import "./corporate-v5.css";

const nav = [["الرئيسية", "#top"], ["المنصة", "#platform"], ["الحلول", "#solutions"], ["رحلة البيانات", "#journey"], ["كيف تبدأ", "#process"], ["البدء", "#contact"]] as const;
const benefits = [
  { icon: Users, title: "أعضاء الفريق", copy: "عضويات وأدوار داخل الشركة" },
  { icon: Landmark, title: "حسابات بنكية", copy: "حسابات متعددة داخل ملف الشركة" },
  { icon: ShieldCheck, title: "تفويض المكتب", copy: "بعد قبول الشركة للتفويض" },
  { icon: Building2, title: "إدارة الشركات", copy: "كيانات وأدوار في مكان واحد" },
];
const features = [
  { icon: ShieldCheck, title: "صلاحيات الأعضاء", copy: "أدوار تحدد ما يستطيع كل عضو الوصول إليه." },
  { icon: BarChart3, title: "التقارير المالية", copy: "مثال توضيحي؛ التقارير الحية ضمن خطة التطوير." },
  { icon: FileText, title: "القيود المحاسبية", copy: "قيد مقترح في المعاينة؛ المحرك ضمن خطة التطوير." },
  { icon: Landmark, title: "الحسابات البنكية", copy: "إضافة حسابات شركتك وإدارتها في ملفها." },
  { icon: Users, title: "التعاون مع المكتب", copy: "طلب تفويض وقبول من الشركة قبل الوصول." },
  { icon: Building2, title: "إدارة الشركات", copy: "ملف الشركة وفريقها في مساحة عربية." },
];
const steps = [
  { icon: UserRound, title: "إنشاء حساب", copy: "سجل حساب شركتك في المنصة." },
  { icon: Building2, title: "إضافة شركتك", copy: "أدخل بيانات شركتك التجارية." },
  { icon: Users, title: "دعوة الفريق", copy: "نظّم العضويات وحدد الأدوار." },
  { icon: Landmark, title: "إضافة حساب بنكي", copy: "سجّل بيانات الحساب داخل ملف الشركة." },
];

function DashboardPreview() {
  return <div className="af-dashboard mc-hero-workspace" dir="rtl" aria-label="معاينة توضيحية لإدارة ملف شركة افتراضية">
    <aside className="af-dashboard__sidebar" aria-hidden="true"><b>M</b><span className="active"><Building2/>ملف الشركة</span><span><Landmark/>الحسابات البنكية</span><span><Users/>الفريق</span><span><ShieldCheck/>التفويض</span></aside>
    <div className="af-dashboard__body"><header><div><small>مساحة العمل · مثال توضيحي</small><strong>شركة المثال التجارية</strong></div><span>ملف الشركة</span></header>
      <div className="mc-hero-workspace__lead"><div><small>الكيان</small><strong>شركة تجارية</strong></div><div><small>العملة الأساسية</small><strong>الجنيه المصري</strong></div><div><small>المرحلة</small><strong>مراجعة بيانات الملف</strong></div></div>
      <div className="mc-hero-workspace__body"><div><strong>إعداد الشركة</strong><p>بيانات أساسية، قانونية وضريبية، ثم إعداد محاسبي وحسابات بنكية.</p><span><Check/> بيانات الشركة <Check/> الحساب البنكي</span></div><div><strong>الفريق والصلاحيات</strong><p>عضويات مرتبطة بأدوار، وتفويض المكتب يتطلب موافقة الشركة.</p><span><Users/> أعضاء الفريق <ShieldCheck/> صلاحيات الوصول</span></div></div>
      <div className="mc-hero-workspace__footer"><Landmark/><span>حساب بنكي مسجل في ملف الشركة · بدون ربط آلي بالبنك</span></div>
    </div>
  </div>;
}

function Devices() {
  return <div className="af-devices" aria-label="معاينة توضيحية للمنصة على الكمبيوتر والهاتف">
    <div className="af-laptop"><div className="af-laptop__screen"><span className="af-laptop__camera" aria-hidden="true"/><DashboardPreview/></div><div className="af-laptop__hinge" aria-hidden="true"/><div className="af-laptop__base"/></div>
    <PremiumMobileMockup/><span className="af-preview-note">واجهات وبيانات الشركة في المعاينة توضيحية</span>
  </div>;
}

function BenefitsStrip() {
  return <div className="mc-approved-benefits"><div className="af-container mc-approved-benefits__inner">{benefits.map(({ icon: Icon, title, copy }) => <div key={title}><span><Icon aria-hidden="true" /></span><div><strong>{title}</strong><small>{copy}</small></div></div>)}</div></div>;
}

function LandingBrand() {
  return <Link className="af-brand" href="/" aria-label="Money Coder — الصفحة الرئيسية"><span className="af-brand__mark" aria-hidden="true"/><span className="af-brand__name"><strong>Money Coder</strong><small>SMART ACCOUNTING</small></span></Link>;
}

function Header({ signedIn }: { signedIn: boolean }) {
  return <header className="af-header"><div className="af-container af-header__inner"><LandingBrand/><nav className="af-header__nav" aria-label="التنقل الرئيسي">{nav.map(([label, href], index) => <Link key={href} className={index === 0 ? "active" : ""} href={href}>{label}</Link>)}</nav><div className="af-header__actions"><Link className="af-gold" href={signedIn ? "/dashboard" : "/auth/register"}>{signedIn ? "لوحة التحكم" : "إنشاء حساب"}<UserRound/></Link><Link className="af-outline" href={signedIn ? "/dashboard" : "/auth/login"}>{signedIn ? "حسابي" : "تسجيل الدخول"}<UserRound/></Link></div><MobileNav nav={nav} signedIn={signedIn}/></div></header>;
}

export async function ReferenceLanding() {
  const signedIn = Boolean(await getSessionUser());
  const startHref = signedIn ? "/dashboard" : "/auth/register";
  return <div className="af-landing" id="top" dir="rtl"><Header signedIn={signedIn}/><main>
    <section className="af-hero"><div className="af-container af-hero__grid"><div className="af-hero__copy"><span className="af-eyebrow">منصة عربية لشركتك التجارية</span><h1>إدارة مالية <em>أسهل</em> لنمو <span>أسرع</span> لشركتك</h1><p>ابدأ بملف منظم لشركتك وحساباتها البنكية وفريقها. حدّد صلاحيات الأعضاء، وتعاون مع مكتب المحاسبة بعد موافقتك على التفويض.</p><div className="af-hero__buttons"><Link className="af-primary" href={startHref}>ابدأ بتنظيم شركتك <ArrowLeft/></Link><Link className="af-outline" href="#platform">استكشف المنصة <Building2/></Link></div><div className="af-assurance"><span><ShieldCheck/>صلاحيات واضحة</span><span><FileText/>تنظيم البيانات</span><span><Sparkles/>واجهة عربية</span><span><Headphones/>بداية سهلة</span></div></div><Devices/></div></section>
    <BenefitsStrip/>
    <ProductFoundation/>
    <FinancialClarity/>
    <IndustrySolutions/>
    <section className="af-features af-section" id="features"><div className="af-container"><div className="mc-approved-heading"><span className="mc-section-kicker">أساس قوي ورؤية واضحة</span><h2>مميزات قوية تدعم نمو أعمالك</h2><p>وظائف تأسيس وإدارة متاحة الآن، مع تصور صريح للوظائف المحاسبية القادمة.</p></div><div className="af-feature-grid">{features.map(({ icon: Icon, title, copy }) => <article className="af-feature" key={title}><span><Icon aria-hidden="true"/></span><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>
    <BankProcessingShowcase/>
    <AccountingJourney/>
    <FactoryFinanceStory/>
    <FinancialControl/>
    <ProductReadiness/>
    <section className="af-steps af-section" id="process"><div className="af-container"><div className="af-heading"><h2>كيف تبدأ؟</h2><p>خطوات واضحة للبدء بتنظيم بيانات شركتك</p></div><div className="af-steps__grid">{steps.map(({ icon: Icon, title, copy }, index) => <article className="af-step" key={title}><span className="af-step__number">{index + 1}</span><span className="af-step__icon"><Icon/></span><div><h3>{title}</h3><p>{copy}</p></div>{index < 3 ? <ChevronLeft className="af-step__arrow"/> : null}</article>)}</div></div></section>
    <LandingFaq/>
    <section className="af-final" id="contact"><div className="af-container af-final__inner"><div className="af-final__copy"><span>ابدأ مع Money Coder</span><h2>ابدأ بتنظيم شركتك اليوم</h2><p>ملف شركتك وفريقك وحساباتها في مساحة واحدة. يمكنك استكشاف الأمثلة المحاسبية القادمة بوضوح قبل اتخاذ قرارك.</p><div className="af-final__actions"><Link className="af-gold" href={startHref}>{signedIn ? "افتح لوحة التحكم" : "ابدأ بتنظيم شركتك"}<ArrowLeft/></Link><Link className="af-outline" href="#platform">استكشف تجربة المنصة <Building2/></Link></div></div><div className="af-final__visual" aria-hidden="true"><div className="af-final__mock"><div><b>Money Coder</b><span>ملف الشركة</span></div><strong>شركة المثال التجارية</strong><div className="af-final__mock-data"><span>حسابات بنكية <b>مسجلة</b></span><span>أعضاء الفريق <b>أدوار واضحة</b></span><span>تفويض المكتب <b>بموافقة الشركة</b></span></div></div><span>معاينة توضيحية للمنتج</span></div></div></section>
  </main><footer className="af-footer"><div className="af-container af-footer__inner"><LandingBrand/><nav aria-label="روابط التذييل">{nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav><small>© 2026 Money Coder. جميع الحقوق محفوظة.</small></div></footer></div>;
}
