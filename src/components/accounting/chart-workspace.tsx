"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, ChevronDown, ChevronLeft, FileClock, FolderTree, Plus, Search, ShieldAlert } from "lucide-react";

type Account = { id: string; code: string; nameAr: string; nameEn: string | null; description: string | null; parentId: string | null; accountClass: string; reportGroup: string; normalBalance: string; isContra: boolean; isPostable: boolean; isActive: boolean; inventoryMethod: string | null; origin: string; templateVersion: string | null; revision: number; createdAt: string; updatedAt: string };
type ChartPayload = { installation: { activity: string; templateVersion: string; accountCount: number } | null; settings: { businessActivity: string | null; inventoryMethod: string; baseCurrency: string } | null; accounts: Account[] };
type Change = { id: string; accountId: string; action: string; status: string; reason: string; requestedById: string; createdAt: string; account: { code: string; nameAr: string } };
type AuditRow = { id: string; action: string; entityId: string | null; actorUserId: string | null; createdAt: string; metadata: { accountCode?: string; actorName?: string; previous?: Record<string, unknown> | null; next?: Record<string, unknown> | null; changedFields?: string[]; reason?: string; requestId?: string } };
type Capability = { create: boolean; edit: boolean; deactivate: boolean; delete: boolean; initialize: boolean; audit: boolean; approve: boolean };

const accountClassNames: Record<string, string> = { ASSET: "الأصول", LIABILITY: "الالتزامات", EQUITY: "حقوق الملكية", REVENUE: "الإيرادات", EXPENSE: "المصروفات" };
const reportNames: Record<string, string> = { ASSET_TOTAL: "إجمالي الأصول", LIABILITY_TOTAL: "إجمالي الالتزامات", REVENUE_TOTAL: "إجمالي الإيرادات", EXPENSE_TOTAL: "إجمالي المصروفات", CURRENT_ASSET: "أصول متداولة", NONCURRENT_ASSET: "أصول غير متداولة", CURRENT_LIABILITY: "التزامات متداولة", NONCURRENT_LIABILITY: "التزامات غير متداولة", EQUITY: "حقوق الملكية", TRADING_REVENUE: "إيرادات تجارية", CONTRA_REVENUE: "مردودات وخصومات", OTHER_INCOME: "إيرادات أخرى", COST_OF_SALES: "تكلفة المبيعات", SELLING_EXPENSE: "بيع وتوزيع", ADMIN_EXPENSE: "عمومية وإدارية", STAFF_EXPENSE: "عاملين", DEPRECIATION_EXPENSE: "إهلاك وإطفاء", FINANCE_COST: "تكاليف تمويل", OTHER_EXPENSE: "مصروفات أخرى", INCOME_TAX_EXPENSE: "ضريبة دخل" };
const actionNames: Record<string, string> = { CHART_TEMPLATE_SELECTED: "اختيار القالب", CHART_TEMPLATE_APPLIED: "تطبيق القالب", CHART_INITIALIZED: "تهيئة الدليل", CHART_ACCOUNT_CREATED: "إضافة حساب", CHART_GROUP_CREATED: "إضافة مجموعة", CHART_ACCOUNT_EDITED: "تعديل حساب", CHART_ACCOUNT_RENAMED: "تغيير الاسم", CHART_CHANGE_SUBMITTED: "طلب تغيير", CHART_CHANGE_APPROVED: "اعتماد طلب", CHART_CHANGE_REJECTED: "رفض طلب", CHART_DELETION_DENIED: "رفض طلب حذف", CHART_ACCOUNT_SENSITIVE_EDITED: "تعديل حساس", CHART_ACCOUNT_DEACTIVATED: "تعطيل حساب", CHART_ACCOUNT_SOFT_DELETED: "حذف منطقي" };
const cairoTime = new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, { method, cache: "no-store", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "تعذّر تنفيذ الطلب.");
  return result as T;
}

