"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity, ArrowDownToLine, BadgeCheck, Banknote, BarChart3, Bell, BookOpenCheck,
  BriefcaseBusiness, Building2, CheckCircle2, ChevronLeft, CirclePlay, ClipboardCheck,
  FileCheck2, FileClock, FileText, Landmark, LayoutDashboard, Menu,
  MessageSquarePlus, NotebookTabs, RefreshCcw, Save, Search, Settings, ShieldCheck,
  Trash2, Upload, Users, WalletCards, X,
} from "lucide-react";
import { useDemo } from "@/demo/state/demo-provider";
import { buildAccountBalances, buildDemoReport } from "@/application/demo/reporting";
import { isBalanced, sumJournalSide, type DemoReport, type DemoRole, type DemoSection, type JournalLine, type ReviewStatus } from "@/domain/demo/types";

const sectionItems: Array<{ id: DemoSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "نظرة عامة", icon: LayoutDashboard },
  { id: "company", label: "إعداد الشركة", icon: Building2 },
  { id: "office", label: "مركز المكتب", icon: BriefcaseBusiness },
  { id: "documents", label: "مركز المستندات", icon: FileText },
  { id: "reviews", label: "المراجعة والاعتماد", icon: ClipboardCheck },
  { id: "accounting", label: "المحاسبة التجريبية", icon: NotebookTabs },
  { id: "banking", label: "كشف البنك", icon: Landmark },
  { id: "reports", label: "التقارير المالية", icon: BarChart3 },
  { id: "plans", label: "الخطط والفوترة", icon: WalletCards },
  { id: "settings", label: "الإعدادات والمساعدة", icon: Settings },
];

const roleLabels: Record<DemoRole, string> = {
  COMPANY_OWNER: "مالك شركة",
  COMPANY_ACCOUNTANT: "محاسب شركة",
  OFFICE_OWNER: "مالك مكتب محاسبة",
  OFFICE_ACCOUNTANT: "محاسب مكتب",
  REVIEWER: "مراجع",
  FINANCE_MANAGER: "مدير مالية",
};

type DemoJourney = "owner" | "office" | "accountant";

function journeyForRole(role: DemoRole): DemoJourney {
  if (role === "COMPANY_ACCOUNTANT") return "accountant";
  if ((["OFFICE_OWNER", "OFFICE_ACCOUNTANT", "REVIEWER"] as DemoRole[]).includes(role)) return "office";
  return "owner";
}

const statusLabels: Record<ReviewStatus, string> = {
  READY_FOR_REVIEW: "جاهز للمراجعة",
  IN_REVIEW: "قيد المراجعة",
  CORRECTION_REQUESTED: "مطلوب تصحيح",
  RESUBMITTED: "أعيد التقديم",
  APPROVED: "معتمد",
  REJECTED: "مرفوض",
};

function money(value: number, currency = "EGP") {
  return new Intl.NumberFormat("ar-EG", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value / 100);
}

function decimalMoney(value: number) {
  return (value / 100).toFixed(2);
}

const auditLabels: Record<string, string> = {
  DEMO_BASELINE_CREATED: "تهيئة بيانات العرض",
  DEMO_ORGANIZATION_SWITCHED: "تبديل الشركة الحالية",
  DEMO_COMPANY_PROFILE_UPDATED: "تحديث ملف الشركة",
  DEMO_DOCUMENT_STAGED: "إضافة مستند تجريبي",
  DEMO_REVIEW_ASSIGNED: "تعيين المراجع",
  DEMO_REVIEW_STARTED: "بدء المراجعة البشرية",
  DEMO_REVIEW_CORRECTION_REQUESTED: "طلب تصحيح مستند",
  DEMO_REVIEW_RESUBMITTED: "إعادة تقديم المستند",
  DEMO_REVIEW_APPROVED: "اعتماد المستند",
  DEMO_REVIEW_REJECTED: "رفض المستند",
  DEMO_JOURNAL_POSTED: "ترحيل قيد تجريبي",
  DEMO_BANK_ROW_MAPPED: "ربط حركة بنكية بحساب",
  DEMO_BANK_DRAFT_CREATED: "إنشاء مسودة من كشف البنك",
  DEMO_BANK_DRAFT_POSTED: "ترحيل مسودة كشف البنك",
};

export function DemoShell() {
  const { state, service, operation, execute, retry, clearFeedback } = useDemo();
  const [menuOpen, setMenuOpen] = useState(false);
  const organization = state.organizations.find(item => item.id === state.currentOrganizationId)!;
  const currentSection = sectionItems.find(item => item.id === state.currentSection)!;

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const navigate = (section: DemoSection) => {
    void execute("navigate", () => service.navigate(section));
    setMenuOpen(false);
  };

  return (
    <div className="demo-app" dir="rtl">
      <a href="#demo-main" className="demo-skip">انتقل إلى المحتوى</a>
      <header className="demo-topbar">
        <div className="demo-brand"><span className="demo-brand-mark">▥</span><span><strong>Money Coder</strong><small>Interactive Product Demo</small></span></div>
        <div className="demo-mode-badge"><span /> وضع تجريبي — بيانات افتراضية</div>
        <div className="demo-top-actions">
          <label><span>الدور التجريبي</span><select value={state.currentRole} onChange={event => void execute("switch-context", () => service.switchRole(event.target.value as DemoRole), "تم تبديل الدور التجريبي.")}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>الشركة</span><select value={state.currentOrganizationId} onChange={event => void execute("switch-context", () => service.switchOrganization(event.target.value), "تم تبديل الشركة مع عزل بياناتها.")}>{state.organizations.map(item => <option value={item.id} key={item.id}>{item.tradeName}</option>)}</select></label>
          <button className="demo-reset" type="button" onClick={() => { if (window.confirm("إعادة جميع بيانات العرض إلى خط البداية؟")) void execute("settings", () => service.reset(), "عادت بيانات العرض إلى نقطة البداية."); }}><RefreshCcw /> إعادة العرض</button>
          <button className="demo-menu-button" type="button" aria-label="فتح قائمة العرض" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      {menuOpen && <button type="button" className="demo-menu-backdrop" aria-label="إغلاق قائمة العرض" onClick={() => setMenuOpen(false)} />}
      <aside className={`demo-sidebar ${menuOpen ? "is-open" : ""}`} aria-label="وحدات العرض">
        <div className="demo-mobile-context">
          <label>الدور التجريبي<select value={state.currentRole} onChange={event => void execute("switch-context", () => service.switchRole(event.target.value as DemoRole), "تم تبديل الدور التجريبي.")}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>الشركة<select value={state.currentOrganizationId} onChange={event => void execute("switch-context", () => service.switchOrganization(event.target.value), "تم تبديل الشركة مع عزل بياناتها.")}>{state.organizations.map(item => <option value={item.id} key={item.id}>{item.tradeName}</option>)}</select></label>
        </div>
        <nav>{sectionItems.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-current={state.currentSection === id ? "page" : undefined} className={state.currentSection === id ? "is-active" : ""} onClick={() => navigate(id)}><Icon /><span>{label}</span>{state.currentSection === id && <ChevronLeft />}</button>)}</nav>
        <div className="demo-safety"><ShieldCheck /><div><strong>معزول عن الإنتاج</strong><small>لا قاعدة بيانات، لا رفع حقيقي، لا مدفوعات.</small></div></div>
        <Link href="/">العودة إلى الموقع</Link>
      </aside>

      <main id="demo-main" className="demo-main">
        <div className="demo-page-heading"><div><span>{currentSection.label}</span><h1>{organization.tradeName}</h1><p>أنت تستعرض دور: {roleLabels[state.currentRole]} — جميع الأسماء والأرقام افتراضية.</p></div><div className="demo-heading-actions"><span><Bell /> {state.notifications.filter(note => !note.read && (!note.organizationId || note.organizationId === organization.id)).length}</span><span><Activity /> {state.audit.filter(item => !item.organizationId || item.organizationId === organization.id).length} نشاط</span></div></div>
        <div className="demo-data-warning" role="note"><ShieldCheck /><p><strong>بيئة محاكاة آمنة:</strong> استخدم بيانات العرض فقط. لا تُدخل معلومات مالية أو شخصية حقيقية.</p></div>
        {operation.status !== "idle" && <div className={`demo-operation is-${operation.status}`} role={operation.status === "error" ? "alert" : "status"} aria-live="polite"><span className="demo-operation-dot" /> <p>{operation.status === "loading" ? operation.message : operation.status === "error" ? operation.error : operation.message}</p>{operation.status === "error" && operation.retryable && <button type="button" onClick={() => void retry()}><RefreshCcw /> إعادة المحاولة</button>}<button type="button" aria-label="إغلاق الرسالة" onClick={clearFeedback}><X /></button></div>}
        <ScenarioGuide />
        {state.currentSection === "overview" && <Overview />}
        {state.currentSection === "company" && <CompanySetup key={organization.id} />}
        {state.currentSection === "office" && <OfficeCenter />}
        {state.currentSection === "documents" && <DocumentCenter key={organization.id} />}
        {state.currentSection === "reviews" && <ReviewCenter key={organization.id} />}
        {state.currentSection === "accounting" && <AccountingCore key={organization.id} />}
        {state.currentSection === "banking" && <BankWorkflow key={organization.id} />}
        {state.currentSection === "reports" && <Reports key={organization.id} />}
        {state.currentSection === "plans" && <Plans />}
        {state.currentSection === "settings" && <SettingsHelp />}
      </main>
      <footer className="demo-footer-mobile">وضع تجريبي — لا توجد اتصالات بخدمات الإنتاج</footer>
    </div>
  );
}

