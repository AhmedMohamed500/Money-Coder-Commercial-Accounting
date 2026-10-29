import Link from "next/link";
import { ArrowLeft, BarChart3, Building2, Check, ChevronLeft, CirclePlay, FileText, Headphones, Landmark, LockKeyhole, PieChart, ShieldCheck, Sparkles, TrendingUp, UserRound, Users } from "lucide-react";
import { MobileNav } from "@/components/landing/mobile-nav";
import { PremiumMobileMockup } from "@/components/landing/premium-mobile-mockup";
import { BankProcessingShowcase } from "@/components/landing/bank-processing-showcase";
import { AccountingJourney } from "@/components/landing/accounting-journey";
import { FinancialClarity } from "@/components/landing/financial-clarity";
import { IndustrySolutions } from "@/components/landing/industry-solutions";
import { FactoryFinanceStory } from "@/components/landing/factory-finance-story";
import { FinancialControl, ProductReadiness } from "@/components/landing/financial-control";
import { closingBankBalance, demoAccountNumber, demoTransactions, incomeStatement, money, openingBankBalance, totalCredits, totalDebits } from "@/components/landing/accounting-demo-data";
import { getSessionUser } from "@/lib/auth";
import "./reference-landing.css";
import "./accounting-journey.css";
import "./enterprise-sections.css";
import "./dimensional-art.css";
import "./enterprise-v2.css";

const nav = [["الرئيسية", "#top"], ["الحلول", "#solutions"], ["المميزات", "#features"], ["رحلة البيانات", "#journey"], ["كيف تبدأ", "#process"], ["ابدأ الآن", "#contact"]] as const;
const features = [
  { icon: ShieldCheck, title: "أمان وخصوصية", copy: "صلاحيات بحسب الدور وعزل بيانات كل شركة." },
  { icon: Sparkles, title: "سهولة الاستخدام", copy: "واجهة عربية واضحة لتنظيم معلوماتك." },
  { icon: Users, title: "إدارة الشركات", copy: "بيانات الشركة وفريقها في مساحة واحدة." },
  { icon: Landmark, title: "مراجعة البنوك", copy: "تنظيم الحسابات؛ مطابقة الحركات قيد التطوير." },
  { icon: FileText, title: "إدارة المستندات", copy: "تنظيم الملفات؛ الرفع حسب جاهزية الخدمة." },
  { icon: BarChart3, title: "تقارير محاسبية احترافية", copy: "التقارير المالية المتقدمة قيد التطوير." },
];
const steps = [
  { icon: UserRound, title: "إنشاء حساب", copy: "سجل حساب شركتك في المنصة." },
  { icon: Building2, title: "إضافة شركتك", copy: "أدخل بيانات شركتك التجارية." },
  { icon: FileText, title: "رفع المستندات", copy: "عند إتاحة خدمة الرفع الآمن." },
  { icon: BarChart3, title: "متابعة تقاريرك", copy: "تقارير أوسع في مراحل التطوير القادمة." },
];

function DashboardPreview() {
  return <div className="af-dashboard" dir="rtl" aria-label="معاينة توضيحية للوحة مالية ببيانات افتراضية">
    <aside className="af-dashboard__sidebar" aria-hidden="true"><b>M</b><span className="active"><PieChart/>نظرة مالية</span><span><Building2/>الشركة</span><span><FileText/>المستند</span><span><BarChart3/>المراجعة</span><span><Landmark/>البنك</span><span><Users/>الفريق</span></aside>
    <div className="af-dashboard__body"><header><div><small>شركة المثال التجارية · نموذج افتراضي</small><strong>نظرة مالية</strong></div><span>يونيو 2026 · <b dir="ltr">{demoAccountNumber}</b></span></header><div className="af-dashboard__stats"><div><small>رصيد البنك</small><b>{money(closingBankBalance)}</b><em>EGP · إقفال الكشف</em></div><div><small>إيداعات البنك</small><b>{money(totalCredits)}</b><em>EGP · ليست كلها إيرادًا</em></div><div><small>مسحوبات البنك</small><b>{money(totalDebits)}</b><em>EGP · 2 حركات</em></div><div><small>صافي ربح المثال</small><b>{money(incomeStatement.profit)}</b><em>EGP · قائمة دخل توضيحية</em></div></div><div className="af-dashboard__charts"><div className="af-dashboard__panel af-dashboard__line"><strong>حركة رصيد البنك</strong><div className="af-chart-grid"><svg viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true"><path className="revenue" d="M0 126 L100 23 L200 49 L300 64 L400 4"/></svg></div><small>افتتاحي {money(openingBankBalance)} ← إقفال {money(closingBankBalance)} EGP</small></div><div className="af-dashboard__panel af-dashboard__review"><strong>حالة المراجعة</strong><span>مطابق <b>02</b></span><span>يحتاج مراجعة <b>01</b></span><span>تحقق من تكرار <b>01</b></span><small>لا ترحيل دون اعتماد بشري</small></div></div><div className="af-dashboard__panel af-dashboard__activity"><strong>حركات من الكشف الافتراضي</strong>{demoTransactions.slice(0, 2).map(item => <div key={item.reference}><span>{item.description}</span><span dir="ltr">{item.credit ? "+" : "−"}{money(item.credit || item.debit)} EGP</span></div>)}</div></div>
  </div>;
}

