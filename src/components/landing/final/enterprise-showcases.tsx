"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpLeft,
  BadgeCheck,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Database,
  Eye,
  FileCheck2,
  FileSearch,
  FolderLock,
  Gauge,
  Landmark,
  LockKeyhole,
  PieChart,
  ReceiptText,
  ScanLine,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Upload,
  UserCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import "./enterprise-showcases.css";

type TwinView = "overview" | "revenue" | "expenses" | "profit";

const twinViews = {
  overview: {
    label: "النظرة المالية",
    eyebrow: "صورة متوازنة للأداء",
    headline: "12,850,000",
    delta: "+12.4%",
    accent: "#26d7c4",
    bars: [42, 56, 49, 68, 62, 81, 76, 94],
    line: "12,70 55,58 98,63 141,39 184,46 227,25 270,34 313,12",
    kpis: [["إجمالي الإيرادات", "7,510,000", "+8.6%"], ["إجمالي المصروفات", "5,340,000", "-2.1%"], ["صافي الربح", "2,170,000", "+19.5%"]],
  },
  revenue: {
    label: "الإيرادات",
    eyebrow: "اتجاه الإيراد التجريبي",
    headline: "7,510,000",
    delta: "+8.6%",
    accent: "#22c8ae",
    bars: [35, 44, 58, 51, 72, 78, 86, 96],
    line: "12,74 55,67 98,53 141,58 184,35 227,29 270,20 313,10",
    kpis: [["مبيعات تشغيلية", "5,120,000", "+9.2%"], ["إيرادات خدمات", "1,430,000", "+5.1%"], ["إيرادات أخرى", "960,000", "+3.4%"]],
  },
  expenses: {
    label: "المصروفات",
    eyebrow: "توزيع المصروف التجريبي",
    headline: "5,340,000",
    delta: "-2.1%",
    accent: "#f6bd45",
    bars: [78, 71, 67, 73, 61, 57, 53, 49],
    line: "12,22 55,29 98,35 141,27 184,43 227,49 270,55 313,61",
    kpis: [["تكلفة التشغيل", "2,640,000", "49.4%"], ["مصروفات إدارية", "1,720,000", "32.2%"], ["مصروفات أخرى", "980,000", "18.4%"]],
  },
  profit: {
    label: "صافي الربح",
    eyebrow: "هامش الربح التجريبي",
    headline: "2,170,000",
    delta: "+19.5%",
    accent: "#52e1ce",
    bars: [28, 41, 37, 55, 60, 72, 79, 91],
    line: "12,77 55,62 98,68 141,50 184,44 227,31 270,23 313,11",
    kpis: [["الربح التشغيلي", "2,420,000", "+17.8%"], ["تعديلات تجريبية", "250,000", "عرض فقط"], ["هامش الربح", "28.9%", "+4.2%"]],
  },
} as const;

function DemoFlag({ future = true }: { future?: boolean }) {
  return <span className={future ? "mce-demo-flag is-future" : "mce-demo-flag is-live"}>{future ? "معاينة Financial Twin" : "متاح حاليًا"}</span>;
}