function ScenarioGuide() {
  const { state, service, execute } = useDemo();
  const journey = journeyForRole(state.currentRole);
  const organizationId = state.currentOrganizationId;

  const ownerSteps = [
    { label: "لوحة الأداء", detail: "راجع المؤشرات والمهام", section: "overview" as DemoSection, done: true },
    { label: "بيانات الشركة", detail: "حدّث الملف التجريبي", section: "company" as DemoSection, done: state.audit.some(item => item.organizationId === organizationId && item.action === "DEMO_COMPANY_PROFILE_UPDATED") },
    { label: "قرار الاعتماد", detail: "تابع نتيجة المراجعة", section: "reviews" as DemoSection, done: state.audit.some(item => item.organizationId === organizationId && item.action === "DEMO_REVIEW_APPROVED") },
    { label: "القوائم المالية", detail: "اقرأ الأثر المالي", section: "reports" as DemoSection, done: state.audit.some(item => item.organizationId === organizationId && ["DEMO_JOURNAL_POSTED", "DEMO_BANK_DRAFT_POSTED"].includes(item.action)) },
  ];
  const officeSteps = [
    { label: "محفظة العملاء", detail: "بدّل بين الشركات بأمان", section: "office" as DemoSection, done: state.audit.some(item => item.action === "DEMO_ORGANIZATION_SWITCHED") },
    { label: "تعيين المراجع", detail: "اختر موظفًا مخولًا", section: "reviews" as DemoSection, done: state.audit.some(item => item.organizationId === organizationId && item.action === "DEMO_REVIEW_ASSIGNED") },
    { label: "طلب التصحيح", detail: "سجّل سببًا واضحًا", section: "reviews" as DemoSection, done: state.audit.some(item => item.organizationId === organizationId && item.action === "DEMO_REVIEW_CORRECTION_REQUESTED") },
    { label: "الاعتماد والمتابعة", detail: "أغلق دورة المراجعة", section: "reviews" as DemoSection, done: state.audit.some(item => item.organizationId === organizationId && item.action === "DEMO_REVIEW_APPROVED") },
  ];
  const accountantSteps = [
    { label: "دليل الحسابات", detail: "راجع التصنيف والأرصدة", section: "accounting" as DemoSection, done: state.accounts.some(item => item.organizationId === organizationId) },
    { label: "قيد يومية", detail: "أنشئ قيدًا متوازنًا", section: "accounting" as DemoSection, done: state.audit.some(item => item.organizationId === organizationId && item.action === "DEMO_JOURNAL_POSTED") },
    { label: "الأستاذ والميزان", detail: "تحقق من الترحيل والتوازن", section: "accounting" as DemoSection, done: state.audit.some(item => item.organizationId === organizationId && item.action === "DEMO_JOURNAL_POSTED") },
    { label: "كشف البنك", detail: "راجع الاقتراح قبل الترحيل", section: "banking" as DemoSection, done: state.audit.some(item => item.organizationId === organizationId && item.action === "DEMO_BANK_DRAFT_POSTED") },
    { label: "التقارير", detail: "شاهد الأثر النهائي", section: "reports" as DemoSection, done: state.audit.some(item => item.organizationId === organizationId && ["DEMO_JOURNAL_POSTED", "DEMO_BANK_DRAFT_POSTED"].includes(item.action)) },
  ];
  const steps = journey === "owner" ? ownerSteps : journey === "office" ? officeSteps : accountantSteps;
  const completed = steps.filter(step => step.done).length;
  const selectJourney = (nextJourney: DemoJourney) => {
    const role: DemoRole = nextJourney === "owner" ? "COMPANY_OWNER" : nextJourney === "office" ? "OFFICE_OWNER" : "COMPANY_ACCOUNTANT";
    void execute("switch-context", () => service.switchRole(role), `تم تجهيز رحلة ${nextJourney === "owner" ? "مالك الشركة" : nextJourney === "office" ? "مكتب المحاسبة" : "المحاسب"}.`);
  };
  return <section className="demo-scenario" aria-labelledby="demo-scenario-title">
    <div className="demo-scenario-copy"><span>عرض موجّه للعميل</span><h2 id="demo-scenario-title">اختر دورك واتبع قصة العمل</h2><p>كل خطوة تشرح ما ينبغي فعله، وتنعكس نتائجها تلقائيًا على بقية الشاشات.</p></div>
    <div className="demo-scenario-tabs" role="tablist" aria-label="سيناريوهات العرض">
      <button type="button" role="tab" aria-selected={journey === "owner"} className={journey === "owner" ? "is-active" : ""} onClick={() => selectJourney("owner")}>مالك الشركة</button>
      <button type="button" role="tab" aria-selected={journey === "office"} className={journey === "office" ? "is-active" : ""} onClick={() => selectJourney("office")}>مكتب المحاسبة</button>
      <button type="button" role="tab" aria-selected={journey === "accountant"} className={journey === "accountant" ? "is-active" : ""} onClick={() => selectJourney("accountant")}>المحاسب</button>
    </div>
    <div className="demo-scenario-progress"><span style={{ width: `${completed / steps.length * 100}%` }} /><small>{completed} من {steps.length} مكتملة</small></div>
    <ol>{steps.map((step, index) => <li key={step.label} className={step.done ? "is-done" : ""}><button type="button" onClick={() => void execute("navigate", () => service.navigate(step.section))}><span>{step.done ? <CheckCircle2 /> : index + 1}</span><span className="demo-scenario-step"><strong>{step.label}</strong><small>{step.detail}</small></span><ChevronLeft /></button></li>)}</ol>
  </section>;
}

