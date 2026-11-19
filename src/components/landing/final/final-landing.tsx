"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Cloud,
  Database,
  Factory,
  FileCheck2,
  FileSpreadsheet,
  FolderLock,
  Gauge,
  HardHat,
  Landmark,
  LockKeyhole,
  Menu,
  MonitorSmartphone,
  Network,
  NotebookTabs,
  Play,
  ReceiptText,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Store,
  Upload,
  Users,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import "./final-landing.css";

type OfficeMode = "single" | "multi";
type IndustryId = "contracting" | "trade" | "manufacturing" | "services" | "office";

const features = [
  { icon: ScanSearch, title: "التدقيق والأدلة", note: "متاح جزئيًا", copy: "مستندات خاصة وسجل تدقيق داخل مساحة الشركة." },
  { icon: ShieldCheck, title: "الرقابة المالية", note: "ضمن Financial Twin", copy: "نقاط مراجعة واعتماد قبل إغلاق الدورة." },
  { icon: Sparkles, title: "الأتمتة الذكية", note: "ضمن Financial Twin", copy: "استخراج منظم مع مراجعة بشرية قبل الاعتماد." },
  { icon: NotebookTabs, title: "القيود والترحيل", note: "ضمن Financial Twin", copy: "قيود مزدوجة وترحيل منضبط وقابل للتتبع." },
  { icon: BookOpenCheck, title: "دفتر الأستاذ", note: "ضمن Financial Twin", copy: "حركة الحساب ورصيده من مصدر واحد واضح." },
  { icon: BarChart3, title: "التقارير والقوائم", note: "ضمن Financial Twin", copy: "ميزان مراجعة وقوائم بعد اكتمال المحرك المحاسبي." },
] as const;

const workflow = [
  { icon: Upload, number: "01", title: "رفع الملفات", copy: "PDF أو Excel", status: "متاح الآن" },
  { icon: FileSpreadsheet, number: "02", title: "تنظيم البيانات", copy: "استخراج ومطابقة", status: "ضمن Financial Twin" },
  { icon: Database, number: "03", title: "إدخال منضبط", copy: "داخل الشركة المعنية", status: "ضمن Financial Twin" },
  { icon: ScanSearch, number: "04", title: "مراجعة الأدلة", copy: "تحقق واستثناءات", status: "ضمن Financial Twin" },
  { icon: ClipboardCheck, number: "05", title: "اعتماد وترحيل", copy: "بصلاحيات واضحة", status: "ضمن Financial Twin" },
  { icon: BarChart3, number: "06", title: "ميزان وتقارير", copy: "بعد اكتمال الدورة", status: "ضمن Financial Twin" },
] as const;

const industries: Array<{ id: IndustryId; label: string; icon: typeof HardHat; image: string; copy: string }> = [
  { id: "contracting", label: "المقاولات", icon: HardHat, image: "/landing/global-skyline-v10.webp", copy: "مشروعات وعهد ومستخلصات في سياق واحد." },
  { id: "trade", label: "التجارة والتوزيع", icon: Store, image: "/landing/commercial-warehouse-v5.webp", copy: "موردون وتحصيلات وحركة تشغيل يومية." },
  { id: "manufacturing", label: "التصنيع والإنتاج", icon: Factory, image: "/landing/factory-cutaway-v2.webp", copy: "دورة تشغيل ومخزون وتكاليف تحتاج أدلة واضحة." },
  { id: "services", label: "الخدمات", icon: BriefcaseBusiness, image: "/landing/global-office-v10.webp", copy: "عقود وفواتير ومصروفات بفريق متعدد الأدوار." },
  { id: "office", label: "مكاتب المحاسبة", icon: Landmark, image: "/landing/finance-team-review-v4.webp", copy: "علاقات عملاء وتفويضات وفصل بيانات كل شركة." },
];

