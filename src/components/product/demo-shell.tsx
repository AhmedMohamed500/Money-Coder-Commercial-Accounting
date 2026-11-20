"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Activity, ArrowDownToLine, BadgeCheck, Banknote, BarChart3, Bell, BookOpenCheck,
  BriefcaseBusiness, Building2, CheckCircle2, ChevronLeft, ClipboardCheck,
  FileCheck2, FileClock, FileText, Landmark, LayoutDashboard, Menu,
  NotebookTabs, RefreshCcw, Save, Search, Settings, ShieldCheck, Upload, Users, WalletCards, X,
} from "lucide-react";
import { useDemo } from "@/demo/state/demo-provider";
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

const statusLabels: Record<ReviewStatus, string> = {
  READY_FOR_REVIEW: "جاهز للمراجعة",
  IN_REVIEW: "قيد المراجعة",
  CORRECTION_REQUESTED: "مطلوب تصحيح",
  RESUBMITTED: "أعيد التقديم",
  APPROVED: "معتمد",
  REJECTED: "مرفوض",
};

function money(value: number, currency = "EGP") {
  return new Intl.NumberFormat("ar-EG", { style: "currency", currency, maximumFractionDigits: 0 }).format(value / 100);
}

export function DemoShell() {
  const { state, service } = useDemo();
  const [menuOpen, setMenuOpen] = useState(false);
  const organization = state.organizations.find(item => item.id === state.currentOrganizationId)!;
  const currentSection = sectionItems.find(item => item.id === state.currentSection)!;

  const navigate = (section: DemoSection) => { service.navigate(section); setMenuOpen(false); };

  return (
    <div className="demo-app" dir="rtl">
      <a href="#demo-main" className="demo-skip">انتقل إلى المحتوى</a>
      <header className="demo-topbar">
        <div className="demo-brand"><span className="demo-brand-mark">▥</span><span><strong>Money Coder</strong><small>Interactive Product Demo</small></span></div>
        <div className="demo-mode-badge"><span /> وضع تجريبي — بيانات افتراضية</div>
        <div className="demo-top-actions">
          <label><span>الدور التجريبي</span><select value={state.currentRole} onChange={event => service.switchRole(event.target.value as DemoRole)}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>الشركة</span><select value={state.currentOrganizationId} onChange={event => service.switchOrganization(event.target.value)}>{state.organizations.map(item => <option value={item.id} key={item.id}>{item.tradeName}</option>)}</select></label>
          <button className="demo-reset" type="button" onClick={() => window.confirm("إعادة جميع بيانات العرض إلى خط البداية؟") && service.reset()}><RefreshCcw /> إعادة العرض</button>
          <button className="demo-menu-button" type="button" aria-label="فتح قائمة العرض" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      <aside className={`demo-sidebar ${menuOpen ? "is-open" : ""}`} aria-label="وحدات العرض">
        <nav>{sectionItems.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={state.currentSection === id ? "is-active" : ""} onClick={() => navigate(id)}><Icon /><span>{label}</span>{state.currentSection === id && <ChevronLeft />}</button>)}</nav>
        <div className="demo-safety"><ShieldCheck /><div><strong>معزول عن الإنتاج</strong><small>لا قاعدة بيانات، لا رفع حقيقي، لا مدفوعات.</small></div></div>
        <Link href="/">العودة إلى الموقع</Link>
      </aside>

      <main id="demo-main" className="demo-main">
        <div className="demo-page-heading"><div><span>{currentSection.label}</span><h1>{organization.tradeName}</h1><p>أنت تستعرض دور: {roleLabels[state.currentRole]} — جميع الأسماء والأرقام افتراضية.</p></div><div className="demo-heading-actions"><span><Bell /> {state.notifications.filter(note => !note.read && (!note.organizationId || note.organizationId === organization.id)).length}</span><span><Activity /> {state.audit.filter(item => !item.organizationId || item.organizationId === organization.id).length} نشاط</span></div></div>
        {state.currentSection === "overview" && <Overview />}
        {state.currentSection === "company" && <CompanySetup />}
        {state.currentSection === "office" && <OfficeCenter />}
        {state.currentSection === "documents" && <DocumentCenter />}
        {state.currentSection === "reviews" && <ReviewCenter />}
        {state.currentSection === "accounting" && <AccountingCore />}
        {state.currentSection === "banking" && <BankWorkflow />}
        {state.currentSection === "reports" && <Reports />}
        {state.currentSection === "plans" && <Plans />}
        {state.currentSection === "settings" && <SettingsHelp />}
      </main>
      <footer className="demo-footer-mobile">وضع تجريبي — لا توجد اتصالات بخدمات الإنتاج</footer>
    </div>
  );
}