function Overview() {
  const { state, service } = useDemo();
  const organization = state.organizations.find(item => item.id === state.currentOrganizationId)!;
  const report = buildDemoReport(state, state.currentOrganizationId);
  const documents = state.documents.filter(item => item.organizationId === organization.id);
  const reviews = state.reviews.filter(item => item.organizationId === organization.id);
  const posted = state.journals.filter(item => item.organizationId === organization.id && item.status === "POSTED");
  const max = Math.max(report.revenueMinor, report.expenseMinor, 1);
  return <div className="demo-stack">
    <section className="demo-kpi-grid" aria-label="مؤشرات العرض"><Kpi icon={<Banknote />} label="الإيرادات التجريبية" value={money(report.revenueMinor, organization.currency)} tone="teal"/><Kpi icon={<BarChart3 />} label="الربح التجريبي" value={money(report.profitMinor, organization.currency)} tone="gold"/><Kpi icon={<FileClock />} label="بانتظار المراجعة" value={String(reviews.filter(item => !["APPROVED", "REJECTED"].includes(item.status)).length)} tone="blue"/><Kpi icon={<BookOpenCheck />} label="قيود مرحلة" value={String(posted.length)} tone="navy"/></section>
    <div className="demo-grid-2">
      <Panel title="مؤشر الأداء المالي" subtitle="محسوب من القيود التجريبية المرحلة"><div className="demo-bar-chart"><div><span>الإيرادات</span><i style={{ width: `${report.revenueMinor / max * 100}%` }}/><b>{money(report.revenueMinor, organization.currency)}</b></div><div><span>المصروفات</span><i className="expense" style={{ width: `${report.expenseMinor / max * 100}%` }}/><b>{money(report.expenseMinor, organization.currency)}</b></div><div><span>صافي الربح</span><i className="profit" style={{ width: `${Math.max(report.profitMinor, 0) / max * 100}%` }}/><b>{money(report.profitMinor, organization.currency)}</b></div></div></Panel>
      <Panel title="المهام الحالية" subtitle="تتغير فور تنفيذ خطوات المراجعة"><div className="demo-task-list">{reviews.slice(0, 4).map(review => { const document = documents.find(item => item.id === review.documentId)!; return <button type="button" key={review.id} onClick={() => service.navigate("reviews")}><span className={`demo-status is-${review.status.toLowerCase()}`}>{statusLabels[review.status]}</span><strong>{document?.title}</strong><small>{review.assignedTo}</small></button>; })}</div></Panel>
    </div>
    <div className="demo-grid-3"><Panel title="نشاط مترابط"><ActivityFeed /></Panel><Panel title="حالة الملف"><ul className="demo-check-list"><li><CheckCircle2 /> ملف الشركة مكتمل للعرض</li><li><CheckCircle2 /> {organization.staff.length} أعضاء افتراضيون</li><li><CheckCircle2 /> {organization.bankProfiles.length} ملف بنكي تجريبي</li></ul></Panel><Panel title="اختصارات"><div className="demo-quick"><button onClick={() => service.navigate("documents")}><Upload /> إضافة مستند تجريبي</button><button onClick={() => service.navigate("accounting")}><NotebookTabs /> إنشاء قيد متوازن</button><button onClick={() => service.navigate("reports")}><BarChart3 /> فتح التقارير</button></div></Panel></div>
  </div>;
}

function CompanySetup() {
  const { state, service, execute } = useDemo();
  const organization = state.organizations.find(item => item.id === state.currentOrganizationId)!;
  const [saved, setSaved] = useState(false);
  return <div className="demo-grid-2 demo-align-start">
    <Panel title="ملف الشركة التجريبي" subtitle="التعديل يخص جلسة العرض فقط"><form className="demo-form" onSubmit={async event => { event.preventDefault(); const form = new FormData(event.currentTarget); const result = await execute("settings", () => service.saveCompanyProfile({ tradeName: String(form.get("tradeName")), industry: String(form.get("industry")), currency: form.get("currency") as "EGP" | "USD" }), "تم تحديث ملف الشركة التجريبي."); setSaved(result.ok); }}><Field label="الاسم التجاري" name="tradeName" minLength={3} required defaultValue={organization.tradeName}/><Field label="النشاط" name="industry" minLength={3} required defaultValue={organization.industry}/><label>العملة الأساسية<select name="currency" defaultValue={organization.currency}><option value="EGP">EGP — جنيه مصري</option><option value="USD">USD — دولار أمريكي</option></select></label><div className="demo-form-row"><Field label="بداية السنة المالية" name="start" defaultValue={organization.fiscalYearStart} readOnly/><Field label="نهاية السنة المالية" name="end" defaultValue={organization.fiscalYearEnd} readOnly/></div><button className="demo-primary" type="submit"><Save /> حفظ داخل العرض</button>{saved && <p className="demo-success" role="status"><CheckCircle2 /> تم تحديث بيانات العرض.</p>}</form></Panel>
    <div className="demo-stack"><Panel title="الفريق والصلاحيات" subtitle="معاينة فقط — ليست مصادقة حقيقية"><div className="demo-people">{organization.staff.map(member => <article key={member.id}><span>{member.name.slice(0, 1)}</span><div><strong>{member.name}</strong><small>{member.role}</small><p>{member.permissions.join(" · ")}</p></div></article>)}</div></Panel><Panel title="الملفات البنكية"><div className="demo-bank-cards">{organization.bankProfiles.map(bank => <article key={bank.id}><Landmark /><div><strong>{bank.bankName}</strong><p>{bank.accountLabel}</p><small>{bank.currency} · عرض فقط</small></div></article>)}</div></Panel><Panel title="بيانات قانونية افتراضية"><dl className="demo-definition"><div><dt>السجل التجاري</dt><dd>{organization.commercialRegister}</dd></div><div><dt>الرقم الضريبي</dt><dd>{organization.taxNumber}</dd></div><div><dt>حجم الشركة</dt><dd>{organization.size}</dd></div></dl></Panel></div>
  </div>;
}

function OfficeCenter() {
  const { state, service, execute } = useDemo();
  const [mode, setMode] = useState<"portfolio" | "assignments">("portfolio");
  return <div className="demo-stack"><div className="demo-callout"><BriefcaseBusiness /><div><strong>{state.office.name}</strong><p>مكتب واحد يدير ثلاث شركات افتراضية مع عزل كامل للسياق داخل العرض.</p></div><div className="demo-segment" role="tablist" aria-label="شاشات مكتب المحاسبة"><button type="button" role="tab" aria-selected={mode === "portfolio"} className={mode === "portfolio" ? "is-active" : ""} onClick={() => setMode("portfolio")}>محفظة العملاء</button><button type="button" role="tab" aria-selected={mode === "assignments"} className={mode === "assignments" ? "is-active" : ""} onClick={() => setMode("assignments")}>التعيينات</button></div></div>
    {mode === "portfolio" ? <div className="demo-portfolio">{state.organizations.map(organization => { const reviews = state.reviews.filter(item => item.organizationId === organization.id); const active = organization.id === state.currentOrganizationId; return <button type="button" key={organization.id} className={active ? "is-active" : ""} onClick={() => void execute("switch-context", () => service.switchOrganization(organization.id), `تم فتح ${organization.tradeName} ببيانات معزولة.`)}><header><Building2 /><span className="demo-status is-approved">تفويض نشط</span></header><h2>{organization.tradeName}</h2><p>{organization.industry} · {organization.size}</p><dl><div><dt>قيد المراجعة</dt><dd>{reviews.filter(item => !["APPROVED", "REJECTED"].includes(item.status)).length}</dd></div><div><dt>الفريق</dt><dd>{organization.staff.length}</dd></div></dl><span className="demo-card-action">{active ? "الشركة الحالية" : "التبديل لهذه الشركة"}</span></button>; })}</div> : <div className="demo-grid-2"><Panel title="فريق المكتب"><div className="demo-people">{state.office.staff.map(member => <article key={member.id}><span>{member.name.slice(0, 1)}</span><div><strong>{member.name}</strong><small>{member.role}</small><p>{member.assignedOrganizationIds.map(id => state.organizations.find(item => item.id === id)?.tradeName).join("، ")}</p></div></article>)}</div></Panel><Panel title="نطاقات التفويض"><div className="demo-permissions">{state.office.engagements.map(engagement => <article key={engagement.organizationId}><div><strong>{state.organizations.find(item => item.id === engagement.organizationId)?.tradeName}</strong><small>{engagement.status === "ACTIVE" ? "نشط" : "معلق"}</small></div><p>{engagement.permissions.join(" · ")}</p></article>)}</div></Panel></div>}
    <Panel title="سجل نشاط المكتب"><ActivityFeed global /></Panel>
  </div>;
}