const roles = [
  { image: "/landing/role-owner-v5.webp", title: "مالك الشركة", icon: Building2, points: ["رؤية منظمة لملف الشركة", "التحكم في الوصول والتفويض", "متابعة ما يحتاج قرارًا"] },
  { image: "/landing/role-accountant-v5.webp", title: "المحاسب", icon: ReceiptText, points: ["العمل ضمن صلاحيات محددة", "مراجعة المستندات المتاحة", "توثيق مصدر كل حركة"] },
  { image: "/landing/role-finance-v5.webp", title: "المدير المالي", icon: Gauge, points: ["متابعة الصورة المالية", "مراجعة الاستثناءات", "الاستعداد للتحليل والقرار"] },
] as const;

const controls = [
  { icon: FolderLock, title: "عزل بيانات الشركات", copy: "كل شركة داخل نطاق بيانات مستقل." },
  { icon: Users, title: "صلاحيات حسب الدور", copy: "الوصول مرتبط بعضوية وصلاحية محددة." },
  { icon: FileCheck2, title: "أثر قابل للمراجعة", copy: "سجل تدقيق للأحداث المهمة داخل النظام." },
  { icon: LockKeyhole, title: "ملفات خاصة", copy: "الوصول إلى المستندات عبر مسار محمي." },
] as const;

function Brand() {
  return (
    <Link className="mcf-brand" href="/" aria-label="Money Coder — الصفحة الرئيسية">
      <span className="mcf-brand-mark"><Image src="/landing/money-coder-mark-v6-1.png" alt="" fill sizes="54px" priority /></span>
      <span><strong>Money Coder</strong><small>Commercial Accounting</small></span>
    </Link>
  );
}