function FinancialChart({ view }: { view: TwinView }) {
  const data = twinViews[view];
  return (
    <div className="mce-chart" style={{ "--chart-accent": data.accent } as CSSProperties} aria-label={`رسم تجريبي لعرض ${data.label}`}>
      <div className="mce-chart-bars" aria-hidden="true">
        {data.bars.map((height, index) => <i key={`${view}-${index}`} style={{ height: `${height}%` }} />)}
      </div>
      <svg viewBox="0 0 325 90" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id={`area-${view}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={data.accent} stopOpacity=".32" /><stop offset="1" stopColor={data.accent} stopOpacity="0" /></linearGradient></defs>
        <path d={`M ${data.line} L313,90 L12,90 Z`} fill={`url(#area-${view})`} />
        <polyline points={data.line} fill="none" stroke={data.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mce-chart-axis" aria-hidden="true"><span>يناير</span><span>مارس</span><span>مايو</span><span>يوليو</span><span>سبتمبر</span><span>نوفمبر</span></div>
    </div>
  );
}

export function FinancialTwinShowcase() {
  const [view, setView] = useState<TwinView>("overview");
  const data = twinViews[view];
  const keys = Object.keys(twinViews) as TwinView[];
  return (
    <section id="financial-twin" className="mce-section mce-twin" aria-labelledby="mce-twin-title">
      <div className="mce-shell">
        <div className="mce-heading mce-heading-light">
          <DemoFlag />
          <h2 id="mce-twin-title">اختبر صورة مالية تتغير أمامك</h2>
          <p>واجهة تفاعلية ببيانات تجريبية توضّح اتجاه Financial Twin القادم، وليست تقارير تشغيلية من حساب عميل.</p>
        </div>
        <div className="mce-dashboard-frame">
          <aside className="mce-dashboard-side" aria-label="قائمة العرض التجريبي">
            <div className="mce-dashboard-brand"><BarChart3 /><span><strong>Money Coder</strong><small>Financial Twin</small></span></div>
            <div className="mce-dashboard-nav"><span className="is-active"><Gauge /> لوحة المؤشرات</span><span><ReceiptText /> الحركة المالية</span><span><FileSearch /> الأدلة والمستندات</span><span><ShieldCheck /> المراجعة والرقابة</span></div>
            <div className="mce-dashboard-trust"><LockKeyhole /><span><strong>بيانات عرض فقط</strong><small>لا تتصل ببيانات Production</small></span></div>
          </aside>
          <div className="mce-dashboard-main">
            <div className="mce-dashboard-top"><div><span>شركة النيل التجارية</span><small>الفترة: يناير — ديسمبر 2026</small></div><DemoFlag /></div>
            <div className="mce-view-tabs" role="tablist" aria-label="مؤشرات العرض المالي">
              {keys.map(key => <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)}>{twinViews[key].label}</button>)}
            </div>
            <div className="mce-dashboard-summary">
              <div className="mce-main-kpi"><span>{data.eyebrow}</span><strong>{data.headline} <small>ج.م</small></strong><em><TrendingUp /> {data.delta} مقارنة بالفترة السابقة</em></div>
              <div className="mce-mini-gauge"><div><span>28.9%</span></div><small>هامش تجريبي</small></div>
              <div className="mce-evidence-score"><ShieldCheck /><span><strong>94%</strong><small>اكتمال مستندات العرض</small></span></div>
            </div>
            <FinancialChart view={view} />
            <div className="mce-kpi-grid">{data.kpis.map(([label, value, delta]) => <article key={label}><span>{label}</span><strong>{value} <small>ج.م</small></strong><em>{delta}</em></article>)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

const journeySteps = [
  { icon: Upload, title: "رفع PDF أو Excel", status: "متاح الآن", live: true, copy: "رفع خاص داخل نطاق الشركة مع تحقق من النوع والحجم.", panel: "يتم إنشاء تذكرة رفع موقعة وربط الملف بالشركة وصلاحية المستخدم." },
  { icon: ScanLine, title: "استخراج البيانات", status: "ضمن Financial Twin", live: false, copy: "استخراج منظم للحقول والصفوف من المستند.", panel: "هذه المرحلة عرض للاتجاه المستقبلي ولا تعمل حاليًا كمحرك استخراج محاسبي." },
  { icon: Database, title: "التحقق والمطابقة", status: "ضمن Financial Twin", live: false, copy: "فحص القيم والتواريخ والازدواجية والاستثناءات.", panel: "ستظهر الاستثناءات للمراجع البشري قبل أي اعتماد أو ترحيل." },
  { icon: FileSearch, title: "المراجعة", status: "متاح جزئيًا", live: true, copy: "عرض المستندات وسجل الأحداث متاح؛ مراجعة القيود مستقبلية.", panel: "الصلاحيات الحالية تسمح بعرض المستندات وإدارتها مع سجل تدقيق." },
  { icon: ClipboardCheck, title: "الاعتماد", status: "ضمن Financial Twin", live: false, copy: "نقاط اعتماد واضحة حسب الدور قبل الترحيل.", panel: "معاينة لمسار اعتماد مستقبلي؛ لا توجد حاليًا دورة اعتماد قيود تشغيلية." },
  { icon: FileCheck2, title: "الترحيل المحاسبي", status: "ضمن Financial Twin", live: false, copy: "ترحيل القيد المزدوج بعد استيفاء الضوابط.", panel: "محرك القيد المزدوج والترحيل جزء من خارطة Financial Twin وليس وظيفة منشورة." },
  { icon: BarChart3, title: "التقارير المالية", status: "ضمن Financial Twin", live: false, copy: "ميزان مراجعة وقوائم بعد اكتمال الدورة.", panel: "الأرقام الظاهرة في الواجهة تجريبية ولا تمثل قوائم مالية تشغيلية." },
] as const;

export function DocumentJourney() {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const step = journeySteps[active];

  useEffect(() => {
    const root = listRef.current;
    if (!root || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(Number((visible.target as HTMLElement).dataset.journeyStep));
    }, { rootMargin: "-28% 0px -52% 0px", threshold: [0.2, 0.55, 0.8] });
    root.querySelectorAll<HTMLElement>("[data-journey-step]").forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const select = (index: number, focus = false) => {
    const next = (index + journeySteps.length) % journeySteps.length;
    setActive(next);
    const button = listRef.current?.querySelector<HTMLButtonElement>(`[data-journey-step="${next}"]`);
    if (focus) button?.focus();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    button?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
  };

  return (
    <section id="workflow" className="mce-section mce-journey" aria-labelledby="mce-journey-title">
      <div className="mce-shell">
        <div className="mce-heading"><span className="mce-kicker">رحلة المستند المحاسبي</span><h2 id="mce-journey-title">من الملف إلى التقرير — مع توضيح ما يعمل الآن</h2><p>اختر مرحلة أو مرّر داخل الرحلة. تتغير لوحة الشرح مع الحفاظ على تمييز صريح بين الوظائف الحالية والمستقبلية.</p></div>
        <div className="mce-journey-layout">
          <div className="mce-journey-steps" ref={listRef} role="list" onKeyDown={event => {
            if (event.key === "ArrowDown" || event.key === "ArrowLeft") { event.preventDefault(); select(active + 1, true); }
            if (event.key === "ArrowUp" || event.key === "ArrowRight") { event.preventDefault(); select(active - 1, true); }
            if (event.key === "Home") { event.preventDefault(); select(0, true); }
            if (event.key === "End") { event.preventDefault(); select(journeySteps.length - 1, true); }
          }}>
            {journeySteps.map(({ icon: Icon, title, status, live, copy }, index) => <button key={title} type="button" data-journey-step={index} className={active === index ? "is-active" : ""} aria-pressed={active === index} onClick={() => select(index)}><span className="mce-step-no">{String(index + 1).padStart(2, "0")}</span><span className="mce-step-icon"><Icon /></span><span className="mce-step-copy"><strong>{title}</strong><small>{copy}</small><em className={live ? "is-live" : "is-future"}>{status}</em></span><ChevronLeft /></button>)}
          </div>
          <aside className="mce-journey-panel" aria-live="polite">
            <div className="mce-panel-window"><div className="mce-panel-bar"><i /><i /><i /><span>مسار مستند تجريبي</span></div><div className="mce-panel-body"><span className="mce-panel-icon">{(() => { const Icon = step.icon; return <Icon />; })()}</span><DemoFlag future={!step.live} /><small>المرحلة {active + 1} من {journeySteps.length}</small><h3>{step.title}</h3><p>{step.panel}</p><div className="mce-progress"><i style={{ width: `${((active + 1) / journeySteps.length) * 100}%` }} /></div><div className="mce-panel-checks"><span><CheckCircle2 /> بيانات الشركة معزولة</span><span><UserCheck /> الصلاحية مطلوبة</span><span><ShieldCheck /> الأحداث المهمة قابلة للتدقيق</span></div></div></div>
            <div className="mce-journey-controls"><button type="button" onClick={() => select(active - 1)} aria-label="المرحلة السابقة"><ChevronRight /></button><span>{active + 1} / {journeySteps.length}</span><button type="button" onClick={() => select(active + 1)} aria-label="المرحلة التالية"><ChevronLeft /></button></div>
          </aside>
        </div>
      </div>
    </section>
  );
}

type MobileView = "summary" | "flow" | "reports";
const mobileViews = {
  summary: { label: "الملخص المالي", value: "12.85M", sub: "إجمالي حركة العرض", cards: [["الإيرادات", "7.51M"], ["المصروفات", "5.34M"], ["صافي الربح", "2.17M"]], bars: [38, 51, 46, 68, 61, 79, 88] },
  flow: { label: "الإيراد والمصروف", value: "+28.9%", sub: "هامش تجريبي", cards: [["تحصيلات", "4.82M"], ["مدفوعات", "3.64M"], ["صافي الحركة", "1.18M"]], bars: [72, 45, 81, 57, 90, 63, 84] },
  reports: { label: "نظرة التقارير", value: "6", sub: "تقارير ضمن الرؤية", cards: [["ميزان المراجعة", "قادم"], ["قائمة الدخل", "قادم"], ["التدفقات", "قادم"]], bars: [45, 58, 66, 52, 74, 82, 91] },
} as const;

export function MobileReportingShowcase() {
  const [view, setView] = useState<MobileView>("summary");
  const data = mobileViews[view];
  return (
    <section id="mobile-reporting" className="mce-section mce-mobile" aria-labelledby="mce-mobile-title">
      <div className="mce-shell mce-mobile-layout">
        <div className="mce-mobile-copy"><DemoFlag /><span className="mce-kicker">تجربة التقارير على الهاتف</span><h2 id="mce-mobile-title">الصورة المالية في واجهة واضحة أينما كنت</h2><p>نموذج تفاعلي يوضح اتجاه تجربة الموبايل القادمة. جميع الأرقام تجريبية ووظائف التقارير المالية ليست منشورة بعد.</p><div className="mce-mobile-tabs" role="tablist" aria-label="عروض الهاتف">{(Object.keys(mobileViews) as MobileView[]).map(key => <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)}>{mobileViews[key].label}</button>)}</div><ul><li><Check /> واجهة عربية RTL</li><li><Check /> ملخصات سريعة قابلة للقراءة</li><li><Check /> فصل واضح بين العرض والوظائف التشغيلية</li></ul></div>
        <div className="mce-phone-stage"><div className="mce-phone-glow" /><div className="mce-phone"><div className="mce-phone-speaker" /><div className="mce-phone-screen"><header><span><BarChart3 /> Money Coder</span><small>09:41</small></header><div className="mce-phone-welcome"><small>مرحبًا، أحمد</small><strong>{data.label}</strong></div><div className="mce-phone-total"><span>{data.sub}</span><strong>{data.value}</strong><em>بيانات تجريبية</em></div><div className="mce-phone-chart">{data.bars.map((height, index) => <i key={`${view}-${index}`} style={{ height: `${height}%` }} />)}</div><div className="mce-phone-cards">{data.cards.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div><nav><span className="is-active"><PieChart /> الملخص</span><span><BarChart3 /> التقارير</span><span><WalletCards /> الحسابات</span></nav></div></div><div className="mce-phone-note"><Smartphone /> نموذج تفاعلي — ليس تطبيقًا منشورًا</div></div>
      </div>
    </section>
  );
}

const securityFeatures = [
  { icon: FolderLock, title: "عزل بيانات الشركات", copy: "كل ملف مرتبط بمعرّف الشركة، والوصول يمر عبر التفويض والصلاحية.", proof: "منفذ حاليًا" },
  { icon: UserCheck, title: "صلاحيات حسب الدور", copy: "أدوار للمالك والمحاسب والمراجع والمشاهد مع صلاحيات إضافية محددة.", proof: "منفذ حاليًا" },
  { icon: LockKeyhole, title: "تخزين مستندات خاص", copy: "رفع موقّع، تحقق من النوع والحجم، ومسارات تخزين مرتبطة بالشركة.", proof: "منفذ حاليًا" },
  { icon: Eye, title: "سجل تدقيق", copy: "تسجيل عمليات الرفع والتنزيل والحذف والدعوات والتفويضات المهمة.", proof: "منفذ حاليًا" },
] as const;

export function SecurityApprovals() {
  return (
    <section id="security" className="mce-section mce-security" aria-labelledby="mce-security-title">
      <div className="mce-shell"><div className="mce-heading mce-heading-light"><DemoFlag future={false} /><h2 id="mce-security-title">الأمان والتفويض جزء من بنية المنتج</h2><p>هذا القسم مبني على وظائف موجودة في الكود الحالي، وليس على وعود تسويقية مستقبلية.</p></div><div className="mce-security-grid"><div className="mce-security-cards">{securityFeatures.map(({ icon: Icon, title, copy, proof }) => <article key={title}><span><Icon /></span><div><strong>{title}</strong><p>{copy}</p><small><BadgeCheck /> {proof}</small></div></article>)}</div><div className="mce-approval-flow"><span className="mce-kicker">تفويض مكتب المحاسبة</span><h3>مسار موافقة واضح وقابل للإلغاء</h3><div className="mce-approval-track"><article><span>01</span><Building2 /><strong>المكتب يطلب التفويض</strong><small>صلاحيات أولية محددة</small></article><i /><article><span>02</span><ClipboardCheck /><strong>الشركة تقبل أو ترفض</strong><small>القبول مطلوب قبل الوصول</small></article><i /><article><span>03</span><UsersRound /><strong>تعيين الموظفين</strong><small>ضمن صلاحيات المكتب والتفويض</small></article><i /><article><span>04</span><ShieldCheck /><strong>تسجيل الأحداث</strong><small>وإمكانية إلغاء التفويض</small></article></div></div></div></div>
    </section>
  );
}

export function StartPaths({ signedIn }: { signedIn: boolean }) {
  const startHref = signedIn ? "/dashboard" : "/auth/register";
  return (
    <section id="plans" className="mce-section mce-plans" aria-labelledby="mce-plans-title">
      <div className="mce-shell"><div className="mce-heading"><span className="mce-kicker">ابدأ بالمسار المناسب</span><h2 id="mce-plans-title">لا نعرض أسعارًا غير معتمدة</h2><p>اختر نوع مساحة العمل وابدأ التسجيل. تفاصيل الباقات والأسعار ستُنشر فقط بعد اعتمادها رسميًا.</p></div><div className="mce-plan-grid"><article><span><Building2 /></span><small>للشركات</small><h3>شركة واحدة</h3><p>ملف شركة، فريق، صلاحيات، مستندات وإعدادات تأسيسية.</p><Link href={startHref}>ابدأ تسجيل شركتك <ArrowLeft /></Link></article><article className="is-featured"><em>المسار الأوسع</em><span><Landmark /></span><small>للمكاتب</small><h3>مكتب محاسبة</h3><p>مساحة مكتب، موظفون، تفويضات وعلاقات متعددة مع شركات العملاء.</p><Link href={startHref}>ابدأ تسجيل المكتب <ArrowLeft /></Link></article><article><span><UsersRound /></span><small>للفرق الأكبر</small><h3>احتياج مؤسسي</h3><p>ابدأ التسجيل ثم قيّم ملاءمة الصلاحيات والتفويضات لهيكل فريقك.</p><a href="#faq">راجع الأسئلة الشائعة <ArrowUpLeft /></a></article></div></div>
    </section>
  );
}

const faqs = [
  ["هل Financial Twin متاح بالكامل الآن؟", "لا. المستندات ومساحات الشركات والصلاحيات والتفويضات وسجل التدقيق متاحة في النظام الحالي. الاستخراج المحاسبي والقيود والترحيل والقوائم المالية موضحة كوظائف مستقبلية."],
  ["هل يمكن لمكتب المحاسبة إدارة أكثر من شركة؟", "نعم، يدعم النظام علاقات تفويض بين مكتب المحاسبة وشركات العملاء، مع تعيين موظفين وصلاحيات محكومة بالتفويض."],
  ["كيف يتم فصل بيانات الشركات؟", "يتم ربط المستندات والعضويات والتفويضات بمعرّف الشركة، وتُفحص صلاحية المستخدم قبل الوصول إلى الموارد المحمية."],
  ["ما أنواع الملفات المقبولة؟", "تسمح آلية المستندات الحالية بأنواع محددة تشمل PDF وملفات Excel وصورًا معتمدة، مع فحص النوع والحجم قبل تثبيت الملف."],
  ["هل الأرقام الظاهرة في الصفحة حقيقية؟", "لا. جميع مؤشرات ولوحات وتقارير الصفحة بيانات عرض تجريبية ولا تمثل بيانات عميل أو تقارير مالية تشغيلية."],
] as const;

export function ProductFaq() {
  return <section id="faq" className="mce-section mce-faq" aria-labelledby="mce-faq-title"><div className="mce-shell mce-faq-layout"><div><span className="mce-kicker">معلومات موثقة</span><h2 id="mce-faq-title">أسئلة شائعة قبل البدء</h2><p>إجابات مبنية على الوظائف الموجودة في المشروع الحالي.</p><ShieldCheck /></div><div className="mce-faq-list">{faqs.map(([question, answer], index) => <details key={question} open={index === 0}><summary>{question}<ChevronLeft /></summary><p>{answer}</p></details>)}</div></div></section>;
}