function DocumentCenter() {
  const { state, service, execute } = useDemo();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [uploadOpen, setUploadOpen] = useState(false);
  const normalizedQuery = query.trim().toLocaleLowerCase("ar");
  const documents = state.documents.filter(item => item.organizationId === state.currentOrganizationId).filter(item => (status === "ALL" || item.status === status) && item.title.toLocaleLowerCase("ar").includes(normalizedQuery));
  return <div className="demo-stack"><div className="demo-toolbar"><label className="demo-search"><span className="demo-visually-hidden">بحث المستندات</span><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث في المستندات"/></label><select value={status} onChange={event => setStatus(event.target.value)} aria-label="تصفية حالة المستند"><option value="ALL">كل الحالات</option>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><button className="demo-primary" type="button" aria-expanded={uploadOpen} onClick={() => setUploadOpen(value => !value)}><Upload /> إضافة عينة</button></div>
    {uploadOpen && <Panel title="إضافة مستند مصطنع" subtitle="لا يوجد حقل ملفات: العرض ينشئ سجلًا آمنًا من قوالب مصطنعة فقط"><form className="demo-inline-form" onSubmit={async event => { event.preventDefault(); const form = new FormData(event.currentTarget); const result = await execute("documents", () => service.simulateUpload({ title: String(form.get("title")), category: form.get("category") as "BANK_STATEMENT" | "INVOICE" | "CONTRACT" | "TAX" | "OTHER" }), "تمت إضافة عينة مصطنعة إلى مسار المراجعة."); if (result.ok) setUploadOpen(false); }}><Field label="عنوان العينة" name="title" minLength={3} required defaultValue="مستند جديد — عينة"/><label>التصنيف<select name="category"><option value="INVOICE">فاتورة</option><option value="BANK_STATEMENT">كشف حساب</option><option value="CONTRACT">عقد</option><option value="TAX">ضريبي</option><option value="OTHER">أخرى</option></select></label><label>قالب البيانات<select disabled><option>قالب مصطنع آمن — بدون رفع</option></select></label><p>لا تُدخل أسماء عملاء أو أرقامًا أو ملفات حقيقية.</p><button className="demo-primary">إنشاء سجل العينة</button></form></Panel>}
    <div className="demo-table-wrap"><table className="demo-table"><thead><tr><th>المستند</th><th>التصنيف</th><th>الإصدار</th><th>الحالة</th><th>المسند إليه</th><th>إجراء</th></tr></thead><tbody>{documents.map(document => { const review = state.reviews.find(item => item.documentId === document.id); return <tr key={document.id}><td><strong>{document.title}</strong><small>{document.versions.at(-1)?.fileLabel}</small></td><td>{categoryLabel(document.category)}</td><td>v{document.versions.at(-1)?.version}</td><td><span className={`demo-status is-${document.status.toLowerCase()}`}>{statusLabels[document.status]}</span></td><td>{document.assignedTo || "غير معيّن"}</td><td><button className="demo-text-button" disabled={!review} onClick={() => review && void execute("navigate", () => service.openReview(review.id))}>فتح المراجعة</button></td></tr>; })}</tbody></table>{!documents.length && <EmptyState icon={<FileText />} text="لا توجد نتائج مطابقة."/>}</div>
  </div>;
}

function ReviewCenter() {
  const { state, service, execute } = useDemo();
  const reviews = state.reviews.filter(item => item.organizationId === state.currentOrganizationId);
  const selected = reviews.find(item => item.id === state.selectedReviewId) ?? reviews[0];
  const document = selected && state.documents.find(item => item.id === selected.documentId);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [validationError, setValidationError] = useState("");
  const clearReviewFeedback = () => {
    setComment("");
    setMessage("");
    setValidationError("");
  };
  if (!selected || !document) return <EmptyState icon={<ClipboardCheck />} text="لا توجد حالات مراجعة لهذه الشركة."/>;
  const authorizedStaff = state.office.staff.filter(member => member.assignedOrganizationIds.includes(state.currentOrganizationId));
  const canBegin = ["READY_FOR_REVIEW", "RESUBMITTED"].includes(selected.status);
  const canDecide = selected.status === "IN_REVIEW";
  const canResubmit = selected.status === "CORRECTION_REQUESTED";
  const workflowHint = selected.status === "READY_FOR_REVIEW"
    ? "عيّن مراجعًا ثم ابدأ المراجعة البشرية."
    : selected.status === "IN_REVIEW"
      ? "راجع المستند ثم اختر طلب تصحيح أو اعتماد أو رفض."
      : selected.status === "CORRECTION_REQUESTED"
        ? "أعد تقديم نسخة تجريبية مصححة للعودة إلى المراجعة."
        : selected.status === "RESUBMITTED"
          ? "ابدأ دورة المراجعة الجديدة للنسخة المصححة."
          : "انتهت دورة المراجعة الحالية. أنشئ عينة جديدة لتجربة دورة أخرى.";
  const transition = async (status: "CORRECTION_REQUESTED" | "RESUBMITTED" | "APPROVED" | "REJECTED", fallback: string) => {
    const reasonRequired = status === "CORRECTION_REQUESTED" || status === "REJECTED";
    if (reasonRequired && comment.trim().length < 2) {
      setValidationError("اكتب سببًا واضحًا قبل طلب التصحيح أو الرفض.");
      return;
    }
    setValidationError("");
    const result = await execute("reviews", () => service.transitionReview(selected.id, status, comment.trim() || fallback), `تم تنفيذ: ${statusLabels[status]}`);
    if (result.ok) {
      setComment("");
      setMessage(`تم تنفيذ: ${statusLabels[status]}`);
    }
  };
  const addComment = async () => {
    if (comment.trim().length < 2) {
      setValidationError("اكتب تعليقًا من حرفين على الأقل.");
      return;
    }
    setValidationError("");
    const result = await execute("reviews", () => service.addReviewComment(selected.id, comment), "تمت إضافة التعليق إلى سجل المراجعة.");
    if (result.ok) {
      setComment("");
      setMessage("تمت إضافة التعليق إلى سجل المراجعة.");
    }
  };
  const assignedReviewerIsAuthorized = authorizedStaff.some(member => member.name === selected.assignedTo);
  return <div className="demo-review-layout"><aside className="demo-review-list" aria-label="قائمة المراجعات">{reviews.map(review => { const doc = state.documents.find(item => item.id === review.documentId)!; return <button type="button" key={review.id} className={selected.id === review.id ? "is-active" : ""} aria-pressed={selected.id === review.id} onClick={() => { clearReviewFeedback(); void execute("navigate", () => service.openReview(review.id)); }}><span className={`demo-status is-${review.status.toLowerCase()}`}>{statusLabels[review.status]}</span><strong>{doc.title}</strong><small>{review.assignedTo}</small></button>; })}</aside><div className="demo-stack"><Panel title={document.title} subtitle={`نسخة ${document.versions.at(-1)?.version} · ${categoryLabel(document.category)}`}><div className="demo-review-summary"><div className="demo-document-preview"><FileCheck2 /><strong>معاينة مستند تجريبي</strong><span>{document.versions.at(-1)?.fileLabel}</span><small>لا يوجد ملف حقيقي أو رابط تخزين</small></div><div className="demo-review-controls"><div className={`demo-workflow-hint is-${selected.status.toLowerCase()}`}><ClipboardCheck /><div><strong>{statusLabels[selected.status]}</strong><p>{workflowHint}</p></div></div><label>إسناد المراجع<select value={selected.assignedTo} onChange={event => void execute("reviews", () => service.assignReview(selected.id, event.target.value), "تم تعيين المراجع داخل العرض.")}><option value="غير معيّن">غير معيّن</option>{!assignedReviewerIsAuthorized && selected.assignedTo !== "غير معيّن" && <option value={selected.assignedTo} disabled>{selected.assignedTo} — خارج نطاق الشركة</option>}{authorizedStaff.map(member => <option key={member.id} value={member.name}>{member.name}</option>)}</select></label><label>تعليق أو سبب<textarea value={comment} maxLength={500} onChange={event => { setComment(event.target.value); setValidationError(""); }} placeholder="اكتب ملاحظة واضحة"/></label><div className="demo-comment-action"><button type="button" className="demo-secondary" onClick={() => void addComment()}><MessageSquarePlus /> إضافة تعليق فقط</button><small>{comment.length}/500</small></div>{validationError && <p className="demo-validation-error" role="alert">{validationError}</p>}<div className="demo-action-grid"><button type="button" className="start" disabled={!canBegin || !assignedReviewerIsAuthorized} onClick={() => void execute("reviews", () => service.beginReview(selected.id), "بدأت المراجعة البشرية.")}><CirclePlay /> بدء المراجعة</button><button type="button" disabled={!canDecide} onClick={() => void transition("CORRECTION_REQUESTED", "يرجى تصحيح المستند وإعادة تقديمه.")}>طلب تصحيح</button><button type="button" disabled={!canResubmit} onClick={() => void transition("RESUBMITTED", "تم رفع نسخة تجريبية مصححة.")}>إعادة تقديم</button><button type="button" className="approve" disabled={!canDecide} onClick={() => void transition("APPROVED", "تمت مراجعة العينة واعتمادها تجريبيًا.")}>اعتماد</button><button type="button" className="reject" disabled={!canDecide} onClick={() => void transition("REJECTED", "رُفضت العينة في وضع العرض.")}>رفض</button></div>{message && <p className="demo-success" role="status">{message}</p>}</div></div></Panel><div className="demo-grid-2"><Panel title="التعليقات"><div className="demo-comments">{selected.comments.map(item => <article key={item.id}><span>{item.author.slice(0, 1)}</span><div><strong>{item.author}</strong><p>{item.body}</p><small>{new Date(item.createdAt).toLocaleString("ar-EG")}</small></div></article>)}{!selected.comments.length && <p>لا توجد تعليقات بعد.</p>}</div></Panel><Panel title="مسار الحالة"><ol className="demo-timeline">{selected.timeline.map(item => <li key={item.id}><span/><div><strong>{item.label}</strong><p>{item.actor}</p><small>{new Date(item.at).toLocaleString("ar-EG")}</small></div></li>)}</ol></Panel></div></div></div>;
}