function Header({ signedIn }: { signedIn: boolean }) {
  const startHref = signedIn ? "/dashboard" : "/auth/register";
  return (
    <header className="mcf-header">
      <div className="mcf-shell mcf-header-inner">
        <Brand />
        <nav className="mcf-nav" aria-label="التنقل الرئيسي">
          <a href="#top">الرئيسية</a>
          <a href="#product">المنتج</a>
          <a href="#offices">مكاتب المحاسبة</a>
          <a href="#workflow">كيف يعمل</a>
          <a href="#industries">القطاعات</a>
          <a href="#roles">الأدوار</a>
        </nav>
        <div className="mcf-header-actions">
          <a className="mcf-button mcf-button-ghost" href="#product"><Play size={16} fill="currentColor" /> تجربة توضيحية</a>
          <Link className="mcf-button mcf-button-gold" href={startHref}>{signedIn ? "افتح لوحتك" : "ابدأ مجانًا"}</Link>
        </div>
        <details className="mcf-menu">
          <summary aria-label="فتح القائمة"><Menu size={24} /><X className="mcf-menu-close" size={24} /></summary>
          <nav aria-label="قائمة الموبايل">
            <a href="#product">المنتج</a><a href="#offices">مكاتب المحاسبة</a><a href="#workflow">كيف يعمل</a><a href="#industries">القطاعات</a><a href="#roles">الأدوار</a>
            <Link href={signedIn ? "/dashboard" : "/auth/login"}>{signedIn ? "لوحة التحكم" : "تسجيل الدخول"}</Link>
            <Link className="mcf-menu-cta" href={startHref}>{signedIn ? "افتح لوحتك" : "ابدأ مجانًا"}</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

function MiniChart() {
  return (
    <svg className="mcf-chart" viewBox="0 0 360 150" role="img" aria-label="رسم توضيحي لحركة مالية افتراضية">
      <defs><linearGradient id="mcfArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#14c8aa" stopOpacity=".4" /><stop offset="1" stopColor="#14c8aa" stopOpacity="0" /></linearGradient></defs>
      <path className="mcf-grid-line" d="M10 30H350M10 72H350M10 114H350" />
      <path className="mcf-chart-area" d="M10 128L55 105L96 111L140 72L182 84L224 52L266 62L309 26L350 34V145H10Z" />
      <path className="mcf-chart-stroke" d="M10 128L55 105L96 111L140 72L182 84L224 52L266 62L309 26L350 34" />
      <circle cx="309" cy="26" r="5" />
    </svg>
  );
}

function DashboardScreen({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`mcf-dashboard ${compact ? "is-compact" : ""}`} aria-label="واجهة مالية توضيحية ببيانات افتراضية">
      <aside>
        <span className="mcf-dash-logo">MC</span>
        <b>لوحة التحكم</b>
        <span className="is-active"><Gauge size={13} /> نظرة عامة</span>
        <span><ReceiptText size={13} /> القيود اليومية</span>
        <span><BookOpenCheck size={13} /> دفتر الأستاذ</span>
        <span><BarChart3 size={13} /> التقارير</span>
      </aside>
      <div className="mcf-dash-content">
        <header><span><b>شركة الأفق التجارية</b><small>بيانات افتراضية للعرض</small></span><i /><i /></header>
        <div className="mcf-kpis">
          <span><small>إيرادات الفترة</small><b>12,850,000</b></span>
          <span><small>إجمالي المصروفات</small><b>5,340,000</b></span>
          <span><small>صافي توضيحي</small><b>7,510,000</b></span>
        </div>
        <div className="mcf-dash-grid">
          <div className="mcf-dash-chart"><small>اتجاه الأداء المالي — مثال توضيحي</small><MiniChart /></div>
          <div className="mcf-donut"><span><b>58%</b><small>مراجَع</small></span></div>
        </div>
      </div>
    </div>
  );
}

function Hero({ signedIn }: { signedIn: boolean }) {
  const startHref = signedIn ? "/dashboard" : "/auth/register";
  return (
    <section id="top" className="mcf-hero" aria-labelledby="mcf-title">
      <div className="mcf-hero-glow" aria-hidden="true" />
      <div className="mcf-shell mcf-hero-grid">
        <div className="mcf-hero-copy">
          <span className="mcf-eyebrow"><i /> FINANCIAL TWIN PLATFORM <i /></span>
          <p className="mcf-vision-label">رؤية المنتج القادمة، مبنية فوق مساحة العمل الحالية</p>
          <h1 id="mcf-title">من القيد اليومي إلى<br /><em>القوائم المالية المتكاملة</em></h1>
          <p className="mcf-lead">Money Coder يجمع مساحة الشركة، الفريق، التفويضات والمستندات اليوم؛ ويعرض بوضوح كيف ستصبح طبقة Financial Twin مسارًا محاسبيًا مترابطًا وقابلًا للمراجعة.</p>
          <div className="mcf-hero-actions">
            <Link className="mcf-button mcf-button-gold mcf-button-lg" href={startHref}>{signedIn ? "افتح مساحة شركتك" : "ابدأ شركتك الآن"}<ArrowLeft size={19} /></Link>
            <a className="mcf-button mcf-button-ghost mcf-button-lg" href="#workflow"><Play size={17} fill="currentColor" /> شاهد كيف يعمل</a>
          </div>
          <div className="mcf-hero-trust" aria-label="مزايا المنصة الحالية">
            <span><ShieldCheck /> وصول آمن</span><span><Cloud /> جاهز للتوسع</span><span><MonitorSmartphone /> متجاوب</span><span><Zap /> تجربة واضحة</span>
          </div>
        </div>
        <div className="mcf-device-stage">
          <div className="mcf-monitor"><div className="mcf-monitor-screen"><DashboardScreen /></div><div className="mcf-monitor-neck" /><div className="mcf-monitor-base" /></div>
          <div className="mcf-tablet"><div><span className="mcf-tablet-head">ميزان المراجعة <small>تصور قادم</small></span>{["النقدية والبنوك", "العملاء", "الموردون", "المصروفات"].map((name, index) => <span className="mcf-table-row" key={name}><b>{name}</b><i>{["2,170,000", "3,420,000", "1,280,000", "870,000"][index]}</i></span>)}</div></div>
          <div className="mcf-phone"><span className="mcf-phone-notch" /><b>الموجز المالي</b><small>بيانات توضيحية</small><div className="mcf-phone-bars"><i /><i /><i /><i /><i /></div><strong>7.51M</strong><span>صافي توضيحي</span></div>
          <div className="mcf-stage-note"><CheckCircle2 size={16} /> كل الأرقام المعروضة افتراضية وليست بيانات عملاء.</div>
        </div>
      </div>
      <div id="product" className="mcf-shell mcf-feature-rail">
        {features.map(({ icon: Icon, title, note }) => <article key={title}><Icon /><strong>{title}</strong><small>{note}</small></article>)}
      </div>
    </section>
  );
}

function Offices() {
  const [mode, setMode] = useState<OfficeMode>("multi");
  const companies = [
    ["شركة النيل التجارية", "جاهزة للمراجعة", "good"],
    ["دلتا للصناعات", "مستندات جديدة", "warn"],
    ["أفق للتوزيع", "التفويض نشط", "good"],
    ["رؤية للخدمات", "بانتظار الموافقة", "wait"],
  ] as const;
  return (
    <section id="offices" className="mcf-office-section" aria-labelledby="mcf-office-title">
      <div className="mcf-shell">
        <div className="mcf-office-card">
          <div className="mcf-office-media">
            <Image src="/landing/finance-team-review-v4.webp" alt="فريق مالي يراجع تقارير على حاسوب، مشهد توضيحي" fill sizes="(max-width: 900px) 100vw, 43vw" />
            <span>مشهد توضيحي</span>
            <div className="mcf-company-panel" aria-label="معاينة إدارة شركات العملاء">
              <header><span><UsersRound size={17} /> مكتب المحاسبة</span><small>بيانات افتراضية</small></header>
              {companies.map(([name, status, tone]) => <div key={name}><span><b>{name}</b><small>{status}</small></span><i className={tone}><Check size={12} /></i></div>)}
            </div>
          </div>
          <div className="mcf-office-copy">
            <span className="mcf-section-kicker">حل مخصص لمكاتب المحاسبة</span>
            <h2 id="mcf-office-title">إدارة ومراجعة عدة شركات في مكان واحد</h2>
            <p>النسخة الحالية تدعم علاقات المكتب مع شركات العملاء، التفويض، إسناد الموظفين، وعزل بيانات كل شركة. أما الاعتمادات المحاسبية والتقارير المجمعة فموضحة هنا كرؤية قادمة وليست وظيفة منشورة.</p>
            <div className="mcf-office-tabs" role="tablist" aria-label="طريقة عمل مكتب المحاسبة">
              <button type="button" role="tab" aria-selected={mode === "single"} onClick={() => setMode("single")}>العمل مع شركة واحدة</button>
              <button type="button" role="tab" aria-selected={mode === "multi"} onClick={() => setMode("multi")}>إدارة عدة شركات</button>
            </div>
            <div className="mcf-office-workflow" role="tabpanel">
              {mode === "single" ? <>
                <strong><Building2 /> ملف شركة واحدة تحت المراجعة</strong>
                <ul>
                  <li className="is-ready"><CheckCircle2 /> مراجعة المستندات المسموح بها <small>متاح الآن</small></li>
                  <li><ClipboardCheck /> مراجعة واعتماد المعاملات <small>ضمن Financial Twin</small></li>
                  <li><BarChart3 /> مراجعة ميزان المراجعة والقوائم <small>ضمن Financial Twin</small></li>
                </ul>
              </> : <>
                <strong><Network /> محفظة شركات العملاء</strong>
                <ul>
                  <li className="is-ready"><CheckCircle2 /> علاقات عدة شركات وفتح كل شركة حسب التفويض <small>متاح الآن</small></li>
                  <li className="is-ready"><FolderLock /> عزل بيانات كل شركة وإسناد موظفي المكتب <small>متاح الآن</small></li>
                  <li><Gauge /> متابعة المراجعات والاعتمادات عبر الشركات <small>ضمن Financial Twin</small></li>
                  <li><BarChart3 /> تقارير منفردة ومجمعة عبر الشركات <small>ضمن Financial Twin</small></li>
                </ul>
              </>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Workflow() {
  return (
    <section id="workflow" className="mcf-section mcf-workflow" aria-labelledby="mcf-workflow-title">
      <div className="mcf-shell">
        <div className="mcf-section-heading"><span>دورة موثقة خطوة بخطوة</span><h2 id="mcf-workflow-title">رحلة العمل داخل Money Coder</h2><p>المسار المستهدف من الملف إلى التقارير، مع توضيح المرحلة المتاحة اليوم وما يدخل ضمن Financial Twin.</p></div>
        <div className="mcf-workflow-grid">
          {workflow.map(({ icon: Icon, number, title, copy, status }, index) => <article key={title} className={status === "متاح الآن" ? "is-ready" : ""}>
            <span className="mcf-step-number">{number}</span><Icon /><strong>{title}</strong><p>{copy}</p><small>{status}</small>{index < workflow.length - 1 && <ChevronLeft className="mcf-step-arrow" aria-hidden="true" />}
          </article>)}
        </div>
      </div>
    </section>
  );
}

function Industries() {
  const [active, setActive] = useState<IndustryId>("trade");
  return (
    <section id="industries" className="mcf-section mcf-industries" aria-labelledby="mcf-industries-title">
      <div className="mcf-shell">
        <div className="mcf-section-heading"><span>سياق مختلف لكل نشاط</span><h2 id="mcf-industries-title">مناسب لمختلف القطاعات</h2><p>الواجهة تتكيف مع أسئلة النشاط، بينما تظل قواعد الوصول وعزل البيانات واحدة.</p></div>
        <div className="mcf-industry-grid" role="list">
          {industries.map(({ id, label, icon: Icon, image, copy }) => <button type="button" key={id} className={active === id ? "is-active" : ""} onClick={() => setActive(id)} aria-pressed={active === id}>
            <Image src={image} alt="" fill sizes="(max-width: 700px) 80vw, 20vw" /><span><Icon /><strong>{label}</strong><small>{copy}</small></span>
          </button>)}
        </div>
      </div>
    </section>
  );
}

function Roles() {
  return (
    <section id="roles" className="mcf-section mcf-roles" aria-labelledby="mcf-roles-title">
      <div className="mcf-shell">
        <div className="mcf-section-heading"><span>كل دور يرى ما يحتاجه</span><h2 id="mcf-roles-title">حل متكامل لفريق شركتك</h2><p>مساحة مشتركة وحدود وصول واضحة بدل تداول البيانات خارج النظام.</p></div>
        <div className="mcf-role-grid">
          {roles.map(({ image, title, icon: Icon, points }) => <article key={title}>
            <div className="mcf-role-image"><Image src={image} alt={`مشهد توضيحي لدور ${title}`} fill sizes="(max-width: 760px) 100vw, 33vw" /></div>
            <div><span className="mcf-role-title"><Icon /><strong>{title}</strong></span><ul>{points.map(point => <li key={point}><Check />{point}</li>)}</ul></div>
          </article>)}
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  return (
    <section className="mcf-section mcf-benefits" aria-labelledby="mcf-benefits-title">
      <div className="mcf-shell">
        <div className="mcf-section-heading"><span>نظام واحد ومسار أوضح</span><h2 id="mcf-benefits-title">لماذا Money Coder؟</h2></div>
        <div className="mcf-benefit-layout">
          <div className="mcf-benefit-cards">
            <article><Zap /><strong>سرعة وكفاءة</strong><p>ملف الشركة والفريق والتفويض في مكان واحد.</p></article>
            <article><Network /><strong>مرونة وتوسع</strong><p>شركة منفردة أو مكتب يتعامل مع عدة عملاء.</p></article>
            <article><Sparkles /><strong>أتمتة منضبطة</strong><p>الرؤية القادمة تبقي المراجعة البشرية في المسار.</p></article>
            <article><ShieldCheck /><strong>رقابة وامتثال</strong><p>صلاحيات وعزل بيانات وسجل للأحداث المهمة.</p></article>
          </div>
          <div className="mcf-laptop"><div className="mcf-laptop-screen"><DashboardScreen compact /></div><div className="mcf-laptop-base" /></div>
        </div>
        <div className="mcf-control-strip" aria-label="ضوابط مثبتة داخل النظام">
          <div><span>ضوابط مثبتة داخل النظام</span><strong>بدون شهادات عملاء أو ادعاءات تسويقية غير موثقة</strong></div>
          {controls.map(({ icon: Icon, title, copy }) => <article key={title}><Icon /><span><strong>{title}</strong><small>{copy}</small></span></article>)}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ signedIn }: { signedIn: boolean }) {
  const startHref = signedIn ? "/dashboard" : "/auth/register";
  return (
    <section className="mcf-final" aria-labelledby="mcf-final-title">
      <div className="mcf-final-shape" aria-hidden="true" />
      <div className="mcf-shell mcf-final-grid">
        <div className="mcf-final-devices"><div className="mcf-final-monitor"><DashboardScreen compact /></div><div className="mcf-final-mobile"><BarChart3 /><strong>الموجز</strong><span>7.51M</span><small>بيانات افتراضية</small></div></div>
        <div><span className="mcf-eyebrow"><i /> MONEY CODER <i /></span><h2 id="mcf-final-title">ابدأ الآن وجرّب المنصة بنفسك</h2><p>أنشئ شركتك، نظّم ملفها وفريقها وصلاحياتها، واستكشف الرؤية المالية القادمة بوضوح كامل.</p><ul><li><Check /> إعداد أولي واضح</li><li><Check /> مساحة عمل جاهزة</li><li><Check /> بدون ادعاء وظائف غير منشورة</li></ul><Link className="mcf-button mcf-button-gold mcf-button-xl" href={startHref}>{signedIn ? "افتح مساحة شركتك" : "ابدأ تجربتك المجانية الآن"}<ArrowLeft /></Link></div>
      </div>
    </section>
  );
}

function Footer({ signedIn }: { signedIn: boolean }) {
  return (
    <footer className="mcf-footer">
      <div className="mcf-shell mcf-footer-grid">
        <div><Brand /><p>منصة محاسبية مصرية عربية لإدارة مساحة الشركة، الفريق، التفويضات، والمستندات — مع رؤية واضحة لـ Financial Twin.</p></div>
        <nav aria-label="روابط الشركة"><strong>الشركة</strong><a href="#product">المنتج</a><a href="#offices">مكاتب المحاسبة</a><a href="#industries">القطاعات</a></nav>
        <nav aria-label="روابط الموارد"><strong>الموارد</strong><a href="#workflow">كيف يعمل</a><a href="#roles">الأدوار</a><Link href={signedIn ? "/dashboard" : "/auth/login"}>{signedIn ? "لوحة التحكم" : "تسجيل الدخول"}</Link></nav>
        <div className="mcf-footer-note"><ShieldCheck /><span><strong>الوضوح جزء من المنتج</strong><small>المعاينات المالية في هذه الصفحة بيانات افتراضية، والوظائف القادمة مميزة بوضوح.</small></span></div>
      </div>
      <div className="mcf-shell mcf-footer-bottom"><span>© 2026 Money Coder. جميع الحقوق محفوظة.</span><span>Commercial Accounting · Cairo, Egypt</span></div>
    </footer>
  );
}

export function FinalLanding({ signedIn }: { signedIn: boolean }) {
  return <div className="mcf" dir="rtl"><Header signedIn={signedIn} /><main><Hero signedIn={signedIn} /><Offices /><Workflow /><Industries /><Roles /><Benefits /><FinalCta signedIn={signedIn} /></main><Footer signedIn={signedIn} /></div>;
}