function Overview() {
  const { state, service } = useDemo();
  const organization = state.organizations.find(item => item.id === state.currentOrganizationId)!;
  const report = service.report();
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
  const { state, service } = useDemo();
  const organization = state.organizations.find(item => item.id === state.currentOrganizationId)!;
  const [saved, setSaved] = useState(false);
  return <div className="demo-grid-2 demo-align-start">
    <Panel title="ملف الشركة التجريبي" subtitle="التعديل يخص جلسة العرض فقط"><form className="demo-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); service.saveCompanyProfile({ tradeName: String(form.get("tradeName")), industry: String(form.get("industry")), currency: form.get("currency") as "EGP" | "USD" }); setSaved(true); }}><Field label="الاسم التجاري" name="tradeName" defaultValue={organization.tradeName}/><Field label="النشاط" name="industry" defaultValue={organization.industry}/><label>العملة الأساسية<select name="currency" defaultValue={organization.currency}><option value="EGP">EGP — جنيه مصري</option><option value="USD">USD — دولار أمريكي</option></select></label><div className="demo-form-row"><Field label="بداية السنة المالية" name="start" defaultValue={organization.fiscalYearStart} readOnly/><Field label="نهاية السنة المالية" name="end" defaultValue={organization.fiscalYearEnd} readOnly/></div><button className="demo-primary" type="submit"><Save /> حفظ داخل العرض</button>{saved && <p className="demo-success" role="status"><CheckCircle2 /> تم تحديث بيانات العرض.</p>}</form></Panel>
    <div className="demo-stack"><Panel title="الفريق والصلاحيات" subtitle="معاينة فقط — ليست مصادقة حقيقية"><div className="demo-people">{organization.staff.map(member => <article key={member.id}><span>{member.name.slice(0, 1)}</span><div><strong>{member.name}</strong><small>{member.role}</small><p>{member.permissions.join(" · ")}</p></div></article>)}</div></Panel><Panel title="الملفات البنكية"><div className="demo-bank-cards">{organization.bankProfiles.map(bank => <article key={bank.id}><Landmark /><div><strong>{bank.bankName}</strong><p>{bank.accountLabel}</p><small>{bank.currency} · عرض فقط</small></div></article>)}</div></Panel><Panel title="بيانات قانونية افتراضية"><dl className="demo-definition"><div><dt>السجل التجاري</dt><dd>{organization.commercialRegister}</dd></div><div><dt>الرقم الضريبي</dt><dd>{organization.taxNumber}</dd></div><div><dt>حجم الشركة</dt><dd>{organization.size}</dd></div></dl></Panel></div>
  </div>;
}