function AccountingCore() {
  const { state, service, execute } = useDemo();
  const organization = state.organizations.find(item => item.id === state.currentOrganizationId)!;
  const accounts = state.accounts.filter(item => item.organizationId === organization.id);
  const balances = buildAccountBalances(state, organization.id);
  const report = buildDemoReport(state, state.currentOrganizationId);
  const [tab, setTab] = useState<"chart" | "journal" | "ledger" | "trial">("chart");
  const [ledgerAccountId, setLedgerAccountId] = useState(accounts[0]?.id ?? "");
  const [journalMeta, setJournalMeta] = useState({ date: "2026-11-20", reference: `DEMO-${state.journals.length + 1}`, memo: "قيد يدوي تجريبي" });
  const [lines, setLines] = useState<JournalLine[]>([
    { id: "new-line-1", accountId: accounts[0]?.id ?? "", description: "", debitMinor: 0, creditMinor: 0 },
    { id: "new-line-2", accountId: accounts[5]?.id ?? "", description: "", debitMinor: 0, creditMinor: 0 },
  ]);
  const [notice, setNotice] = useState("");
  const bankDrafts = state.journals.filter(item => item.organizationId === organization.id && item.source === "BANK_DEMO" && item.status === "DRAFT");
  const debit = sumJournalSide(lines, "DEBIT"); const credit = sumJournalSide(lines, "CREDIT");
  const updateLine = (index: number, patch: Partial<JournalLine>) => setLines(current => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  const removeLine = (index: number) => setLines(current => current.length > 2 ? current.filter((_, lineIndex) => lineIndex !== index) : current);
  const postedEntries = state.journals.filter(item => item.organizationId === organization.id && item.status === "POSTED").slice().sort((left, right) => left.date.localeCompare(right.date) || left.reference.localeCompare(right.reference));
  const ledgerLines = postedEntries.flatMap(entry => entry.lines.filter(line => line.accountId === ledgerAccountId).map(line => ({ entry, line })));
  const ledgerRows = ledgerLines.reduce<Array<(typeof ledgerLines)[number] & { runningMinor: number }>>((rows, item) => {
    const previous = rows.at(-1)?.runningMinor ?? 0;
    return [...rows, { ...item, runningMinor: previous + item.line.debitMinor - item.line.creditMinor }];
  }, []);
  const selectedAccount = accounts.find(item => item.id === ledgerAccountId);
  const selectedBalance = balances.find(item => item.account.id === ledgerAccountId);
  const postJournal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await execute("accounting", () => service.createAndPostJournal({ ...journalMeta, lines }), "تم ترحيل القيد وتحديث الأستاذ والتقارير.");
    if (result.ok) {
      setNotice("تم ترحيل القيد التجريبي وتحديث الأستاذ والتقارير.");
      setJournalMeta(current => ({ ...current, reference: `DEMO-${state.journals.length + 2}`, memo: "قيد يدوي تجريبي" }));
      setLines([
        { id: crypto.randomUUID(), accountId: accounts[0]?.id ?? "", description: "", debitMinor: 0, creditMinor: 0 },
        { id: crypto.randomUUID(), accountId: accounts[5]?.id ?? accounts[0]?.id ?? "", description: "", debitMinor: 0, creditMinor: 0 },
      ]);
    } else {
      setNotice("");
    }
  };
  return <div className="demo-stack">{bankDrafts.length > 0 && <Panel title="مسودات كشف البنك — مراجعة بشرية" subtitle="تحقق من طرفي كل قيد قبل الترحيل التجريبي"><div className="demo-bank-drafts">{bankDrafts.map(entry => <article key={entry.id}><div><span className="demo-status is-in_review">مسودة</span><strong>{entry.memo}</strong><small>{entry.reference} · {entry.date}</small></div><dl>{entry.lines.map(line => { const account = accounts.find(item => item.id === line.accountId); return <div key={line.id}><dt>{account?.code} — {account?.name}</dt><dd>{line.debitMinor ? `مدين ${money(line.debitMinor, organization.currency)}` : `دائن ${money(line.creditMinor, organization.currency)}`}</dd></div>; })}</dl><button type="button" className="demo-primary" onClick={() => void execute("accounting", () => service.postDraftJournal(entry.id), "تمت الموافقة البشرية وترحيل القيد التجريبي.")}><BookOpenCheck /> اعتماد وترحيل تجريبي</button></article>)}</div></Panel>}<div className="demo-tabs demo-accounting-tabs" role="tablist" aria-label="شاشات المحاسبة"><button type="button" role="tab" aria-selected={tab === "chart"} className={tab === "chart" ? "is-active" : ""} onClick={() => setTab("chart")}>دليل الحسابات</button><button type="button" role="tab" aria-selected={tab === "journal"} className={tab === "journal" ? "is-active" : ""} onClick={() => setTab("journal")}>قيد يومية</button><button type="button" role="tab" aria-selected={tab === "ledger"} className={tab === "ledger" ? "is-active" : ""} onClick={() => setTab("ledger")}>الأستاذ العام</button><button type="button" role="tab" aria-selected={tab === "trial"} className={tab === "trial" ? "is-active" : ""} onClick={() => setTab("trial")}>ميزان المراجعة</button></div>
    {tab === "chart" && <Panel title="دليل الحسابات" subtitle="تصنيف وأرصدة الحسابات الخاصة بالشركة الحالية فقط"><div className="demo-table-wrap"><table className="demo-table"><thead><tr><th>الكود</th><th>اسم الحساب</th><th>التصنيف</th><th>الرصيد الحالي</th></tr></thead><tbody>{balances.map(balance => <tr key={balance.account.id}><td><strong>{balance.account.code}</strong></td><td>{balance.account.name}</td><td><span className={`demo-account-type is-${balance.account.type.toLowerCase()}`}>{accountTypeLabel(balance.account.type)}</span></td><td>{money(Math.abs(balance.balanceMinor), organization.currency)}</td></tr>)}</tbody></table></div></Panel>}
    {tab === "journal" && <Panel title="إنشاء وترحيل قيد تجريبي" subtitle="القيم تحفظ كأعداد صحيحة بوحدة القرش داخل العرض، ولا توجد كتابة في قاعدة بيانات"><form className="demo-form" onSubmit={postJournal}><div className="demo-form-row"><Field name="date" label="التاريخ" type="date" required value={journalMeta.date} onChange={event => setJournalMeta(current => ({ ...current, date: event.target.value }))}/><Field name="reference" label="المرجع" required minLength={2} maxLength={40} value={journalMeta.reference} onChange={event => setJournalMeta(current => ({ ...current, reference: event.target.value }))}/></div><Field name="memo" label="البيان" required minLength={3} maxLength={240} value={journalMeta.memo} onChange={event => setJournalMeta(current => ({ ...current, memo: event.target.value }))}/><div className="demo-journal-lines"><div className="demo-journal-head"><span>الحساب</span><span>الوصف</span><span>مدين</span><span>دائن</span><span>إزالة</span></div>{lines.map((line, index) => <div className="demo-journal-row" key={line.id}><select aria-label={`حساب السطر ${index + 1}`} value={line.accountId} onChange={event => updateLine(index, { accountId: event.target.value })}>{accounts.map(account => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}</select><input aria-label={`وصف السطر ${index + 1}`} maxLength={180} value={line.description} onChange={event => updateLine(index, { description: event.target.value })} placeholder="وصف السطر"/><input aria-label={`مدين السطر ${index + 1}`} type="number" min="0" step="0.01" value={line.debitMinor / 100 || ""} onChange={event => updateLine(index, { debitMinor: Math.round(Number(event.target.value || 0) * 100), creditMinor: 0 })}/><input aria-label={`دائن السطر ${index + 1}`} type="number" min="0" step="0.01" value={line.creditMinor / 100 || ""} onChange={event => updateLine(index, { creditMinor: Math.round(Number(event.target.value || 0) * 100), debitMinor: 0 })}/><button type="button" className="demo-line-remove" aria-label={`حذف السطر ${index + 1}`} disabled={lines.length <= 2} onClick={() => removeLine(index)}><Trash2 /></button></div>)}</div><button type="button" className="demo-secondary" onClick={() => setLines(current => [...current, { id: crypto.randomUUID(), accountId: accounts[0]?.id ?? "", description: "", debitMinor: 0, creditMinor: 0 }])}>إضافة سطر</button><div className={`demo-journal-total ${isBalanced(lines) ? "is-balanced" : ""}`}><span>إجمالي المدين: {money(debit, organization.currency)}</span><span>إجمالي الدائن: {money(credit, organization.currency)}</span><strong>{isBalanced(lines) ? "القيد متوازن وجاهز للترحيل" : `الفرق: ${money(Math.abs(debit - credit), organization.currency)}`}</strong></div><button type="submit" className="demo-primary" disabled={!isBalanced(lines)}><BookOpenCheck /> ترحيل إلى الأستاذ التجريبي</button>{notice && <p className="demo-success" role="status"><CheckCircle2 /> {notice}</p>}</form></Panel>}
    {tab === "ledger" && <Panel title="الأستاذ العام" subtitle="حركات الحساب المحدد من القيود المرحلة فقط"><div className="demo-ledger-toolbar"><label>الحساب<select value={ledgerAccountId} onChange={event => setLedgerAccountId(event.target.value)}>{accounts.map(account => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}</select></label><div><span>إجمالي المدين<strong>{money(selectedBalance?.debitTurnoverMinor ?? 0, organization.currency)}</strong></span><span>إجمالي الدائن<strong>{money(selectedBalance?.creditTurnoverMinor ?? 0, organization.currency)}</strong></span><span>الرصيد الختامي<strong>{money(Math.abs(selectedBalance?.balanceMinor ?? 0), organization.currency)}</strong></span></div></div><div className="demo-table-wrap"><table className="demo-table"><thead><tr><th>التاريخ</th><th>المرجع</th><th>البيان</th><th>مدين</th><th>دائن</th><th>الرصيد الجاري</th></tr></thead><tbody>{ledgerRows.map(({ entry, line, runningMinor: running }) => <tr key={line.id}><td>{entry.date}</td><td>{entry.reference}</td><td>{line.description || entry.memo}</td><td>{line.debitMinor ? money(line.debitMinor, organization.currency) : "—"}</td><td>{line.creditMinor ? money(line.creditMinor, organization.currency) : "—"}</td><td><strong>{money(Math.abs(running), organization.currency)} {running >= 0 ? "مدين" : "دائن"}</strong></td></tr>)}</tbody></table>{!ledgerRows.length && <EmptyState icon={<NotebookTabs />} text={`لا توجد حركات للحساب ${selectedAccount?.name ?? "المحدد"}.`}/>}</div></Panel>}
    {tab === "trial" && <TrialBalance report={report} currency={organization.currency}/>}
  </div>;
}

function BankWorkflow() {
  const { state, service, execute } = useDemo();
  const organization = state.organizations.find(item => item.id === state.currentOrganizationId)!;
  const accounts = state.accounts.filter(item => item.organizationId === state.currentOrganizationId);
  const mappableAccounts = accounts.filter(item => item.code !== "1110");
  const rows = state.bankRows.filter(item => item.organizationId === state.currentOrganizationId);
  const drafts = state.journals.filter(item => item.organizationId === state.currentOrganizationId && item.source === "BANK_DEMO");
  const step = drafts.some(item => item.status === "POSTED") ? 6 : drafts.length ? 5 : rows.some(row => row.state === "SUGGESTED") ? 3 : 2;
  const createDraft = async (rowId: string) => {
    const result = await execute("banking", () => service.createBankDraft(rowId), "تم إنشاء مسودة قيد وتنتظر المراجعة البشرية.");
    if (result.ok) void execute("navigate", () => service.navigate("accounting"));
  };
  return <div className="demo-stack">
    <div className="demo-disclaimer"><ShieldCheck /><p><strong>محاكاة ببيانات مصطنعة فقط.</strong> لم يتم رفع PDF أو Excel، ولا يوجد AI أو n8n أو بنك متصل.</p></div>
    <ol className="demo-steps">{["عينة جاهزة", "استخراج محاكى", "ربط الحساب", "اقتراح", "مراجعة بشرية", "ترحيل تجريبي", "تقارير"].map((label, index) => <li className={index <= step ? "is-active" : ""} key={label}><span>{index + 1}</span><strong>{label}</strong></li>)}</ol>
    <Panel title="حركات كشف الحساب الافتراضي" subtitle="اربط الحركة بحساب، ثم حوّل الاقتراح إلى مسودة تحتاج موافقة بشرية">
      <div className="demo-table-wrap"><table className="demo-table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>القيمة</th><th>الحساب المقترح</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>{rows.map(row => {
        const draft = drafts.find(item => item.reference === `BANK-${row.id}`);
        return <tr key={row.id}><td>{row.date}</td><td>{row.description}</td><td className={row.direction === "IN" ? "demo-positive" : "demo-negative"}>{row.direction === "IN" ? "+" : "-"}{money(row.amountMinor, organization.currency)}</td><td><select aria-label={`ربط ${row.description} بحساب`} value={row.mappedAccountId || ""} onChange={event => { if (event.target.value) void execute("banking", () => service.createBankSuggestion(row.id, event.target.value), "تم ربط الصف وإنشاء اقتراح محلي."); }}><option value="">اختر الحساب</option>{mappableAccounts.map(account => <option value={account.id} key={account.id}>{account.code} — {account.name}</option>)}</select></td><td><span className={`demo-status ${draft?.status === "POSTED" ? "is-approved" : "is-in_review"}`}>{draft?.status === "POSTED" ? "مُرحّل" : draft ? "مسودة للمراجعة" : row.state === "SUGGESTED" ? "اقتراح جاهز" : "بانتظار الربط"}</span></td><td><button type="button" className="demo-text-button" disabled={row.state !== "SUGGESTED" || Boolean(draft)} onClick={() => void createDraft(row.id)}>{draft ? "تم إنشاء المسودة" : "إنشاء مسودة"}</button></td></tr>;
      })}</tbody></table>{!rows.length && <EmptyState icon={<Landmark />} text="لا توجد عينة كشف حساب لهذه الشركة."/>}</div>
    </Panel>
    <Panel title="بوابة المراجعة البشرية" subtitle="لا يرحّل العرض أي اقتراح تلقائيًا"><div className="demo-suggestion"><NotebookTabs /><div><strong>{drafts.length ? `${drafts.length} مسودة مرتبطة بكشف البنك` : "اربط حركة وأنشئ مسودة أولًا"}</strong><p>افتح شاشة القيود لمراجعة طرفي القيد، ثم وافق على الترحيل التجريبي. التكرار محمي.</p></div><button className="demo-secondary" disabled={!drafts.length} onClick={() => void execute("navigate", () => service.navigate("accounting"))}>فتح المراجعة البشرية</button></div></Panel>
  </div>;
}

