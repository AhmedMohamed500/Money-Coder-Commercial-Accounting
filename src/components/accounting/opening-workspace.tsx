"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Capability = Record<"create" | "edit" | "import" | "submit" | "review" | "approve" | "audit", boolean>;
type FiscalYear = { id: string; name: string; startsAt: string; endsAt: string; isClosed: boolean };
type Batch = { id: string; fiscalYearId: string; status: string; revision: number; openingDate: string; baseCurrency: string; currencyPrecision: number; correctionOfId: string | null; rejectionReason: string | null; createdById: string; submittedById: string | null; reviewedById: string | null; reviewedAt: string | null; lines: Line[]; imports: ImportStage[] };
type Account = { id: string; code: string; nameAr: string; accountClass: string; normalBalance: string; isActive: boolean; inventoryMethod: string | null };
type Line = { id: string; accountId: string; debit: string; credit: string; explanation: string | null; sourceReference: string | null };
type ImportRow = { rowNumber: number; code: string; name: string; debit: string; credit: string; explanation: string; sourceReference: string };
type ImportStage = { id: string; originalName: string; status: string; expiresAt: string; rows: { headers?: string[]; items?: ImportRow[] } };
type Issue = { code: string; message: string; accountId?: string; rowNumber?: number };
type Detail = { batch: Batch; accounts: Account[]; validation: { issues: Issue[]; totals: { debit: string; credit: string; difference: string; balanced: boolean }; lineCount: number } };
type Overview = { company: { legalName: string }; settings: { baseCurrency: string } | null; fiscalYears: FiscalYear[]; installation: { activity: string } | null; batches: Array<Pick<Batch, "id" | "fiscalYearId" | "status" | "openingDate" | "baseCurrency" | "revision" | "correctionOfId"> & { createdAt: string }> };
type Draft = { debit: string; credit: string; explanation: string; sourceReference: string };
const statusLabels: Record<string, string> = { DRAFT: "مسودة", SUBMITTED: "بانتظار المراجعة", REJECTED: "مرفوضة للتصحيح", APPROVED: "نسخة معتمدة ومقفلة", SUPERSEDED: "نسخة تاريخية مستبدلة" };
const classLabels: Record<string, string> = { ASSET: "أصول", LIABILITY: "التزامات", EQUITY: "حقوق ملكية", REVENUE: "إيرادات", EXPENSE: "مصروفات" };
const balanceLabels: Record<string, string> = { DEBIT: "مدين", CREDIT: "دائن" };
const columnLabels = { code: "كود الحساب", name: "اسم الحساب", debit: "مدين", credit: "دائن", explanation: "ملاحظات", sourceReference: "مرجع المصدر" } as const;

async function jsonRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "تعذر إتمام العملية.");
  return payload;
}