function OfficeCenter() {
  const { state, service } = useDemo();
  const [mode, setMode] = useState<"portfolio" | "assignments">("portfolio");
  return <div className="demo-stack"><div className="demo-callout"><BriefcaseBusiness /><div><strong>{state.office.name}</strong><p>مكتب واحد يدير ثلاث شركات افتراضية مع عزل كامل للسياق داخل العرض.</p></div><div className="demo-segment"><button className={mode === "portfolio" ? "is-active" : ""} onClick={() => setMode("portfolio")}>محفظة العملاء</button><button className={mode === "assignments" ? "is-active" : ""} onClick={() => setMode("assignments")}>التعيينات</button></div></div>
    {mode === "portfolio" ? <div className="demo-portfolio">{state.organizations.map(organization => { const reviews = state.reviews.filter(item => item.organizationId === organization.id); const active = organization.id === state.currentOrganizationId; return <button type="button" key={organization.id} className={active ? "is-active" : ""} onClick={() => service.switchOrganization(organization.id)}><header><Building2 /><span className="demo-status is-approved">تفويض نشط</span></header><h2>{organization.tradeName}</h2><p>{organization.industry} · {organization.size}</p><dl><div><dt>قيد المراجعة</dt><dd>{reviews.filter(item => !["APPROVED", "REJECTED"].includes(item.status)).length}</dd></div><div><dt>الفريق</dt><dd>{organization.staff.length}</dd></div></dl><span className="demo-card-action">{active ? "الشركة الحالية" : "التبديل لهذه الشركة"}</span></button>; })}</div> : <div className="demo-grid-2"><Panel title="فريق المكتب"><div className="demo-people">{state.office.staff.map(member => <article key={member.id}><span>{member.name.slice(0, 1)}</span><div><strong>{member.name}</strong><small>{member.role}</small><p>{member.assignedOrganizationIds.map(id => state.organizations.find(item => item.id === id)?.tradeName).join("، ")}</p></div></article>)}</div></Panel><Panel title="نطاقات التفويض"><div className="demo-permissions">{state.office.engagements.map(engagement => <article key={engagement.organizationId}><div><strong>{state.organizations.find(item => item.id === engagement.organizationId)?.tradeName}</strong><small>{engagement.status === "ACTIVE" ? "نشط" : "معلق"}</small></div><p>{engagement.permissions.join(" · ")}</p></article>)}</div></Panel></div>}
    <Panel title="سجل نشاط المكتب"><ActivityFeed global /></Panel>
  </div>;
}

