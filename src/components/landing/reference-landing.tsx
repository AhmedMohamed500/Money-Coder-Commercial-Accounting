import Link from "next/link";
import { ArrowLeft, BarChart3, Building2, Check, ChevronLeft, CirclePlay, FileText, Headphones, Landmark, LockKeyhole, PieChart, ShieldCheck, Sparkles, TrendingUp, UserRound, Users } from "lucide-react";
import { MobileNav } from "@/components/landing/mobile-nav";
import { getSessionUser } from "@/lib/auth";
import "./reference-landing.css";

const nav = [["الرئيسية", "#top"], ["المميزات", "#features"], ["عن المنصة", "#about"], ["كيف تبدأ", "#process"], ["ابدأ الآن", "#contact"]] as const;
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

function DashboardPreview({ showcase = false }: { showcase?: boolean }) {
  return <div className={`af-dashboard ${showcase ? "af-dashboard--showcase" : ""}`} dir="rtl" aria-label="معاينة توضيحية للوحة مالية ببيانات افتراضية">
    <aside className="af-dashboard__sidebar" aria-hidden="true"><b>M</b><span className="active"><PieChart/>لوحة التحكم</span><span><Building2/>الشركات</span><span><FileText/>المستندات</span><span><BarChart3/>التقارير</span><span><Landmark/>الحسابات</span><span><Users/>الفريق</span></aside>
    <div className="af-dashboard__body"><header><div><small>صباح الخير</small><strong>لوحة التحكم</strong></div><span>معاينة توضيحية · 2026</span></header><div className="af-dashboard__stats"><div><small>إجمالي الإيرادات</small><b>1,250,000</b><em>EGP · مثال توضيحي</em></div><div><small>إجمالي المصروفات</small><b>540,000</b><em>EGP · مثال توضيحي</em></div><div><small>صافي الربح</small><b>710,000</b><em>EGP · مثال توضيحي</em></div><div><small>المستندات</small><b>248</b><em>بيانات افتراضية</em></div></div><div className="af-dashboard__charts"><div className="af-dashboard__panel af-dashboard__line"><strong>الإيرادات والمصروفات</strong><div className="af-chart-grid"><svg viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true"><path className="revenue" d="M0 125 L50 114 L100 121 L150 58 L200 93 L250 42 L300 70 L350 35 L400 15"/><path className="expenses" d="M0 132 L50 123 L100 100 L150 108 L200 80 L250 96 L300 63 L350 74 L400 54"/></svg></div><small>يناير　 فبراير　 مارس　 أبريل　 مايو　 يونيو</small></div><div className="af-dashboard__panel af-dashboard__donut"><strong>توزيع المصروفات</strong><div className="af-donut"><span>32%</span></div><small>توزيع توضيحي حسب النوع</small></div></div><div className="af-dashboard__panel af-dashboard__activity"><strong>أحدث الأنشطة</strong><div><span>تحديث بيانات الشركة</span><span>بيانات تجريبية</span></div><div><span>إضافة عضو للفريق</span><span>بيانات تجريبية</span></div></div></div>
  </div>;
}

