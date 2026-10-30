import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Building2, Check, CircleCheck, FileText, Landmark, LockKeyhole, ShieldCheck, Smartphone, Users } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { MobileNav } from "./mobile-nav";
import { LandingFaq } from "./landing-faq";
import { HeroDevice, MobileControlExperience } from "./mobile-control-v7";
import { ProductTourV7 } from "./product-tour-v7";
import { SectorExperienceV7, RoleExperienceV7 } from "./sector-experience-v7";
import { V7Motion } from "./v7-motion";
import "./enterprise-v7.css";

const nav = [
  ["الرئيسية", "#top"],
  ["المنصة", "#platform"],
  ["متابعة الموبايل", "#mobile-control"],
  ["الحلول", "#solutions"],
  ["تجربة المحاسبة", "#tour"],
  ["ابدأ الآن", "#start"],
] as const;

function Brand() {
  return <Link className="v7-brand" href="/" aria-label="Money Coder — الصفحة الرئيسية">
    <span className="v7-brand__mark" aria-hidden="true" />
    <span><strong>Money Coder</strong><small>SMART ACCOUNTING</small></span>
  </Link>;
}

function Header({ signedIn }: { signedIn: boolean }) {
  return <header className="v7-header" id="v7-header"><div className="v7-shell v7-header__inner">
    <Brand />
    <nav className="v7-header__nav" aria-label="التنقل الرئيسي">{nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
    <div className="v7-header__actions"><Link className="v7-link" href={signedIn ? "/dashboard" : "/auth/login"}>{signedIn ? "لوحة التحكم" : "تسجيل الدخول"}</Link><Link className="v7-button v7-button--gold" href={signedIn ? "/dashboard" : "/auth/register"}>{signedIn ? "افتح حسابك" : "ابدأ الآن"}<ArrowLeft aria-hidden="true" /></Link></div>
    <MobileNav nav={nav} signedIn={signedIn} />
  </div></header>;
}

function Hero({ startHref }: { startHref: string }) {
  return <section className="v7-hero" aria-labelledby="v7-hero-title"><div className="v7-shell v7-hero__grid">
    <div className="v7-hero__copy"><span className="v7-kicker"><span /> منصة مالية عربية للشركات المصرية</span>
      <h1 id="v7-hero-title">شركتك تحت عينك.<br /><em>في المكتب أو من أي مكان.</em></h1>
      <p>نظّم ملف شركتك وحساباتها البنكية وفريقها وصلاحيات الوصول في مساحة واحدة. تعاون مع مكتب المحاسبة بعد موافقتك على التفويض.</p>
      <div className="v7-hero__actions"><Link className="v7-button v7-button--teal" href={startHref}>ابدأ مع Money Coder <ArrowLeft aria-hidden="true" /></Link><Link className="v7-button v7-button--outline" href="#mobile-control">استكشف التجربة <Smartphone aria-hidden="true" /></Link></div>
      <div className="v7-hero__proof"><span><ShieldCheck aria-hidden="true" /> صلاحيات حسب الدور</span><span><Landmark aria-hidden="true" /> حسابات مسجلة</span><span><Users aria-hidden="true" /> فريق واحد</span></div>
    </div>
    <HeroDevice />
  </div></section>;
}

function AvailableToday({ startHref }: { startHref: string }) {
  return <section className="v7-today v7-section" id="platform" aria-labelledby="v7-today-title" data-v7-reveal><div className="v7-shell">
    <div className="v7-section-head"><div><span className="v7-kicker">ما الذي يمكنك استخدامه اليوم؟</span><h2 id="v7-today-title">أساس شركتك المالي، في مكان منظم.</h2></div><p>بيانات الكيان، الفريق، والحسابات المسجلة مترابطة بصلاحيات واضحة. هذه وظائف المنتج الحالية، وليست وعودًا بمحاسبة آلية.</p></div>
    <div className="v7-today__layout"><div className="v7-today__image"><Image src="/landing/finance-team-review-v4.webp" fill sizes="(max-width: 800px) 100vw, 38vw" alt="فريق يناقش بيانات العمل داخل مكتب" loading="lazy" /><span>إدارة تُبنى على وضوح البيانات</span></div>
      <div className="v7-today__canvas" aria-label="معاينة توضيحية لملف شركة افتراضية"><header><div><span className="v7-status-dot" />ملف الشركة · معاينة توضيحية</div><strong>شركة المثال التجارية</strong></header>
        <div className="v7-today__grid"><article><Building2 aria-hidden="true" /><small>بيانات الشركة</small><strong>ملف واحد منظم</strong><span>الهوية القانونية، العنوان، والإعداد المحاسبي</span></article><article><Landmark aria-hidden="true" /><small>الحسابات البنكية</small><strong>بيانات مسجلة</strong><span>اسم البنك والحساب والعملة؛ بدون رصيد حي</span></article><article><Users aria-hidden="true" /><small>أعضاء الفريق</small><strong>أدوار محددة</strong><span>وصول الأعضاء مرتبط بعضويتهم وصلاحياتهم</span></article><article><LockKeyhole aria-hidden="true" /><small>مكتب المحاسبة</small><strong>تفويض بموافقة</strong><span>طلب المكتب لا يمنح وصولًا قبل قبول الشركة</span></article></div>
        <div className="v7-today__bottom"><span><CircleCheck aria-hidden="true" /> متاح ضمن أساس المنتج الحالي</span><Link href={startHref}>افتح مساحة العمل <ArrowLeft aria-hidden="true" /></Link></div>
      </div></div>
  </div></section>;
}

function Readiness({ startHref }: { startHref: string }) {
  return <section className="v7-readiness v7-section" id="readiness" aria-labelledby="v7-readiness-title" data-v7-reveal><div className="v7-shell v7-readiness__grid"><div><span className="v7-kicker">وضوح قبل القرار</span><h2 id="v7-readiness-title">ابدأ بما يعمل الآن. واستكشف ما نطوّره.</h2><p>تقدر تنشئ ملف شركتك وتنظّم حساباتها المسجلة وأعضاءها وتفويضات المكتب. أمثلة الكشوف والقيود والتقارير في الموقع تصوّر مراحل قادمة، ولا تعالج بيانات شركتك حاليًا.</p><Link className="v7-button v7-button--teal" href={startHref}>ابدأ بتنظيم شركتك <ArrowLeft aria-hidden="true" /></Link></div>
    <div className="v7-readiness__cards"><article><span><Check aria-hidden="true" /> متاح الآن</span><strong>ملف الشركة • الحسابات المسجلة • الأدوار • التفويض</strong><p>عرض المستندات حسب الصلاحيات؛ رفعها يعتمد على تفعيل الخدمة.</p></article><article><span><FileText aria-hidden="true" /> معاينة مستقبلية</span><strong>استخراج كشف البنك • القيود • القوائم • تكاليف المصنع</strong><p>واجهات توضيحية ببيانات افتراضية، بدون استخراج أو ترحيل أو تقارير حية.</p></article></div>
  </div></section>;
}

function Closing({ startHref, signedIn }: { startHref: string; signedIn: boolean }) {
  return <section className="v7-closing" id="start" aria-labelledby="v7-closing-title" data-v7-reveal><div className="v7-shell v7-closing__inner"><div><span className="v7-kicker">ابدأ بخطوة واضحة</span><h2 id="v7-closing-title">خلّي بيانات شركتك أقرب للقرار.</h2><p>أنشئ ملف الشركة، سجّل حساباتها، ونظّم الفريق. استكشف المعاينات المستقبلية مع فصل واضح بينها وبين الوظائف المتاحة اليوم.</p><div className="v7-closing__actions"><Link className="v7-button v7-button--gold" href={startHref}>{signedIn ? "افتح لوحة التحكم" : "ابدأ مع Money Coder"}<ArrowLeft aria-hidden="true" /></Link><Link className="v7-button v7-button--ghost" href="#tour">شاهد تجربة المحاسبة</Link></div></div><div className="v7-closing__visual" aria-hidden="true"><span className="v7-closing__ring" /><div><strong>Money Coder</strong><span>الشركة <Check /></span><span>الحسابات المسجلة <Check /></span><span>الفريق والتفويض <Check /></span><small>مساحة واحدة · رؤية أوضح</small></div></div></div></section>;
}

export async function EnterpriseV7Landing() {
  const signedIn = Boolean(await getSessionUser());
  const startHref = signedIn ? "/dashboard" : "/auth/register";
  return <div className="v7" id="top" dir="rtl"><V7Motion /><Header signedIn={signedIn} /><main>
    <Hero startHref={startHref} />
    <AvailableToday startHref={startHref} />
    <MobileControlExperience startHref={startHref} />
    <ProductTourV7 />
    <SectorExperienceV7 />
    <RoleExperienceV7 />
    <Readiness startHref={startHref} />
    <LandingFaq />
    <Closing startHref={startHref} signedIn={signedIn} />
  </main><footer className="v7-footer"><div className="v7-shell v7-footer__inner"><Brand /><nav aria-label="روابط التذييل">{nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav><small>© 2026 Money Coder. جميع الحقوق محفوظة.</small></div></footer></div>;
}