function DocumentCenter() {
  const { state, service } = useDemo();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [uploadOpen, setUploadOpen] = useState(false);
  const documents = state.documents.filter(item => item.organizationId === state.currentOrganizationId).filter(item => (status === "ALL" || item.status === status) && item.title.includes(query));
  return <div className="demo-stack"><div className="demo-toolbar"><label className="demo-search"><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث في المستندات"/></label><select value={status} onChange={event => setStatus(event.target.value)} aria-label="تصفية حالة المستند"><option value="ALL">كل الحالات</option>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><button className="demo-primary" type="button" onClick={() => setUploadOpen(value => !value)}><Upload /> إضافة عينة</button></div>
    {uploadOpen && <Panel title="محاكاة رفع مستند" subtitle="لا يتم قراءة الملف أو رفعه؛ نضيف سجل عينة فقط"><form className="demo-inline-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); service.simulateUpload({ title: String(form.get("title")), category: form.get("category") as "BANK_STATEMENT" | "INVOICE" | "CONTRACT" | "TAX" | "OTHER" }); setUploadOpen(false); }}><Field label="عنوان العينة" name="title" defaultValue="مستند جديد — عينة"/><label>التصنيف<select name="category"><option value="INVOICE">فاتورة</option><option value="BANK_STATEMENT">كشف حساب</option><option value="CONTRACT">عقد</option><option value="TAX">ضريبي</option><option value="OTHER">أخرى</option></select></label><label>ملف محلي اختياري<input type="file" accept=".pdf,.xlsx" onChange={event => { event.currentTarget.value = ""; }} aria-describedby="local-file-note"/></label><p id="local-file-note">للسلامة لا يقرأ العرض الملف المختار ولا يخزنه.</p><button className="demo-primary">إنشاء سجل العينة</button></form></Panel>}
    <div className="demo-table-wrap"><table className="demo-table"><thead><tr><th>المستند</th><th>التصنيف</th><th>الإصدار</th><th>الحالة</th><th>المسند إليه</th><th>إجراء</th></tr></thead><tbody>{documents.map(document => <tr key={document.id}><td><strong>{document.title}</strong><small>{document.versions.at(-1)?.fileLabel}</small></td><td>{categoryLabel(document.category)}</td><td>v{document.versions.at(-1)?.version}</td><td><span className={`demo-status is-${document.status.toLowerCase()}`}>{statusLabels[document.status]}</span></td><td>{document.assignedTo || "غير معيّن"}</td><td><button className="demo-text-button" onClick={() => service.navigate("reviews")}>فتح المراجعة</button></td></tr>)}</tbody></table>{!documents.length && <EmptyState icon={<FileText />} text="لا توجد نتائج مطابقة."/>}</div>
  </div>;
}

function ReviewCenter() {
  const { state, service } = useDemo();
  const reviews = state.reviews.filter(item => item.organizationId === state.currentOrganizationId);
  const [selectedId, setSelectedId] = useState(reviews[0]?.id ?? "");
  const selected = reviews.find(item => item.id === selectedId) ?? reviews[0];
  const document = selected && state.documents.find(item => item.id === selected.documentId);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  if (!selected || !document) return <EmptyState icon={<ClipboardCheck />} text="لا توجد حالات مراجعة لهذه الشركة."/>;
  const transition = (status: "CORRECTION_REQUESTED" | "RESUBMITTED" | "APPROVED" | "REJECTED", fallback: string) => { try { service.transitionReview(selected.id, status, comment.trim() || fallback); setComment(""); setMessage(`تم تنفيذ: ${statusLabels[status]}`); } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر تنفيذ الإجراء"); } };
  return <div className="demo-review-layout"><aside className="demo-review-list" aria-label="قائمة المراجعات">{reviews.map(review => { const doc = state.documents.find(item => item.id === review.documentId)!; return <button key={review.id} className={selected.id === review.id ? "is-active" : ""} onClick={() => setSelectedId(review.id)}><span className={`demo-status is-${review.status.toLowerCase()}`}>{statusLabels[review.status]}</span><strong>{doc.title}</strong><small>{review.assignedTo}</small></button>; })}</aside><div className="demo-stack"><Panel title={document.title} subtitle={`نسخة ${document.versions.at(-1)?.version} · ${categoryLabel(document.category)}`}><div className="demo-review-summary"><div className="demo-document-preview"><FileCheck2 /><strong>معاينة مستند تجريبي</strong><span>{document.versions.at(-1)?.fileLabel}</span><small>لا يوجد ملف حقيقي أو رابط تخزين</small></div><div className="demo-review-controls"><label>إسناد المراجع<select value={selected.assignedTo} onChange={event => service.assignReview(selected.id, event.target.value)}>{state.office.staff.map(member => <option key={member.id}>{member.name}</option>)}</select></label><label>تعليق أو سبب<textarea value={comment} onChange={event => setComment(event.target.value)} placeholder="اكتب ملاحظة واضحة"/></label><div className="demo-action-grid"><button onClick={() => transition("CORRECTION_REQUESTED", "يرجى تصحيح المستند وإعادة تقديمه.")}>طلب تصحيح</button><button onClick={() => transition("RESUBMITTED", "تم رفع نسخة تجريبية مصححة.")}>إعادة تقديم</button><button className="approve" onClick={() => transition("APPROVED", "تمت مراجعة العينة واعتمادها تجريبيًا.")}>اعتماد</button><button className="reject" onClick={() => transition("REJECTED", "رُفضت العينة في وضع العرض.")}>رفض</button></div>{message && <p className="demo-success" role="status">{message}</p>}</div></div></Panel><div className="demo-grid-2"><Panel title="التعليقات"><div className="demo-comments">{selected.comments.map(item => <article key={item.id}><span>{item.author.slice(0, 1)}</span><div><strong>{item.author}</strong><p>{item.body}</p><small>{new Date(item.createdAt).toLocaleString("ar-EG")}</small></div></article>)}{!selected.comments.length && <p>لا توجد تعليقات بعد.</p>}</div></Panel><Panel title="مسار الحالة"><ol className="demo-timeline">{selected.timeline.map(item => <li key={item.id}><span/><div><strong>{item.label}</strong><p>{item.actor}</p><small>{new Date(item.at).toLocaleString("ar-EG")}</small></div></li>)}</ol></Panel></div></div></div>;
}

function AccountingCore() {
  const { state, service } = useDemo();
  const organization = state.organizations.find(item => item.id === state.currentOrganizationId)!;
  const accounts = state.accounts.filter(item => item.organizationId === organization.id);
  const report = service.report();
  const [tab, setTab] = useState<"journal" | "ledger" | "trial">("journal");
  const [lines, setLines] = useState<JournalLine[]>([
    { id: "new-line-1", accountId: accounts[0]?.id ?? "", description: "", debitMinor: 0, creditMinor: 0 },
    { id: "new-line-2", accountId: accounts[5]?.id ?? "", description: "", debitMinor: 0, creditMinor: 0 },
  ]);
  const [notice, setNotice] = useState("");
  const debit = sumJournalSide(lines, "DEBIT"); const credit = sumJournalSide(lines, "CREDIT");
  const updateLine = (index: number, patch: Partial<JournalLine>) => setLines(current => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  return <div className="demo-stack"><div className="demo-tabs" role="tablist"><button className={tab === "journal" ? "is-active" : ""} onClick={() => setTab("journal")}>قيد جديد</button><button className={tab === "ledger" ? "is-active" : ""} onClick={() => setTab("ledger")}>دفتر الأستاذ</button><button className={tab === "trial" ? "is-active" : ""} onClick={() => setTab("trial")}>ميزان المراجعة</button></div>
    {tab === "journal" && <Panel title="إنشاء وترحيل قيد تجريبي" subtitle="الحسابات بالأرقام الصحيحة بوحدة القرش — لا توجد كتابة في قاعدة بيانات"><form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); try { service.createAndPostJournal({ date: String(form.get("date")), reference: String(form.get("reference")), memo: String(form.get("memo")), lines }); setNotice("تم ترحيل القيد التجريبي وتحديث الأستاذ والتقارير."); } catch (error) { setNotice(error instanceof Error ? error.message : "تعذر ترحيل القيد"); } }}><div className="demo-form-row"><Field name="date" label="التاريخ" type="date" defaultValue="2026-11-20"/><Field name="reference" label="المرجع" defaultValue={`DEMO-${state.journals.length + 1}`}/></div><Field name="memo" label="البيان" defaultValue="قيد يدوي تجريبي"/><div className="demo-journal-lines"><div className="demo-journal-head"><span>الحساب</span><span>الوصف</span><span>مدين</span><span>دائن</span></div>{lines.map((line, index) => <div className="demo-journal-row" key={line.id}><select value={line.accountId} onChange={event => updateLine(index, { accountId: event.target.value })}>{accounts.map(account => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}</select><input value={line.description} onChange={event => updateLine(index, { description: event.target.value })} placeholder="وصف السطر"/><input type="number" min="0" step="0.01" value={line.debitMinor / 100 || ""} onChange={event => updateLine(index, { debitMinor: Math.round(Number(event.target.value || 0) * 100), creditMinor: 0 })}/><input type="number" min="0" step="0.01" value={line.creditMinor / 100 || ""} onChange={event => updateLine(index, { creditMinor: Math.round(Number(event.target.value || 0) * 100), debitMinor: 0 })}/></div>)}</div><button type="button" className="demo-secondary" onClick={() => setLines(current => [...current, { id: crypto.randomUUID(), accountId: accounts[0].id, description: "", debitMinor: 0, creditMinor: 0 }])}>إضافة سطر</button><div className={`demo-journal-total ${isBalanced(lines) ? "is-balanced" : ""}`}><span>إجمالي المدين: {money(debit, organization.currency)}</span><span>إجمالي الدائن: {money(credit, organization.currency)}</span><strong>{isBalanced(lines) ? "القيد متوازن" : `الفرق: ${money(Math.abs(debit - credit), organization.currency)}`}</strong></div><button className="demo-primary" disabled={!isBalanced(lines)}><BookOpenCheck /> ترحيل إلى الأستاذ التجريبي</button>{notice && <p className="demo-success" role="status">{notice}</p>}</form></Panel>}
    {tab === "ledger" && <div className="demo-table-wrap"><table className="demo-table"><thead><tr><th>التاريخ</th><th>المرجع</th><th>البيان</th><th>الحساب</th><th>مدين</th><th>دائن</th></tr></thead><tbody>{state.journals.filter(item => item.organizationId === organization.id && item.status === "POSTED").flatMap(entry => entry.lines.map(line => { const account = accounts.find(item => item.id === line.accountId)!; return <tr key={line.id}><td>{entry.date}</td><td>{entry.reference}</td><td>{entry.memo}</td><td>{account?.code} — {account?.name}</td><td>{line.debitMinor ? money(line.debitMinor, organization.currency) : "—"}</td><td>{line.creditMinor ? money(line.creditMinor, organization.currency) : "—"}</td></tr>; }))}</tbody></table></div>}
    {tab === "trial" && <TrialBalance report={report} currency={organization.currency}/>}
  </div>;
}

function BankWorkflow() {
  const { state, service } = useDemo();
  const accounts = state.accounts.filter(item => item.organizationId === state.currentOrganizationId);
  const rows = state.bankRows.filter(item => item.organizationId === state.currentOrganizationId);
  const [step, setStep] = useState(2);
  return <div className="demo-stack"><div className="demo-disclaimer"><ShieldCheck /><p><strong>محاكاة استخراج فقط.</strong> لم يتم رفع PDF أو Excel، ولا يوجد AI أو n8n متصل.</p></div><ol className="demo-steps">{["عينة جاهزة", "استخراج محاكى", "ربط الحسابات", "مراجعة", "اقتراح قيد"].map((label, index) => <li className={index <= step ? "is-active" : ""} key={label}><span>{index + 1}</span><strong>{label}</strong></li>)}</ol><Panel title="حركات كشف الحساب الافتراضي" subtitle="اختر حسابًا لكل حركة ثم أنشئ اقتراحًا محليًا"><div className="demo-table-wrap"><table className="demo-table"><thead><tr><th>التاريخ</th><th>الوصف</th><th>القيمة</th><th>الحساب المقترح</th><th>الحالة</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.date}</td><td>{row.description}</td><td className={row.direction === "IN" ? "demo-positive" : "demo-negative"}>{row.direction === "IN" ? "+" : "-"}{money(row.amountMinor)}</td><td><select defaultValue={row.mappedAccountId || ""} onChange={event => { if (event.target.value) { service.createBankSuggestion(row.id, event.target.value); setStep(4); } }}><option value="">اختر الحساب</option>{accounts.map(account => <option value={account.id} key={account.id}>{account.code} — {account.name}</option>)}</select></td><td><span className="demo-status is-in_review">{row.state === "SUGGESTED" ? "اقتراح جاهز" : "بانتظار الربط"}</span></td></tr>)}</tbody></table>{!rows.length && <EmptyState icon={<Landmark />} text="لا توجد عينة كشف حساب لهذه الشركة."/>}</div></Panel><Panel title="اقتراح القيد" subtitle="اقتراح تعليمي يحتاج مراجعة بشرية قبل أي ترحيل حقيقي"><div className="demo-suggestion"><NotebookTabs /><div><strong>{rows.some(row => row.state === "SUGGESTED") ? "تم تجهيز اقتراحات للحركات المربوطة" : "اربط حركة واحدة على الأقل"}</strong><p>يمكن لفريق الـBackend لاحقًا تمرير الاقتراح عبر عقد bank-statement-imports ثم إنشاء قيد DRAFT فقط.</p></div><button className="demo-secondary" disabled={!rows.some(row => row.state === "SUGGESTED")} onClick={() => service.navigate("accounting")}>مراجعة في شاشة القيود</button></div></Panel></div>;
}