function Devices() {
  return <div className="af-devices" aria-label="معاينة توضيحية للمنصة على الكمبيوتر والهاتف"><div className="af-laptop"><div className="af-laptop__screen"><DashboardPreview/></div><div className="af-laptop__base"/></div><div className="af-phone"><div className="af-phone__notch"/><div className="af-phone__content" dir="rtl"><div className="af-phone__brand"><b>M</b><span>Money Coder</span></div><p>مرحبًا بك</p><strong>نظرة مالية توضيحية</strong><div className="af-phone__balance"><small>الرصيد المالي · مثال توضيحي</small><b>1,250,000 <span>EGP</span></b><svg viewBox="0 0 180 48" aria-hidden="true"><path d="M0 41 L20 31 L40 35 L60 21 L80 24 L100 17 L120 22 L140 8 L160 12 L180 3"/></svg></div><div className="af-phone__tiles"><span><FileText/>ملفات</span><span><Users/>فريق</span><span><Building2/>شركة</span></div><div className="af-phone__bottom"><PieChart/><FileText/><UserRound/></div></div></div><span className="af-preview-note">بيانات الواجهة المعروضة توضيحية وليست حسابات حقيقية</span></div>;
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
    <section className="af-hero"><div className="af-container af-hero__grid"><div className="af-hero__copy"><span className="af-eyebrow">منصة محاسبية متكاملة للشركات التجارية</span><h1>إدارة مالية <em>أسهل</em> لنمو <span>أسرع</span> لشركتك</h1><p>موني كودر يساعدك على تنظيم بيانات شركتك، فريقها، حساباتها البنكية ومستنداتها في مكان واحد. التقارير المالية المتقدمة قيد التطوير.</p><div className="af-hero__buttons"><Link className="af-primary" href={startHref}>ابدأ الآن <ArrowLeft/></Link><Link className="af-outline" href="#about">شاهد جولة سريعة <CirclePlay/></Link></div><div className="af-assurance"><span><ShieldCheck/>صلاحيات واضحة</span><span><FileText/>تنظيم البيانات</span><span><Sparkles/>واجهة عربية</span><span><Headphones/>بداية سهلة</span></div></div><Devices/></div></section>
    <section className="af-features af-section" id="features"><div className="af-container"><div className="af-heading"><i/><h2>مميزات المنصة</h2><p>كل ما تحتاجه لبدء تنظيم شركتك المالية في مكان واحد</p></div><div className="af-feature-grid">{features.map(({ icon: Icon, title, copy }) => <article className="af-feature" key={title}><span><Icon/></span><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>
    <section className="af-showcase af-section" id="about"><div className="af-container af-showcase__inner"><div className="af-showcase__visual"><DashboardPreview showcase/></div><div className="af-showcase__copy"><h2>لوحة تحكم شاملة وواضحة</h2><p>معاينة توضيحية لتصميم مؤشرات الشركة المالية. الأرقام المعروضة ليست بيانات مستخدمين أو تقارير حية.</p><ul><li><Check/>نظرة منظمة على بيانات الشركة</li><li><Check/>مساحة للحسابات والوثائق</li><li><Check/>صلاحيات واضحة لأعضاء الفريق</li><li><Check/>تقارير أوسع ضمن خطة التطوير</li></ul><Link className="af-gold" href={startHref}>اكتشف مساحة العمل <ArrowLeft/></Link></div></div></section>
    <section className="af-metrics" aria-label="مرتكزات المنصة"><div className="af-container af-metrics__grid"><div><Building2/><strong>شركات متعددة</strong><span>مساحات مستقلة لكل مؤسسة</span></div><div><FileText/><strong>ملفات منظمة</strong><span>وفق صلاحيات الشركة</span></div><div><Landmark/><strong>حسابات بنكية</strong><span>بياناتها ضمن ملف الشركة</span></div><div><ShieldCheck/><strong>وصول مضبوط</strong><span>صلاحيات بحسب الدور</span></div></div></section>
    <section className="af-steps af-section" id="process"><div className="af-container"><div className="af-heading"><h2>كيف تبدأ؟</h2><p>خطوات واضحة للبدء بتنظيم بيانات شركتك</p></div><div className="af-steps__grid">{steps.map(({ icon: Icon, title, copy }, index) => <article className="af-step" key={title}><span className="af-step__number">{index + 1}</span><span className="af-step__icon"><Icon/></span><div><h3>{title}</h3><p>{copy}</p></div>{index < 3 ? <ChevronLeft className="af-step__arrow"/> : null}</article>)}</div></div></section>
    <section className="af-benefits af-section"><div className="af-container"><div className="af-heading"><h2>لماذا تختار موني كودر؟</h2><p>مساحة عمل واضحة لتنظيم بيانات شركتك وفريقها</p></div><div className="af-benefits__grid"><article><span className="af-benefit-icon"><Building2/></span><h3>تنظيم مؤسسي</h3><p>رتّب هوية شركتك وبياناتها الأساسية في مساحة واضحة.</p></article><article><span className="af-benefit-icon"><ShieldCheck/></span><h3>صلاحيات مدروسة</h3><p>حدد أدوار أعضاء الفريق ومن يملك حق الوصول.</p></article><article><span className="af-benefit-icon"><TrendingUp/></span><h3>تطوير تدريجي</h3><p>ابدأ بالوظائف المتاحة وتابع إضافة المزايا القادمة.</p></article></div><p className="af-pricing-note"><span>الأسعار والباقات</span> لم تُعلن بعد؛ ستُعرض بوضوح عند إتاحتها.</p></div></section>
    <section className="af-final" id="contact"><div className="af-container af-final__inner"><div><h2>ابدأ رحلتك مع موني كودر اليوم</h2><p>مساحة أوضح لتنظيم بيانات شركتك التجارية وفريقها.</p></div><Link className="af-gold" href={startHref}>{signedIn ? "افتح لوحة التحكم" : "إنشاء حساب مجاني"}<UserRound/></Link><div className="af-final__notes"><span><Check/>تسجيل مباشر</span><span><LockKeyhole/>صلاحيات واضحة</span><span><TrendingUp/>قابل للتوسع</span></div></div></section>
  </main><footer className="af-footer"><div className="af-container af-footer__inner"><LandingBrand/><nav aria-label="روابط التذييل">{nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav><small>© 2026 Money Coder. جميع الحقوق محفوظة.</small></div></footer></div>;
}