export function ChartWorkspace({ organizationId, actorId, capability, initialPanel = "details" }: { organizationId: string; actorId: string; capability: Capability; initialPanel?: "details" | "audit" }) {
  const base = `/api/organizations/${organizationId}/chart`;
  const [chart, setChart] = useState<ChartPayload | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);
  const [history, setHistory] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["1000", "2000", "3000", "4000", "5000", "6000", "7000", "8000"]));
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [panel, setPanel] = useState<"details" | "create" | "edit" | "change" | "audit">(initialPanel);
  const [parentId, setParentId] = useState("");
  const [suggestedCode, setSuggestedCode] = useState("");
  const [sensitiveAction, setSensitiveAction] = useState<"UPDATE" | "DEACTIVATE" | "DELETE">("UPDATE");
  const [sensitiveField, setSensitiveField] = useState("code");
  const [auditCode, setAuditCode] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [auditActor, setAuditActor] = useState("");
  const [auditClass, setAuditClass] = useState("");
  const [auditApproval, setAuditApproval] = useState("");

  const reload = useCallback(async () => {
    const [nextChart, nextChanges, nextHistory] = await Promise.all([
      api<ChartPayload>(base),
      capability.audit ? api<Change[]>(`${base}/changes`) : Promise.resolve([]),
      capability.audit ? api<AuditRow[]>(`${base}/audit`) : Promise.resolve([]),
    ]);
    setChart(nextChart); setChanges(nextChanges); setHistory(nextHistory); setLoading(false);
  }, [base, capability.audit]);

  useEffect(() => {
    let cancelled = false;
    async function initialLoad() {
      try {
        const [nextChart, nextChanges, nextHistory] = await Promise.all([
          api<ChartPayload>(base),
          capability.audit ? api<Change[]>(`${base}/changes`) : Promise.resolve([]),
          capability.audit ? api<AuditRow[]>(`${base}/audit`) : Promise.resolve([]),
        ]);
        if (!cancelled) { setChart(nextChart); setChanges(nextChanges); setHistory(nextHistory); setLoading(false); }
      } catch (error) {
        if (!cancelled) { setNotice({ text: error instanceof Error ? error.message : "تعذّر تحميل الدليل.", error: true }); setLoading(false); }
      }
    }
    void initialLoad();
    return () => { cancelled = true; };
  }, [base, capability.audit]);
  const accounts = useMemo(() => chart?.accounts ?? [], [chart]);
  const byId = useMemo(() => new Map(accounts.map(account => [account.id, account])), [accounts]);
  const children = useMemo(() => { const map = new Map<string | null, Account[]>(); for (const account of accounts) map.set(account.parentId, [...(map.get(account.parentId) ?? []), account]); return map; }, [accounts]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const path = selected ? (() => { const parts: Account[] = []; let current: Account | undefined = selected; while (current) { parts.unshift(current); current = current.parentId ? byId.get(current.parentId) : undefined; } return parts; })() : [];
  const visible = accounts.filter(account => {
    const query = search.trim().toLocaleLowerCase();
    return (!query || `${account.code} ${account.nameAr} ${account.nameEn ?? ""}`.toLocaleLowerCase().includes(query)) && (!classFilter || account.accountClass === classFilter) && (!statusFilter || (statusFilter === "active") === account.isActive);
  });
  const filtered = Boolean(search || classFilter || statusFilter);

  async function perform(work: () => Promise<unknown>, success: string) {
    setBusy(true); setNotice(null);
    try { await work(); await reload(); setNotice({ text: success, error: false }); }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : "تعذّر تنفيذ العملية.", error: true }); }
    finally { setBusy(false); }
  }

  async function prepareCreate(parent: Account) {
    setParentId(parent.id); setSuggestedCode(""); setPanel("create");
    try { const result = await api<{ code: string }>(`${base}/accounts?parentId=${parent.id}`); setSuggestedCode(result.code); }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : "تعذّر اقتراح الكود.", error: true }); }
  }

  function toggle(code: string) { setExpanded(previous => { const next = new Set(previous); if (next.has(code)) next.delete(code); else next.add(code); return next; }); }
  function row(account: Account, depth: number) {
    const branch = children.get(account.id) ?? [];
    const open = expanded.has(account.code);
    return <div key={account.id}>
      <div className={`flex items-center gap-2 border-b border-slate-100 py-2 pl-2 ${selectedId === account.id ? "rounded-lg bg-teal-50" : "hover:bg-slate-50"}`} style={{ paddingRight: `${Math.min(depth * 18 + 8, 100)}px` }}>
        {branch.length ? <button type="button" aria-label={`${open ? "طي" : "توسيع"} ${account.nameAr}`} aria-expanded={open} onClick={() => toggle(account.code)} className="rounded p-1 focus-visible:outline-2 focus-visible:outline-teal-700">{open ? <ChevronDown size={16}/> : <ChevronLeft size={16}/>}</button> : <span className="w-6"/>}
        <button type="button" onClick={() => { setSelectedId(account.id); setPanel("details"); }} className="min-w-0 flex-1 text-right focus-visible:outline-2 focus-visible:outline-teal-700" aria-current={selectedId === account.id ? "true" : undefined}>
          <span className="font-mono text-xs text-slate-500" dir="ltr">{account.code}</span> <span className="font-bold text-slate-900">{account.nameAr}</span>
        </button>
        {!account.isActive && <span className="rounded bg-slate-200 px-1.5 text-xs text-slate-700">موقوف</span>}
        {account.isPostable && <span className="hidden rounded bg-blue-50 px-1.5 text-xs text-blue-800 sm:inline">ترحيل</span>}
      </div>
      {!filtered && open && branch.map(child => row(child, depth + 1))}
    </div>;
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await perform(async () => { const created = await api<Account>(`${base}/accounts`, "POST", { parentId, code: String(form.get("code") || "") || undefined, nameAr: String(form.get("nameAr") || ""), nameEn: String(form.get("nameEn") || ""), description: String(form.get("description") || ""), isPostable: form.get("isPostable") === "on" }); setSelectedId(created.id); setPanel("details"); }, "تم إنشاء الحساب وتسجيل الحدث.");
  }

  async function editAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return; const form = new FormData(event.currentTarget);
    await perform(async () => { await api(`${base}/accounts/${selected.id}`, "PATCH", { nameAr: String(form.get("nameAr") || ""), nameEn: String(form.get("nameEn") || ""), description: String(form.get("description") || ""), reason: String(form.get("reason") || "") }); setPanel("details"); }, "حُفظ التعديل وسُجل في سجل التدقيق.");
  }

  async function submitChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return; const form = new FormData(event.currentTarget);
    let proposed: Record<string, string | boolean> | undefined;
    if (sensitiveAction === "UPDATE") {
      const raw = String(form.get("value") || "");
      proposed = { [sensitiveField]: sensitiveField === "isPostable" || sensitiveField === "isActive" ? raw === "true" : raw };
    }
    await perform(async () => { await api(`${base}/changes`, "POST", { accountId: selected.id, action: sensitiveAction, proposed, reason: String(form.get("reason") || "") }); setPanel("details"); }, "أُرسل الطلب للمراجعة دون تغيير الحساب حتى اعتماده.");
  }

  async function decide(change: Change, decision: "APPROVE" | "REJECT") {
    const reason = window.prompt(decision === "APPROVE" ? "سبب الاعتماد (5 أحرف على الأقل):" : "سبب الرفض (5 أحرف على الأقل):");
    if (!reason) return;
    await perform(() => api(`${base}/changes/${change.id}`, "PATCH", { decision, reason }), decision === "APPROVE" ? "اعتُمد الطلب وطُبق التغيير وسُجل الحدث." : "رُفض الطلب وسُجل السبب.");
  }

  async function filterAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const query = new URLSearchParams();
    if (auditCode) query.set("code", auditCode); if (auditAction) query.set("action", auditAction); if (auditFrom) query.set("from", auditFrom); if (auditTo) query.set("to", auditTo); if (auditActor) query.set("actorUserId", auditActor); if (auditClass) query.set("accountClass", auditClass); if (auditApproval) query.set("approvalStatus", auditApproval);
    try { setHistory(await api<AuditRow[]>(`${base}/audit?${query}`)); }
    catch (error) { setNotice({ text: error instanceof Error ? error.message : "تعذّر البحث.", error: true }); }
  }

  if (loading) return <div role="status" className="rounded-2xl bg-white p-8 text-slate-600">جاري تحميل دليل الحسابات…</div>;
  if (!chart) return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">{notice?.text || "تعذّر تحميل دليل الحسابات."}</div>;

  return <div dir="rtl" className="space-y-5">
    {notice && <div role={notice.error ? "alert" : "status"} className={`rounded-xl border p-3 text-sm font-bold ${notice.error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{notice.text}</div>}
    {!chart.installation ? <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">اختر طبيعة نشاط شركتك</h2><p className="mt-2 text-sm text-slate-600">يُنشأ الدليل التجاري مرة واحدة للشركة. لا تُضاف أرصدة افتتاحية أو قيود.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border-2 border-teal-500 p-4"><h3 className="font-black">النشاط التجاري</h3><p className="my-2 text-sm text-slate-600">مشتريات ومبيعات ومخزون وعملاء وموردون وبنوك ومصروفات وضرائب.</p><span className="text-xs font-bold text-teal-700">القالب جاهز</span>{chart.settings?.businessActivity && chart.settings.businessActivity !== "COMMERCIAL" ? <p className="mt-3 text-sm font-bold text-amber-900">النشاط المحاسبي المسجل للشركة مختلف؛ لا يمكن استبداله تلقائيًا.</p> : capability.initialize && <button disabled={busy} className="btn-primary mt-4 w-full" onClick={() => { if (window.confirm("تأكيد اختيار النشاط التجاري وإنشاء دليل الحسابات لهذه الشركة؟ تُنشأ بنية الحسابات مرة واحدة دون أرصدة أو قيود.")) void perform(() => api(base, "POST", { activity: "COMMERCIAL" }), "تم إنشاء دليل الحسابات التجاري بنجاح"); }}>إنشاء الدليل التجاري</button>}</div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-black">النشاط الصناعي</h3><p className="my-2 text-sm text-slate-600">يحتاج قالبًا مستقلًا للمواد والإنتاج تحت التشغيل والتكاليف الصناعية.</p><span className="text-xs text-slate-500">قالب مستقل قيد التطوير — غير متاح للتهيئة</span></div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-black">النشاط الخدمي</h3><p className="my-2 text-sm text-slate-600">يحتاج قالبًا مستقلًا لإيرادات العقود وتكلفة الخدمات والمشروعات.</p><span className="text-xs text-slate-500">قالب مستقل قيد التطوير — غير متاح للتهيئة</span></div>
      </div>
    </section> : <>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm"><Check size={18} className="text-teal-700"/><strong>الدليل التجاري مهيأ</strong><span>الإصدار {chart.installation.templateVersion}</span><span>{chart.accounts.length} حساب</span><span>سياسة الجرد: {chart.settings?.inventoryMethod === "PERPETUAL" ? "مستمر" : "دوري"}</span><span className="text-xs text-slate-600">هذه بنية حسابات فقط، بلا أرصدة أو قيود.</span></div>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(320px,1fr)_minmax(320px,1fr)]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="شجرة دليل الحسابات">
          <div className="mb-4 flex items-center gap-2"><FolderTree size={20} className="text-teal-700"/><h2 className="text-lg font-black">شجرة الحسابات</h2></div>
          <label className="relative block"><Search size={17} className="absolute right-3 top-3 text-slate-400"/><span className="sr-only">ابحث بالكود أو الاسم</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث بالكود أو الاسم العربي أو الإنجليزي" className="input w-full pr-9"/></label>
          <div className="mt-3 flex gap-2"><label className="sr-only" htmlFor="class-filter">التصنيف</label><select id="class-filter" value={classFilter} onChange={event => setClassFilter(event.target.value)} className="input min-w-0 flex-1"><option value="">كل التصنيفات</option>{Object.entries(accountClassNames).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select><label className="sr-only" htmlFor="status-filter">الحالة</label><select id="status-filter" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="input min-w-0 flex-1"><option value="">كل الحالات</option><option value="active">نشط</option><option value="inactive">موقوف</option></select></div>
          <p className="mt-3 text-xs text-slate-500">{visible.length} حساب ظاهر · الحسابات المجمّعة لا تقبل الترحيل</p>
          <div className="mt-2 max-h-[70vh] overflow-auto border-t border-slate-100">{filtered ? visible.map(account => row(account, 0)) : (children.get(null) ?? []).map(account => row(account, 0))}{visible.length === 0 && <p className="p-6 text-center text-slate-500">لا توجد حسابات مطابقة.</p>}</div>
        </section>
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="تفاصيل وإجراءات الحساب">
          <div className="mb-5 flex flex-wrap gap-2 border-b pb-4">
            <button type="button" onClick={() => setPanel("details")} className={`rounded-lg px-3 py-2 text-sm font-bold ${panel === "details" ? "bg-teal-800 text-white" : "bg-slate-100 text-slate-700"}`}>التفاصيل</button>
            {capability.create && <button type="button" onClick={() => selected && !selected.isPostable ? void prepareCreate(selected) : (setParentId(""), setPanel("create"))} className={`rounded-lg px-3 py-2 text-sm font-bold ${panel === "create" ? "bg-teal-800 text-white" : "bg-slate-100 text-slate-700"}`}><Plus size={14} className="inline"/> إضافة حساب</button>}
            {capability.audit && <button type="button" onClick={() => setPanel("audit")} className={`rounded-lg px-3 py-2 text-sm font-bold ${panel === "audit" ? "bg-teal-800 text-white" : "bg-slate-100 text-slate-700"}`}><FileClock size={14} className="inline"/> سجل التعديلات</button>}
          </div>
          {panel === "details" && (selected ? <div className="space-y-4"><p className="break-words text-xs text-slate-500">{path.map(item => item.nameAr).join(" ← ")}</p><h2 className="text-xl font-black">{selected.nameAr} <span dir="ltr" className="font-mono text-sm text-slate-500">{selected.code}</span></h2><dl className="grid gap-3 text-sm sm:grid-cols-2">{[["الاسم الإنجليزي", selected.nameEn || "—"], ["التصنيف", accountClassNames[selected.accountClass]], ["القائمة المالية", reportNames[selected.reportGroup]], ["الطبيعة", selected.normalBalance === "DEBIT" ? "مدين" : "دائن"], ["النوع", selected.isPostable ? "حساب قابل للترحيل" : "مجموعة غير قابلة للترحيل"], ["الحالة", selected.isActive ? "نشط" : "موقوف"], ["الأصل", selected.origin === "TEMPLATE" ? `قالب ${selected.templateVersion}` : "إضافة يدوية"], ["الرصيد", "غير موجود في دليل الحسابات"]].map(([key, value]) => <div key={key} className="rounded-lg bg-slate-50 p-3"><dt className="text-slate-500">{key}</dt><dd className="mt-1 font-bold">{value}</dd></div>)}</dl>{selected.description && <p className="text-sm text-slate-600">{selected.description}</p>}<div className="flex flex-wrap gap-2">{capability.create && !selected.isPostable && selected.isActive && <button className="btn-secondary" onClick={() => void prepareCreate(selected)}>إضافة حساب فرعي</button>}{capability.edit && <button className="btn-secondary" onClick={() => setPanel("edit")}>تعديل الاسم والوصف</button>}{(capability.edit || capability.deactivate || capability.delete) && <button className="btn-secondary" onClick={() => { setSensitiveAction(capability.edit ? "UPDATE" : capability.deactivate ? "DEACTIVATE" : "DELETE"); setPanel("change"); }}>طلب تغيير حساس</button>}{capability.audit && <button className="btn-secondary" onClick={() => { setAuditCode(selected.code); setPanel("audit"); }}>عرض سجل الحساب</button>}</div></div> : <p className="text-slate-500">اختر حسابًا من الشجرة لعرض تفاصيله.</p>)}
          {panel === "create" && capability.create && <form onSubmit={createAccount} className="grid gap-4"><h2 className="font-black">إضافة حساب أو مجموعة</h2><label className="label">الحساب الأب<select required className="input mt-1 w-full" value={parentId} onChange={event => { const parent = byId.get(event.target.value); if (parent) void prepareCreate(parent); }}><option value="">اختر الحساب الأب</option>{accounts.filter(account => !account.isPostable && account.isActive).map(account => <option key={account.id} value={account.id}>{account.code} — {account.nameAr}</option>)}</select></label><label className="label">الكود<input key={suggestedCode} name="code" dir="ltr" defaultValue={suggestedCode} placeholder="يُقترح من الفرع" className="input mt-1 w-full"/></label><label className="label">الاسم العربي<input name="nameAr" required minLength={2} maxLength={180} className="input mt-1 w-full"/></label><label className="label">الاسم الإنجليزي<input name="nameEn" dir="ltr" maxLength={180} className="input mt-1 w-full"/></label><label className="label">الوصف<textarea name="description" maxLength={1000} className="input mt-1 w-full"/></label><label className="flex items-center gap-2 text-sm"><input name="isPostable" type="checkbox" defaultChecked/> حساب تفصيلي قابل للترحيل مستقبلًا</label><p className="text-xs text-slate-500">يرث التصنيف والطبيعة من الحساب الأب. لا تُنشأ أي أرصدة.</p><button disabled={busy || !parentId} className="btn-primary">حفظ الحساب</button></form>}
          {panel === "edit" && selected && capability.edit && <form key={selected.id} onSubmit={editAccount} className="grid gap-4"><h2 className="font-black">تعديل {selected.code}</h2><label className="label">الاسم العربي<input name="nameAr" defaultValue={selected.nameAr} required minLength={2} maxLength={180} className="input mt-1 w-full"/></label><label className="label">الاسم الإنجليزي<input name="nameEn" dir="ltr" defaultValue={selected.nameEn || ""} maxLength={180} className="input mt-1 w-full"/></label><label className="label">الوصف<textarea name="description" defaultValue={selected.description || ""} maxLength={1000} className="input mt-1 w-full"/></label><label className="label">سبب التعديل<input name="reason" required minLength={5} maxLength={500} className="input mt-1 w-full"/></label><button disabled={busy} className="btn-primary">حفظ مع سجل تدقيق</button></form>}
          {panel === "change" && selected && <form onSubmit={submitChange} className="grid gap-4"><div className="flex items-center gap-2"><ShieldAlert size={19} className="text-amber-700"/><h2 className="font-black">طلب تغيير حساس</h2></div><p className="text-sm text-slate-600">يظل الحساب كما هو حتى يعتمد شخص آخر مخوّل الطلب. تغييرات كود أو فرع حساب القالب محظورة وتحتاج ترحيلًا مستقلًا.</p><label className="label">نوع الطلب<select className="input mt-1 w-full" value={sensitiveAction} onChange={event => setSensitiveAction(event.target.value as typeof sensitiveAction)}><option value="UPDATE" disabled={!capability.edit}>تغيير تصنيف أو كود أو فرع</option><option value="DEACTIVATE" disabled={!capability.deactivate}>تعطيل الحساب</option><option value="DELETE" disabled={!capability.delete}>طلب حذف منطقي</option></select></label>{sensitiveAction === "UPDATE" && <><label className="label">الحقل<select className="input mt-1 w-full" value={sensitiveField} onChange={event => setSensitiveField(event.target.value)}><option value="code">كود الحساب</option><option value="parentId">الحساب الأب</option><option value="accountClass">نوع الحساب</option><option value="reportGroup">تصنيف القوائم</option><option value="normalBalance">الطبيعة</option><option value="isPostable">قابلية الترحيل</option><option value="isActive">التفعيل</option></select></label><label className="label">القيمة الجديدة{sensitiveField === "parentId" ? <select name="value" required className="input mt-1 w-full">{accounts.filter(account => !account.isPostable && account.id !== selected.id).map(account => <option key={account.id} value={account.id}>{account.code} — {account.nameAr}</option>)}</select> : sensitiveField === "reportGroup" ? <select name="value" className="input mt-1 w-full">{Object.entries(reportNames).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select> : sensitiveField === "accountClass" ? <select name="value" className="input mt-1 w-full">{Object.entries(accountClassNames).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select> : sensitiveField === "normalBalance" ? <select name="value" className="input mt-1 w-full"><option value="DEBIT">مدين</option><option value="CREDIT">دائن</option></select> : sensitiveField === "isPostable" || sensitiveField === "isActive" ? <select name="value" className="input mt-1 w-full"><option value="true">نعم</option><option value="false">لا</option></select> : <input name="value" required className="input mt-1 w-full" dir="ltr"/>}</label></>}{sensitiveAction === "DELETE" && selected.origin === "TEMPLATE" && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">حذف حسابات القالب محظور؛ يمكن مراجعة تعطيل حساب تفصيلي عند الحاجة.</p>}<label className="label">سبب الطلب<input name="reason" required minLength={10} maxLength={500} className="input mt-1 w-full"/></label><button disabled={busy || (sensitiveAction === "DELETE" && selected.origin === "TEMPLATE")} className="btn-primary">إرسال للمراجعة</button></form>}
          {panel === "audit" && capability.audit && <div className="space-y-5"><h2 className="text-lg font-black">سجل التعديلات على دليل الحسابات</h2><form onSubmit={filterAudit} className="grid gap-2 sm:grid-cols-2"><label className="label">كود الحساب<input className="input mt-1 w-full" value={auditCode} onChange={event => setAuditCode(event.target.value)}/></label><label className="label">نوع الحدث<select className="input mt-1 w-full" value={auditAction} onChange={event => setAuditAction(event.target.value)}><option value="">كل الأحداث</option>{Object.entries(actionNames).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><label className="label">من<input type="date" className="input mt-1 w-full" value={auditFrom} onChange={event => setAuditFrom(event.target.value)}/></label><label className="label">إلى<input type="date" className="input mt-1 w-full" value={auditTo} onChange={event => setAuditTo(event.target.value)}/></label><label className="label">التصنيف<select className="input mt-1 w-full" value={auditClass} onChange={event => setAuditClass(event.target.value)}><option value="">الكل</option>{Object.entries(accountClassNames).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><label className="label">حالة الموافقة<select className="input mt-1 w-full" value={auditApproval} onChange={event => setAuditApproval(event.target.value)}><option value="">الكل</option><option value="PENDING">قيد الاعتماد</option><option value="APPROVED">معتمد</option><option value="REJECTED">مرفوض</option></select></label><label className="label sm:col-span-2">معرّف المستخدم<input className="input mt-1 w-full" value={auditActor} onChange={event => setAuditActor(event.target.value)}/></label><button className="btn-secondary sm:col-span-2">بحث في السجل</button></form><div className="max-h-[45vh] space-y-2 overflow-auto">{history.length ? history.map(item => <article key={item.id} className="rounded-xl border p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{actionNames[item.action] || item.action} · {item.metadata.accountCode || "الدليل"}</strong><time className="text-slate-500" dateTime={item.createdAt}>{cairoTime.format(new Date(item.createdAt))} · القاهرة</time></div><p className="mt-1 text-slate-600">بواسطة: {item.metadata.actorName || "مستخدم سابق"}</p>{item.metadata.reason && <p className="mt-1">السبب: {item.metadata.reason}</p>}{item.metadata.changedFields?.length ? <p className="mt-1 text-xs text-slate-500">الحقول: {item.metadata.changedFields.join("، ")}</p> : null}<details className="mt-2 text-xs"><summary className="cursor-pointer text-teal-800">القيم السابقة والجديدة</summary><pre dir="ltr" className="mt-2 overflow-auto rounded bg-slate-50 p-2 text-left">{JSON.stringify({ previous: item.metadata.previous, next: item.metadata.next }, null, 2)}</pre></details></article>) : <p className="text-slate-500">لا توجد أحداث مطابقة.</p>}</div><h3 className="font-black">طلبات التغيير</h3><div className="space-y-2">{changes.map(change => <div key={change.id} className="rounded-xl border p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{change.account.code} — {change.account.nameAr}</strong><span>{change.status === "PENDING" ? "قيد الاعتماد" : change.status === "APPROVED" ? "معتمد" : "مرفوض"}</span></div><p className="mt-1">{change.action} · {change.reason}</p>{capability.approve && change.status === "PENDING" && change.requestedById !== actorId && <div className="mt-2 flex gap-2"><button type="button" disabled={busy} onClick={() => void decide(change, "APPROVE")} className="btn-primary">اعتماد وتطبيق</button><button type="button" disabled={busy} onClick={() => void decide(change, "REJECT")} className="btn-secondary">رفض</button></div>}</div>)}{!changes.length && <p className="text-slate-500">لا توجد طلبات.</p>}</div></div>}
        </section>
      </div>
    </>}
  </div>;
}