function Reports() {
  const { state } = useDemo();
  const organization = state.organizations.find(item => item.id === state.currentOrganizationId)!;
  const report = buildDemoReport(state, state.currentOrganizationId);
  const [view, setView] = useState<"income" | "position" | "trial">("income");
  const [downloaded, setDownloaded] = useState(false);
  const download = () => {
    const rows = [["Money Coder Demo Export"], ["Company", organization.tradeName], ["Currency", organization.currency], ["Revenue", decimalMoney(report.revenueMinor)], ["Expenses", decimalMoney(report.expenseMinor)], ["Profit", decimalMoney(report.profitMinor)], ["Assets", decimalMoney(report.assetsMinor)], ["Liabilities", decimalMoney(report.liabilitiesMinor)], ["Equity including current profit", decimalMoney(report.equityMinor)], ["Notice", "Synthetic demo data only"]];
    const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const blob = new Blob(["\uFEFF" + rows.map(row => row.map(escapeCsv).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "money-coder-demo-report.csv"; anchor.click(); URL.revokeObjectURL(url);
    setDownloaded(true);
  };
  return <div className="demo-stack"><div className="demo-toolbar"><div className="demo-tabs" role="tablist" aria-label="التقارير المالية"><button type="button" role="tab" aria-selected={view === "income"} className={view === "income" ? "is-active" : ""} onClick={() => setView("income")}>قائمة الدخل</button><button type="button" role="tab" aria-selected={view === "position"} className={view === "position" ? "is-active" : ""} onClick={() => setView("position")}>المركز المالي</button><button type="button" role="tab" aria-selected={view === "trial"} className={view === "trial" ? "is-active" : ""} onClick={() => setView("trial")}>ميزان المراجعة</button></div><button type="button" className="demo-secondary" onClick={download}><ArrowDownToLine /> تنزيل CSV تجريبي</button></div>{downloaded && <p className="demo-success" role="status"><CheckCircle2 /> تم تجهيز ملف CSV بقيم عشرية وبيانات مصطنعة فقط.</p>}{view === "income" && <div className="demo-stack"><div className="demo-grid-3"><Kpi icon={<BarChart3/>} label="الإيرادات" value={money(report.revenueMinor, organization.currency)} tone="teal"/><Kpi icon={<Banknote/>} label="المصروفات" value={money(report.expenseMinor, organization.currency)} tone="blue"/><Kpi icon={<BadgeCheck/>} label="صافي الربح" value={money(report.profitMinor, organization.currency)} tone="gold"/></div><Panel title="قائمة دخل مختصرة" subtitle="من القيود المرحلة للشركة الحالية فقط"><dl className="demo-report-list"><div><dt>إيرادات النشاط</dt><dd>{money(report.revenueMinor, organization.currency)}</dd></div><div><dt>تكلفة ومصروفات النشاط</dt><dd>({money(report.expenseMinor, organization.currency)})</dd></div><div className="total"><dt>صافي الربح التجريبي</dt><dd>{money(report.profitMinor, organization.currency)}</dd></div></dl></Panel></div>}{view === "position" && <div className="demo-stack"><div className="demo-grid-3"><Kpi icon={<Building2/>} label="الأصول" value={money(report.assetsMinor, organization.currency)} tone="teal"/><Kpi icon={<WalletCards/>} label="الالتزامات" value={money(report.liabilitiesMinor, organization.currency)} tone="blue"/><Kpi icon={<ShieldCheck/>} label="حقوق الملكية + الربح" value={money(report.equityMinor, organization.currency)} tone="gold"/></div><Panel title="معادلة المركز المالي" subtitle="حقوق الملكية المعروضة تشمل نتيجة الفترة الحالية"><dl className="demo-report-list"><div><dt>إجمالي الأصول</dt><dd>{money(report.assetsMinor, organization.currency)}</dd></div><div><dt>إجمالي الالتزامات</dt><dd>{money(report.liabilitiesMinor, organization.currency)}</dd></div><div><dt>حقوق الملكية شاملة نتيجة الفترة</dt><dd>{money(report.equityMinor, organization.currency)}</dd></div><div className="total"><dt>الالتزامات + حقوق الملكية</dt><dd>{money(report.liabilitiesMinor + report.equityMinor, organization.currency)}</dd></div></dl><p className={`demo-equation ${report.assetsMinor === report.liabilitiesMinor + report.equityMinor ? "is-balanced" : "is-unbalanced"}`}><BadgeCheck /> {report.assetsMinor === report.liabilitiesMinor + report.equityMinor ? "المعادلة متوازنة" : "المعادلة تحتاج مراجعة"}</p></Panel></div>}{view === "trial" && <TrialBalance report={report} currency={organization.currency}/>}<p className="demo-footnote">تقارير العرض مبنية فقط على القيود الاصطناعية المرحلة، وليست قوائم مالية معتمدة أو نصيحة مالية.</p></div>;
}

function Plans() {
  const plans = [
    { name: "شركة ناشئة", price: "سعر توضيحي", features: ["شركة واحدة", "فريق صغير", "مركز مستندات"] },
    { name: "شركة نامية", price: "سعر توضيحي", features: ["صلاحيات موسعة", "تقارير تجريبية", "سير مراجعة"] },
    { name: "مكتب محاسبة", price: "تواصل لاحقًا", features: ["عدة شركات", "تعيين الموظفين", "عزل سياق العملاء"] },
  ];
  return <div className="demo-stack"><div className="demo-disclaimer"><Banknote /><p><strong>معاينة غير ملزمة.</strong> لا توجد بوابة دفع، ولا يتم جمع بطاقات أو إنشاء اشتراكات.</p></div><div className="demo-plan-grid">{plans.map((plan, index) => <article className={index === 1 ? "is-featured" : ""} key={plan.name}><span>{index === 1 ? "الأكثر ملاءمة للعرض" : "خطة توضيحية"}</span><h2>{plan.name}</h2><strong>{plan.price}</strong><ul>{plan.features.map(feature => <li key={feature}><CheckCircle2 /> {feature}</li>)}</ul><button disabled>الاشتراك غير متاح في وضع العرض</button></article>)}</div><Panel title="عقد التكامل المستقبلي" subtitle="الفوترة ستُنفذ من خلال API محمي وبوابة دفع يختارها فريق الـBackend"><p className="demo-copy">تم توثيق plans، subscriptions، usage وinvoices كعقود مستقبلية. لا يتضمن هذا العرض أي منطق تحصيل أو بيانات دفع.</p></Panel></div>;
}

function SettingsHelp() {
  const { state, service, execute } = useDemo();
  return <div className="demo-grid-2 demo-align-start"><div className="demo-stack"><Panel title="إعدادات جلسة العرض"><label className="demo-toggle"><input type="checkbox" checked={state.persistenceEnabled} onChange={event => void execute("settings", () => service.setPersistence(event.target.checked), event.target.checked ? "تم تفعيل الحفظ المحلي للبيانات المصطنعة." : "تم إيقاف الحفظ المحلي وحذف نسخته.")}/><span/><div><strong>حفظ محلي اختياري</strong><p>يحفظ البيانات الاصطناعية فقط في هذا المتصفح. الوضع الافتراضي بلا حفظ.</p></div></label><button type="button" className="demo-danger" onClick={() => window.confirm("هل تريد حذف تغييرات العرض والعودة للبيانات الأساسية؟") && void execute("settings", () => service.reset(), "عادت بيانات العرض إلى نقطة البداية.")}><RefreshCcw /> إعادة بيانات العرض</button></Panel><Panel title="الأدوار المتاحة"><div className="demo-role-list">{Object.entries(roleLabels).map(([role, label]) => <button type="button" key={role} className={state.currentRole === role ? "is-active" : ""} onClick={() => void execute("switch-context", () => service.switchRole(role as DemoRole), `تم تبديل الدور إلى ${label}.`)}><Users /><span><strong>{label}</strong><small>تبديل محاكاة فقط — ليس تسجيل دخول</small></span></button>)}</div></Panel></div><div className="demo-stack"><Panel title="دليل التجربة"><ol className="demo-help-list"><li><span>1</span>اختر رحلة مالك الشركة أو مكتب المحاسبة أو المحاسب.</li><li><span>2</span>ابدأ المراجعة، واطلب تصحيحًا ثم أعد تقديم المستند واعتمده.</li><li><span>3</span>أنشئ قيدًا متوازنًا وراقب الأستاذ والميزان والتقارير.</li><li><span>4</span>نفّذ Reset للعودة إلى نقطة البداية.</li></ol></Panel><Panel title="حالة الوحدات"><div className="demo-readiness"><p><CheckCircle2 /> <strong>يعمل في العرض:</strong> البيانات، المستندات، المراجعة، القيود والتقارير.</p><p><FileClock /> <strong>محاكاة معلّمة:</strong> الرفع، استخراج كشف البنك، الإشعارات.</p><p><X /> <strong>غير متصل:</strong> Neon، SMTP، S3، n8n، الدفع.</p></div></Panel><Panel title="مساعدة"><p className="demo-copy">هذه التجربة مخصصة لشرح رحلة المنتج. راجع ملفات BACKEND_HANDOFF وINTEGRATION_CHECKLIST قبل توصيل أي خدمة حقيقية.</p><Link className="demo-secondary" href="/">العودة إلى الموقع</Link></Panel></div></div>;
}

function TrialBalance({ report, currency }: { report: DemoReport; currency: string }) {
  const debit = report.trialBalance.reduce((sum, row) => sum + row.debitMinor, 0); const credit = report.trialBalance.reduce((sum, row) => sum + row.creditMinor, 0);
  const difference = debit - credit;
  return <div className="demo-stack"><section className={`demo-trial-summary ${difference === 0 ? "is-balanced" : "is-unbalanced"}`} aria-label="حالة ميزان المراجعة"><div><span>إجمالي المدين</span><strong>{money(debit, currency)}</strong></div><div><span>إجمالي الدائن</span><strong>{money(credit, currency)}</strong></div><div><span>الفرق</span><strong>{money(Math.abs(difference), currency)}</strong></div><p><BadgeCheck /> {difference === 0 ? "ميزان المراجعة متساوٍ" : "يوجد فرق يحتاج مراجعة"}</p></section><div className="demo-table-wrap"><table className="demo-table"><thead><tr><th>الكود</th><th>الحساب</th><th>مدين</th><th>دائن</th></tr></thead><tbody>{report.trialBalance.map(row => <tr key={row.account.id}><td>{row.account.code}</td><td>{row.account.name}</td><td>{row.debitMinor ? money(row.debitMinor, currency) : "—"}</td><td>{row.creditMinor ? money(row.creditMinor, currency) : "—"}</td></tr>)}</tbody><tfoot><tr><th colSpan={2}>الإجمالي</th><th>{money(debit, currency)}</th><th>{money(credit, currency)}</th></tr></tfoot></table></div></div>;
}

function ActivityFeed({ global = false }: { global?: boolean }) {
  const { state } = useDemo();
  const items = state.audit.filter(item => global || !item.organizationId || item.organizationId === state.currentOrganizationId).slice(0, 6);
  return <div className="demo-activity-list">{items.map(item => { const organization = state.organizations.find(organizationItem => organizationItem.id === item.organizationId); return <article key={item.id}><span><Activity /></span><div><strong>{auditLabels[item.action] ?? item.action.replaceAll("_", " ")}</strong><p>{item.actor}{global && organization ? ` · ${organization.tradeName}` : ""}</p></div><small>{new Date(item.at).toLocaleString("ar-EG")}</small></article>; })}</div>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) { return <section className="demo-panel"><header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></header>{children}</section>; }
function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) { return <article className={`demo-kpi is-${tone}`}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article>; }
function Field({ label, name, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) { return <label>{label}<input name={name} {...props}/></label>; }
function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="demo-empty">{icon}<strong>{text}</strong><small>جرّب تغيير المرشحات أو الشركة الحالية.</small></div>; }
function categoryLabel(category: string) { return ({ BANK_STATEMENT: "كشف حساب", INVOICE: "فاتورة", CONTRACT: "عقد", TAX: "ضريبي", OTHER: "أخرى" } as Record<string, string>)[category] ?? category; }
function accountTypeLabel(type: string) { return ({ ASSET: "أصل", LIABILITY: "التزام", EQUITY: "حقوق ملكية", REVENUE: "إيراد", EXPENSE: "مصروف" } as Record<string, string>)[type] ?? type; }