function OpeningMobileAccounts({ accounts, lines, drafts, editable, busy, updateDraft, saveLine }: {
  accounts: Account[]; lines: Map<string, Line>; drafts: Record<string, Draft>; editable: boolean; busy: boolean;
  updateDraft: (accountId: string, field: keyof Draft, value: string) => void; saveLine: (accountId: string) => void;
}) {
  return <div className="mt-4 max-h-[650px] space-y-3 overflow-y-auto md:hidden">
    {accounts.map(account => {
      const saved = lines.get(account.id);
      const value = drafts[account.id] ?? { debit: saved?.debit ?? "", credit: saved?.credit ?? "", explanation: saved?.explanation ?? "", sourceReference: saved?.sourceReference ?? "" };
      return <div key={account.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-start justify-between gap-3"><div><strong className="text-sm">{account.nameAr}</strong><p className="mt-1 text-xs text-slate-600">{classLabels[account.accountClass] || account.accountClass} · طبيعته {balanceLabels[account.normalBalance] || account.normalBalance}</p></div><code dir="ltr" className="rounded-lg bg-white px-2 py-1 text-xs">{account.code}</code></div>
        <div className="mt-3 grid grid-cols-2 gap-2">{(["debit", "credit"] as const).map(field => <label key={field} className="flex flex-col gap-1 text-xs font-bold">{columnLabels[field]}<input dir="ltr" inputMode="decimal" className="min-w-0 rounded-lg border border-slate-300 bg-white p-2 text-sm" value={value[field]} disabled={!editable || busy} onChange={event => updateDraft(account.id, field, event.target.value)} /></label>)}</div>
        <details className="mt-3 text-xs"><summary className="cursor-pointer font-bold text-teal-800">البيان ومرجع المصدر</summary><div className="mt-2 grid gap-2"><input className="rounded-lg border border-slate-300 bg-white p-2" placeholder="بيان الرصيد" aria-label={`بيان ${account.nameAr}`} value={value.explanation} disabled={!editable || busy} onChange={event => updateDraft(account.id, "explanation", event.target.value)}/><input className="rounded-lg border border-slate-300 bg-white p-2" placeholder="مرجع المصدر" aria-label={`مرجع ${account.nameAr}`} value={value.sourceReference} disabled={!editable || busy} onChange={event => updateDraft(account.id, "sourceReference", event.target.value)}/></div></details>
        {editable && <button type="button" className="mt-3 min-h-10 w-full rounded-lg bg-[#0A5960] px-3 text-sm font-bold text-white disabled:opacity-50" disabled={busy || !drafts[account.id]} onClick={() => saveLine(account.id)}>حفظ رصيد الحساب</button>}
      </div>;
    })}
    {!accounts.length && <p className="text-sm text-slate-600">لا توجد حسابات تطابق البحث.</p>}
  </div>;
}

export function OpeningWorkspace({ organizationId, capability, canManageTeam }: { organizationId: string; capability: Capability; canManageTeam: boolean }) {
  const base = `/api/organizations/${organizationId}/opening-balances`;
  const [overview, setOverview] = useState<Overview | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [batchId, setBatchId] = useState("");
  const [yearId, setYearId] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [showAudit, setShowAudit] = useState(false);
  const [audit, setAudit] = useState<Array<{ id: string; action: string; createdAt: string; metadata: Record<string, unknown> }>>([]);
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<Record<string, string>>({});
  const [stageId, setStageId] = useState("");
  const [accountMapping, setAccountMapping] = useState<Record<string, string>>({});
  const [previewIssues, setPreviewIssues] = useState<Issue[]>([]);
  const [overwrite, setOverwrite] = useState(false);

  const loadOverview = useCallback(async () => {
    const data = await jsonRequest(base) as Overview;
    setOverview(data);
    setYearId(current => current || data.fiscalYears[0]?.id || "");
    return data;
  }, [base]);
  const loadDetail = useCallback(async (id: string) => {
    const data = await jsonRequest(`${base}/${id}`) as Detail;
    setDetail(data);
    return data;
  }, [base]);
  useEffect(() => { void fetch(base, { cache: "no-store" }).then(async response => { const data = await response.json() as Overview & { error?: string }; if (!response.ok) throw new Error(data.error || "تعذر تحميل الأرصدة."); setOverview(data); setYearId(data.fiscalYears[0]?.id || ""); const first = data.batches[0]; if (first) { setBatchId(first.id); await loadDetail(first.id); } }).catch(e => setError(e.message)); }, [base, loadDetail]);
  const dirty = Object.keys(drafts).length > 0;
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  const batch = detail?.batch;
  const editable = Boolean(batch && ["DRAFT", "REJECTED"].includes(batch.status) && capability.edit);
  const lines = useMemo(() => new Map((batch?.lines ?? []).map(line => [line.accountId, line])), [batch]);
  const visible = useMemo(() => (detail?.accounts ?? []).filter(account => account.isActive && (!category || account.accountClass === category) && (!query || `${account.code} ${account.nameAr}`.toLowerCase().includes(query.toLowerCase()))), [detail, query, category]);
  const stage = batch?.imports.find(item => item.id === stageId);
  const classes = [...new Set(detail?.accounts.map(account => account.accountClass) ?? [])];

  async function execute(action: () => Promise<unknown>, success: string, reload = true) {
    setBusy(true); setError(""); setMessage("");
    try { await action(); if (reload) { await loadOverview(); if (batchId) await loadDetail(batchId); } setMessage(success); }
    catch (e) { setError(e instanceof Error ? e.message : "حدث خطأ."); }
    finally { setBusy(false); }
  }
  function switchBatch(id: string) {
    if (dirty && !window.confirm("هناك تعديلات غير محفوظة. هل تريد تجاهلها؟")) return;
    setBatchId(id); setDrafts({}); setStageId(""); setPreviewIssues([]); setAccountMapping({}); setError(""); setMessage("");
    void loadDetail(id).catch(e => setError(e.message));
  }
  function updateDraft(accountId: string, field: keyof Draft, value: string) {
    const before = lines.get(accountId);
    setDrafts(current => ({ ...current, [accountId]: { ...(current[accountId] ?? { debit: before?.debit ?? "0", credit: before?.credit ?? "0", explanation: before?.explanation ?? "", sourceReference: before?.sourceReference ?? "" }), [field]: value } }));
  }
  function saveLine(accountId: string) {
    if (!batch) return;
    const value = drafts[accountId];
    if (!value) return;
    void execute(async () => {
      await jsonRequest(`${base}/${batch.id}/lines`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: batch.revision, accountId, ...value }) });
      setDrafts(current => { const next = { ...current }; delete next[accountId]; return next; });
    }, "حُفظ رصيد الحساب.");
  }
  function act(action: "VALIDATE" | "SUBMIT" | "REVIEW" | "APPROVE" | "REJECT") {
    if (!batch) return;
    if (dirty) { setError("احفظ تعديلات الحسابات أولًا."); return; }
    if (action === "APPROVE" && !window.confirm("سيُقفل الرصيد المعتمد لهذه السنة. هل تؤكد الاعتماد؟")) return;
    void execute(() => jsonRequest(`${base}/${batch.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, revision: batch.revision, reason }) }), action === "VALIDATE" ? "اكتمل الفحص." : "تم تسجيل الإجراء.");
  }
  function createBatch() {
    if (!yearId) { setError("اختر سنة مالية أولًا."); return; }
    const approved = overview?.batches.find(item => item.fiscalYearId === yearId && item.status === "APPROVED");
    const correctionReason = approved ? window.prompt("اكتب سبب تصحيح النسخة المعتمدة (10 أحرف على الأقل):") : undefined;
    if (approved && !correctionReason) return;
    void execute(async () => {
      const result = await jsonRequest(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fiscalYearId: yearId, correctionOfId: approved?.id, correctionReason }) }) as { batch: { id: string } };
      setBatchId(result.batch.id); setDrafts({}); await loadDetail(result.batch.id);
    }, approved ? "أُنشئت مسودة التصحيح." : "المسودة جاهزة.", false).then(() => { void loadOverview(); });
  }
  async function upload() {
    if (!batch || !file || dirty) { setError("اختر ملفًا واحفظ أي تعديل يدوي أولًا."); return; }
    const form = new FormData(); form.set("file", file); form.set("revision", String(batch.revision));
    const selected = Object.fromEntries(Object.entries(columns).filter(([, value]) => value).map(([key, value]) => [key, Number(value)]));
    if (Object.keys(selected).length) form.set("mapping", JSON.stringify(selected));
    await execute(async () => {
      const response = await jsonRequest(`${base}/${batch.id}/imports`, { method: "POST", body: form }) as { stageId: string; preview: { issues: Issue[] } };
      setStageId(response.stageId); setPreviewIssues(response.preview.issues); setAccountMapping({}); setOverwrite(false); setFile(null);
    }, "اكتملت المعاينة. راجع الصفوف قبل التأكيد.");
  }
  function applyStage(action: "APPLY" | "REJECT") {
    if (!batch || !stageId) return;
    if (action === "APPLY" && !window.confirm("هل تؤكد حفظ الصفوف الصالحة في المسودة؟")) return;
    void execute(() => jsonRequest(`${base}/${batch.id}/imports/${stageId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, revision: batch.revision, accountMapping, overwriteExisting: overwrite }) }), action === "APPLY" ? "حُفظ الاستيراد في المسودة. افحص التوازن قبل التقديم." : "رُفض الاستيراد.");
  }
  function loadAudit() {
    if (!batch) return;
    setShowAudit(true);
    void jsonRequest(`${base}/${batch.id}/audit`).then(data => setAudit(data)).catch(e => setError(e.message));
  }
  const fieldClass = "min-h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-teal-700";
  const buttonClass = "min-h-10 rounded-xl bg-[#0A5960] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50";

  return <div dir="rtl" className="space-y-6 text-[#102B4C]">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/company/${organizationId}`} className="text-sm font-bold text-teal-700 underline">لوحة الشركة</Link><h1 className="mt-2 text-3xl font-black">أرصدة أول المدة</h1><p className="mt-1 text-sm text-slate-600">أرصدة مرتبطة بالسنة المالية ودليل الحسابات الفعلي.</p></div><span className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">الاعتماد لا يعني الترحيل إلى الأستاذ العام</span></div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    {message && <div role="status" className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">{message}</div>}
    {!overview && !error && <p>جارٍ تحميل البيانات…</p>}
    {overview && <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-end gap-3"><label className="flex flex-col gap-1 text-sm font-bold">السنة المالية<select className={fieldClass} value={yearId} onChange={event => setYearId(event.target.value)}><option value="">اختر سنة</option>{overview.fiscalYears.map(year => <option key={year.id} value={year.id}>{year.name}{year.isClosed ? " · مغلقة" : ""}</option>)}</select></label>{capability.create && <button type="button" className={buttonClass} disabled={busy || !yearId || !overview.installation} onClick={createBatch}>إنشاء أو فتح مسودة</button>}<a className="min-h-10 rounded-xl border border-teal-700 px-4 py-2 text-sm font-bold text-teal-800" href={`${base}/template`}>تنزيل قالب Excel</a></div>{!overview.installation && <p className="mt-3 text-sm text-amber-800">يلزم تهيئة دليل الحسابات التجاري أولًا.</p>}<div className="mt-4 flex flex-wrap gap-2">{overview.batches.map(item => <button key={item.id} type="button" onClick={() => switchBatch(item.id)} className={`rounded-xl border px-3 py-2 text-sm ${batchId === item.id ? "border-teal-700 bg-teal-50 font-bold" : "border-slate-200"}`}>{overview.fiscalYears.find(year => year.id === item.fiscalYearId)?.name || "سنة مالية"} · {statusLabels[item.status] || item.status}</button>)}</div>{!overview.batches.length && <p className="mt-4 text-sm text-slate-600">لا توجد أرصدة مسجلة بعد.</p>}</section>}
    {batch?.status === "SUBMITTED" && <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">تنتظر الدفعة مراجعة شخص آخر غير مُعدّها. {canManageTeam ? <a className="font-bold underline" href="#opening-team-access">أضف مراجعًا وحدد صلاحياته</a> : "اطلب من مسؤول الشركة إضافة مراجع وتحديد صلاحياته."}</p>}
    {batch && detail && <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">{statusLabels[batch.status] || batch.status}</h2><p className="mt-1 text-sm text-slate-600">تاريخ الأرصدة: {new Date(batch.openingDate).toLocaleDateString("ar-EG", { timeZone: "Africa/Cairo" })} · العملة: {batch.baseCurrency} · المراجعة: {batch.revision}</p>{batch.correctionOfId && <p className="mt-1 text-xs text-amber-800">هذه مسودة تصحيح لنسخة معتمدة سابقة.</p>}{batch.rejectionReason && <p className="mt-2 text-sm text-red-700">سبب الرفض: {batch.rejectionReason}</p>}</div><div className="flex flex-wrap gap-2"><button className={buttonClass} disabled={busy} onClick={() => act("VALIDATE")}>فحص الدفعة</button>{capability.submit && editable && <button className={buttonClass} disabled={busy || dirty} onClick={() => act("SUBMIT")}>تقديم للمراجعة</button>}{capability.review && batch.status === "SUBMITTED" && <button className={buttonClass} disabled={busy} onClick={() => act("REVIEW")}>تسجيل المراجعة</button>}{capability.approve && batch.status === "SUBMITTED" && <button className={buttonClass} disabled={busy || !batch.reviewedAt} onClick={() => act("APPROVE")}>اعتماد وقفل</button>}{capability.audit && <button className="min-h-10 rounded-xl border border-slate-300 px-4 text-sm font-bold" onClick={loadAudit}>سجل التدقيق</button>}</div></div>{capability.review && batch.status === "SUBMITTED" && <div className="mt-4 flex flex-wrap gap-2"><input className={`${fieldClass} min-w-[240px] flex-1`} value={reason} onChange={event => setReason(event.target.value)} placeholder="سبب الرفض إن لزم (10 أحرف على الأقل)" aria-label="سبب رفض الدفعة"/><button className="min-h-10 rounded-xl border border-red-300 px-4 text-sm font-bold text-red-800" disabled={busy} onClick={() => act("REJECT")}>رفض للتصحيح</button></div>}<div className="mt-5 grid gap-3 sm:grid-cols-4">{[["إجمالي المدين", detail.validation.totals.debit], ["إجمالي الدائن", detail.validation.totals.credit], ["الفرق", detail.validation.totals.difference], ["عدد الحسابات", String(detail.validation.lineCount)]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-600">{label}</p><p dir="ltr" className="mt-1 text-right text-xl font-black tabular-nums">{value}</p></div>)}</div>{detail.validation.issues.length ? <ul className="mt-4 list-inside list-disc rounded-xl bg-amber-50 p-4 text-sm text-amber-950">{detail.validation.issues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}</ul> : <p className="mt-4 text-sm font-bold text-teal-800">فحص القواعد المحاسبية الحالي بلا أخطاء.</p>}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">أرصدة الحسابات</h2><p className="text-sm text-slate-600">الحسابات التفصيلية النشطة فقط. احفظ كل صف بعد تعديله.</p></div><div className="flex flex-wrap gap-2"><input className={fieldClass} value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث بالكود أو الاسم" aria-label="بحث الحسابات"/><select className={fieldClass} value={category} onChange={event => setCategory(event.target.value)} aria-label="تصنيف الحساب"><option value="">كل التصنيفات</option>{classes.map(item => <option key={item} value={item}>{item}</option>)}</select></div></div><OpeningMobileAccounts accounts={visible} lines={lines} drafts={drafts} editable={editable} busy={busy} updateDraft={updateDraft} saveLine={saveLine}/><div className="mt-4 hidden max-h-[640px] overflow-auto rounded-xl border border-slate-200 md:block"><table className="min-w-[900px] w-full border-collapse text-sm"><thead className="sticky top-0 bg-[#102B4C] text-white"><tr>{["الكود", "الحساب", "التصنيف", "الطبيعة", "مدين", "دائن", "البيان", "المرجع", "الحفظ"].map(item => <th key={item} scope="col" className="px-3 py-3 text-right">{item}</th>)}</tr></thead><tbody>{visible.map(account => { const saved = lines.get(account.id); const value = drafts[account.id] ?? { debit: saved?.debit ?? "", credit: saved?.credit ?? "", explanation: saved?.explanation ?? "", sourceReference: saved?.sourceReference ?? "" }; return <tr key={account.id} className="border-t border-slate-100 even:bg-slate-50"><td dir="ltr" className="px-3 py-2 font-mono">{account.code}</td><td className="min-w-48 px-3 py-2 font-bold">{account.nameAr}</td><td className="px-3 py-2 text-xs">{classLabels[account.accountClass] || account.accountClass}</td><td className="px-3 py-2 text-xs">{balanceLabels[account.normalBalance] || account.normalBalance}</td>{(["debit", "credit", "explanation", "sourceReference"] as const).map(field => <td key={field} className="px-2 py-2"><input className="w-full min-w-24 rounded-lg border border-slate-300 p-2 disabled:bg-transparent" dir={field === "debit" || field === "credit" ? "ltr" : "rtl"} inputMode={field === "debit" || field === "credit" ? "decimal" : undefined} value={value[field]} onChange={event => updateDraft(account.id, field, event.target.value)} disabled={!editable || busy} aria-label={`${columnLabels[field]} ${account.nameAr}`}/></td>)}<td className="px-2 py-2"><button className={buttonClass} disabled={!editable || busy || !drafts[account.id]} onClick={() => saveLine(account.id)}>حفظ</button></td></tr>; })}</tbody></table>{!visible.length && <p className="p-5 text-sm text-slate-600">لا توجد حسابات تطابق البحث.</p>}</div>{dirty && <p className="mt-3 text-sm font-bold text-amber-800">هناك {Object.keys(drafts).length} صفوف غير محفوظة.</p>}</section>
      {capability.import && editable && <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="text-xl font-black">استيراد Excel</h2><p className="mt-1 text-sm text-slate-600">XLSX فقط، حتى 2 ميجابايت و1000 صف. تُحفظ المعاينة لمدة 24 ساعة دون تخزين الملف الأصلي.</p><div className="mt-4 flex flex-wrap items-end gap-3"><label className="flex flex-col gap-1 text-sm font-bold">الملف<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event => setFile(event.target.files?.[0] ?? null)} className="sr-only"/><span className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-teal-700 px-4 text-teal-900 focus-within:outline-2">اختر ملف XLSX</span><span className="max-w-64 truncate text-xs font-normal text-slate-600">{file?.name || "لم يتم اختيار ملف"}</span></label><button className={buttonClass} disabled={busy || !file} onClick={() => void upload()}>معاينة الملف</button></div><details className="mt-3 text-sm"><summary className="cursor-pointer font-bold text-teal-800">ربط الأعمدة يدويًا إذا اختلفت العناوين</summary><div className="mt-3 grid gap-2 sm:grid-cols-3">{Object.entries(columnLabels).map(([key, label]) => <label key={key} className="flex items-center justify-between gap-2">{label}<select className={fieldClass} value={columns[key] || ""} onChange={event => setColumns(current => ({ ...current, [key]: event.target.value }))}><option value="">تلقائي</option>{Array.from({ length: 20 }, (_, index) => <option key={index} value={index + 1}>العمود {index + 1}</option>)}</select></label>)}</div></details>{batch.imports.length > 0 && <div className="mt-4"><label className="text-sm font-bold">معاينات الملف السابقة<select className={`${fieldClass} mr-3`} value={stageId} onChange={event => { setStageId(event.target.value); setPreviewIssues([]); setAccountMapping({}); }}><option value="">اختر معاينة</option>{batch.imports.map(item => <option key={item.id} value={item.id}>{item.originalName} · {item.status}</option>)}</select></label></div>}{stage && <div className="mt-4 space-y-3"><p className="text-sm font-bold">{stage.originalName} · {stage.status} · {stage.rows.items?.length ?? 0} صف</p>{previewIssues.length > 0 && <ul className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{previewIssues.map((issue, index) => <li key={index}>الصف {issue.rowNumber}: {issue.message}</li>)}</ul>}<div className="max-h-80 overflow-auto rounded-xl border border-slate-200"><table className="min-w-[760px] w-full text-sm"><thead className="bg-slate-100"><tr>{["الصف", "الكود", "الاسم بالملف", "مدين", "دائن", "ربط الحساب الموجود"].map(item => <th key={item} className="p-2 text-right">{item}</th>)}</tr></thead><tbody>{stage.rows.items?.map(row => <tr key={row.rowNumber} className="border-t border-slate-100"><td className="p-2">{row.rowNumber}</td><td className="p-2">{row.code || "—"}</td><td className="p-2">{row.name}</td><td dir="ltr" className="p-2 text-right">{row.debit}</td><td dir="ltr" className="p-2 text-right">{row.credit}</td><td className="p-2"><select className={fieldClass} value={accountMapping[String(row.rowNumber)] || ""} onChange={event => setAccountMapping(current => ({ ...current, [String(row.rowNumber)]: event.target.value }))}><option value="">تلقائي حسب الكود</option>{detail.accounts.filter(account => account.isActive).map(account => <option key={account.id} value={account.id}>{account.code} · {account.nameAr}</option>)}</select></td></tr>)}</tbody></table></div>{stage.status === "PREVIEW" && <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={overwrite} onChange={event => setOverwrite(event.target.checked)}/> أؤكد استبدال الحسابات الموجودة في المسودة إن تطابقت</label><button className={buttonClass} disabled={busy} onClick={() => applyStage("APPLY")}>تأكيد الحفظ في المسودة</button><button className="min-h-10 rounded-xl border border-red-300 px-4 text-sm font-bold text-red-800" disabled={busy} onClick={() => applyStage("REJECT")}>رفض المعاينة</button></div>}</div>}</section>}
      {showAudit && capability.audit && <section className="rounded-2xl border border-slate-200 bg-white p-4"><h2 className="text-xl font-black">سجل إجراءات الدفعة</h2><ul className="mt-3 space-y-2 text-sm">{audit.map(item => <li key={item.id} className="rounded-lg bg-slate-50 p-3"><span className="font-bold">{item.action}</span> · {new Date(item.createdAt).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })} · المستخدم {String(item.metadata.actorName || item.metadata.actorId || "—")}</li>)}</ul>{!audit.length && <p className="mt-3 text-sm text-slate-600">لا توجد أحداث بعد.</p>}</section>}
    </>}
  </div>;
}