function Devices() {
  return <div className="af-devices" aria-label="معاينة توضيحية للمنصة على الكمبيوتر والهاتف">
    <div className="af-laptop"><div className="af-laptop__screen"><span className="af-laptop__camera" aria-hidden="true"/><DashboardPreview/></div><div className="af-laptop__hinge" aria-hidden="true"/><div className="af-laptop__base"/></div>
    <div className="mc-hero-float mc-hero-float--account" aria-hidden="true"><Landmark/><span><small>حساب بنكي · مثال</small><strong dir="ltr">{money(closingBankBalance)} EGP</strong></span></div>
    <div className="mc-hero-float mc-hero-float--document" aria-hidden="true"><FileText/><span><strong>كشف حساب</strong><small>4 حركات للمراجعة</small></span><Check/></div>
    <PremiumMobileMockup/><span className="af-preview-note">بيانات الواجهة المعروضة توضيحية وليست حسابات حقيقية</span>
  </div>;
}

function LandingBrand() {
  return <Link className="af-brand" href="/" aria-label="Money Coder — الصفحة الرئيسية"><span className="af-brand__mark" aria-hidden="true"/><span className="af-brand__name"><strong>Money Coder</strong><small>SMART ACCOUNTING</small></span></Link>;
}

function Header({ signedIn }: { signedIn: boolean }) {
  return <header className="af-header"><div className="af-container af-header__inner"><LandingBrand/><nav className="af-header__nav" aria-label="التنقل الرئيسي">{nav.map(([label, href], index) => <Link key={href} className={index === 0 ? "active" : ""} href={href}>{label}</Link>)}</nav><div className="af-header__actions"><Link className="af-gold" href={signedIn ? "/dashboard" : "/auth/register"}>{signedIn ? "لوحة التحكم" : "إنشاء حساب مجاني"}<UserRound/></Link><Link className="af-outline" href={signedIn ? "/dashboard" : "/auth/login"}>{signedIn ? "حسابي" : "تسجيل الدخول"}<UserRound/></Link></div><MobileNav nav={nav} signedIn={signedIn}/></div></header>;
}

export async function ReferenceLanding() {
  const signedIn = Boolean(await getSessionUser());
  const startHref = signedIn ? "/dashboard" : "/auth/register";
  return <div className="af-landing" id="top" dir="rtl"><Header signedIn={signedIn}/><main>
    <section className="af-hero"><div className="af-container af-hero__grid"><div className="af-hero__copy"><span className="af-eyebrow">أساس مالي منظم لشركتك التجارية</span><h1>إدارة مالية <em>أسهل</em> لنمو <span>أسرع</span> لشركتك</h1><p>موني كودر يساعدك على تنظيم بيانات شركتك، فريقها، حساباتها البنكية ومستنداتها في مكان واحد. رحلة المحاسبة المتكاملة ضمن رؤيتنا القادمة.</p><div className="af-hero__buttons"><Link className="af-primary" href={startHref}>ابدأ الآن <ArrowLeft/></Link><Link className="af-outline" href="#about">شاهد جولة سريعة <CirclePlay/></Link></div><div className="af-assurance"><span><ShieldCheck/>صلاحيات واضحة</span><span><FileText/>تنظيم البيانات</span><span><Sparkles/>واجهة عربية</span><span><Headphones/>بداية سهلة</span></div></div><Devices/></div></section>
    <FinancialClarity/>
    <IndustrySolutions/>
    <section className="af-features af-section" id="features"><div className="af-container"><div className="af-heading"><i/><h2>مميزات المنصة</h2><p>كل ما تحتاجه لبدء تنظيم شركتك المالية في مكان واحد</p></div><div className="af-feature-grid">{features.map(({ icon: Icon, title, copy }) => <article className="af-feature" key={title}><span><Icon/></span><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>
    <BankProcessingShowcase/>
    <AccountingJourney/>
    <FactoryFinanceStory/>
    <FinancialControl/>
    <ProductReadiness/>
    <section className="af-steps af-section" id="process"><div className="af-container"><div className="af-heading"><h2>كيف تبدأ؟</h2><p>خطوات واضحة للبدء بتنظيم بيانات شركتك</p></div><div className="af-steps__grid">{steps.map(({ icon: Icon, title, copy }, index) => <article className="af-step" key={title}><span className="af-step__number">{index + 1}</span><span className="af-step__icon"><Icon/></span><div><h3>{title}</h3><p>{copy}</p></div>{index < 3 ? <ChevronLeft className="af-step__arrow"/> : null}</article>)}</div></div></section>
    <section className="af-final" id="contact"><div className="af-container af-final__inner"><div><h2>ابدأ رحلتك مع موني كودر اليوم</h2><p>مساحة أوضح لتنظيم بيانات شركتك التجارية وفريقها.</p></div><Link className="af-gold" href={startHref}>{signedIn ? "افتح لوحة التحكم" : "إنشاء حساب مجاني"}<UserRound/></Link><div className="af-final__notes"><span><Check/>تسجيل مباشر</span><span><LockKeyhole/>صلاحيات واضحة</span><span><TrendingUp/>قابل للتوسع</span></div></div></section>
  </main><footer className="af-footer"><div className="af-container af-footer__inner"><LandingBrand/><nav aria-label="روابط التذييل">{nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav><small>© 2026 Money Coder. جميع الحقوق محفوظة.</small></div></footer></div>;
}