function Reports() {
  const { state, service } = useDemo();
  const organization = state.organizations.find(item => item.id === state.currentOrganizationId)!;
  const report = service.report();
  const [view, setView] = useState<"income" | "position" | "trial">("income");
  const download = () => {
    const rows = [["Money Coder Demo Export"], ["Company", organization.tradeName], ["Currency", organization.currency], ["Revenue", String(report.revenueMinor)], ["Expenses", String(report.expenseMinor)], ["Profit", String(report.profitMinor)], ["Notice", "Synthetic demo data only"]];
    const blob = new Blob(["\uFEFF" + rows.map(row => row.join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "money-coder-demo-report.csv"; anchor.click(); URL.revokeObjectURL(url);
  };
  return <div className="demo-stack"><div className="demo-toolbar"><div className="demo-tabs"><button className={view === "income" ? "is-active" : ""} onClick={() => setView("income")}>قائمة الدخل</button><button className={view === "position" ? "is-active" : ""} onClick={() => setView("position")}>المركز المالي</button><button className={view === "trial" ? "is-active" : ""} onClick={() => setView("trial")}>ميزان المراجعة</button></div><button className="demo-secondary" onClick={download}><ArrowDownToLine /> تنزيل CSV تجريبي</button></div>{view === "income" && <div className="demo-grid-3"><Kpi icon={<BarChart3/>} label="الإيرادات" value={money(report.revenueMinor, organization.currency)} tone="teal"/><Kpi icon={<Banknote/>} label="المصروفات" value={money(report.expenseMinor, organization.currency)} tone="blue"/><Kpi icon={<BadgeCheck/>} label="صافي الربح" value={money(report.profitMinor, organization.currency)} tone="gold"/><Panel title="قائمة دخل مختصرة"><dl className="demo-report-list"><div><dt>إيرادات النشاط</dt><dd>{money(report.revenueMinor, organization.currency)}</dd></div><div><dt>تكلفة ومصروفات النشاط</dt><dd>({money(report.expenseMinor, organization.currency)})</dd></div><div className="total"><dt>صافي الربح التجريبي</dt><dd>{money(report.profitMinor, organization.currency)}</dd></div></dl></Panel></div>}{view === "position" && <div className="demo-grid-3"><Kpi icon={<Building2/>} label="الأصول" value={money(report.assetsMinor, organization.currency)} tone="teal"/><Kpi icon={<WalletCards/>} label="الالتزامات" value={money(report.liabilitiesMinor, organization.currency)} tone="blue"/><Kpi icon={<ShieldCheck/>} label="حقوق الملكية + الربح" value={money(report.equityMinor, organization.currency)} tone="gold"/></div>}{view === "trial" && <TrialBalance report={report} currency={organization.currency}/>}<p className="demo-footnote">تقارير العرض مبنية فقط على القيود الاصطناعية المرحلة، وليست قوائم مالية معتمدة أو نصيحة مالية.</p></div>;
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
  const { state, service } = useDemo();
  return <div className="demo-grid-2 demo-align-start"><div className="demo-stack"><Panel title="إعدادات جلسة العرض"><label className="demo-toggle"><input type="checkbox" checked={state.persistenceEnabled} onChange={event => service.setPersistence(event.target.checked)}/><span/><div><strong>حفظ محلي اختياري</strong><p>يحفظ البيانات الاصطناعية فقط في هذا المتصفح. الوضع الافتراضي بلا حفظ.</p></div></label><button className="demo-danger" onClick={() => window.confirm("هل تريد حذف تغييرات العرض والعودة للبيانات الأساسية؟") && service.reset()}><RefreshCcw /> إعادة بيانات العرض</button></Panel><Panel title="الأدوار المتاحة"><div className="demo-role-list">{Object.entries(roleLabels).map(([role, label]) => <button key={role} className={state.currentRole === role ? "is-active" : ""} onClick={() => service.switchRole(role as DemoRole)}><Users /><span><strong>{label}</strong><small>تبديل محاكاة فقط — ليس تسجيل دخول</small></span></button>)}</div></Panel></div><div className="demo-stack"><Panel title="دليل التجربة"><ol className="demo-help-list"><li><span>1</span>بدّل بين الشركات الثلاث من أعلى الشاشة.</li><li><span>2</span>افتح مستندًا واطلب تصحيحًا ثم أعد تقديمه واعتمده.</li><li><span>3</span>أنشئ قيدًا متوازنًا وراقب تحديث التقارير.</li><li><span>4</span>نفّذ Reset للعودة إلى نقطة البداية.</li></ol></Panel><Panel title="حالة الوحدات"><div className="demo-readiness"><p><CheckCircle2 /> <strong>يعمل في العرض:</strong> البيانات، المستندات، المراجعة، القيود والتقارير.</p><p><FileClock /> <strong>محاكاة معلّمة:</strong> الرفع، استخراج كشف البنك، الإشعارات.</p><p><X /> <strong>غير متصل:</strong> Neon، SMTP، S3، n8n، الدفع.</p></div></Panel><Panel title="مساعدة"><p className="demo-copy">هذه التجربة مخصصة لشرح رحلة المنتج. راجع ملفات BACKEND_HANDOFF وINTEGRATION_CHECKLIST قبل توصيل أي خدمة حقيقية.</p><Link className="demo-secondary" href="/">العودة إلى الموقع</Link></Panel></div></div>;
}

function TrialBalance({ report, currency }: { report: DemoReport; currency: string }) {
  const debit = report.trialBalance.reduce((sum, row) => sum + row.debitMinor, 0); const credit = report.trialBalance.reduce((sum, row) => sum + row.creditMinor, 0);
  return <div className="demo-table-wrap"><table className="demo-table"><thead><tr><th>الكود</th><th>الحساب</th><th>مدين</th><th>دائن</th></tr></thead><tbody>{report.trialBalance.map(row => <tr key={row.account.id}><td>{row.account.code}</td><td>{row.account.name}</td><td>{row.debitMinor ? money(row.debitMinor, currency) : "—"}</td><td>{row.creditMinor ? money(row.creditMinor, currency) : "—"}</td></tr>)}</tbody><tfoot><tr><th colSpan={2}>الإجمالي</th><th>{money(debit, currency)}</th><th>{money(credit, currency)}</th></tr></tfoot></table></div>;
}

function ActivityFeed({ global = false }: { global?: boolean }) {
  const { state } = useDemo();
  const items = state.audit.filter(item => global || !item.organizationId || item.organizationId === state.currentOrganizationId).slice(0, 6);
  return <div className="demo-activity-list">{items.map(item => <article key={item.id}><span><Activity /></span><div><strong>{item.action.replaceAll("_", " ")}</strong><p>{item.actor}</p></div><small>{new Date(item.at).toLocaleString("ar-EG")}</small></article>)}</div>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) { return <section className="demo-panel"><header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></header>{children}</section>; }
function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) { return <article className={`demo-kpi is-${tone}`}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article>; }
function Field({ label, name, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) { return <label>{label}<input name={name} {...props}/></label>; }
function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="demo-empty">{icon}<strong>{text}</strong><small>جرّب تغيير المرشحات أو الشركة الحالية.</small></div>; }
function categoryLabel(category: string) { return ({ BANK_STATEMENT: "كشف حساب", INVOICE: "فاتورة", CONTRACT: "عقد", TAX: "ضريبي", OTHER: "أخرى" } as Record<string, string>)[category] ?? category; }
