"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Job = { id: string; sourceReference: string; processingType: string; provider: string; status: string; attemptCount: number; revision: number; createdAt: string; updatedAt: string; failureCategory: string | null; failureMessage: string | null; requestedBy: { displayName: string }; statement: { id: string; reviewStatus: string; mathStatus: string } | null };
type Payload = { total: number; page: number; pages: number; jobs: Job[]; counts: Record<string, number>; lastUpdatedAt: string | null; availability: { mode: string; available: boolean; reason: string } };
const labels: Record<string, string> = { CREATED: "أنشئت", QUEUED: "بالانتظار", PROCESSING: "قيد المعالجة", NEEDS_REVIEW: "تنتظر المراجعة", REVIEWED: "مراجعة مكتملة", REVIEW_REJECTED: "رُفض الكشف", PROCESSING_FAILED: "فشل المعالجة", TIMED_OUT: "انتهت المهلة", CANCELLED: "ألغيت" };
const formatTime = (value: string | null) => value ? new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(value)) : "لا توجد معالجة بعد";

export function AutomationCenter({ organizationId, accounts, canCreate, canRetry }: { organizationId: string; accounts: Array<{ id: string; bankName: string; accountName: string }>; canCreate: boolean; canRetry: boolean }) {
  const [data, setData] = useState<Payload | null>(null);
  const [search, setSearch] = useState(""); const [status, setStatus] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [page, setPage] = useState(1);
  const [bankAccountId, setBankAccountId] = useState(accounts[0]?.id ?? "");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const base = `/api/organizations/${organizationId}/automation/jobs`;
  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search); if (status) params.set("status", status); if (from) params.set("from", from); if (to) params.set("to", to);
    try { const response = await fetch(`${base}?${params}`, { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "تعذر تحميل المعالجات."); setData(body); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر التحميل."); }
  }, [base, page, search, status, from, to]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  async function createSample() {
    if (!bankAccountId) return;
    setBusy(true); setError("");
    try { const response = await fetch(base, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ bankAccountId, idempotencyKey: crypto.randomUUID().replaceAll("-", "") }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر إنشاء العينة."); }
    finally { setBusy(false); }
  }
  async function retry(job: Job) {
    setBusy(true); setError("");
    try { const response = await fetch(`${base}/${job.id}/retry`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ revision: job.revision }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "تعذرت إعادة المحاولة."); }
    finally { setBusy(false); }
  }
  const metrics = [
    ["إجمالي الوظائف", data ? String(Object.values(data.counts).reduce((sum, value) => sum + value, 0)) : "—"],
    ["قيد المعالجة", data ? String((data.counts.QUEUED ?? 0) + (data.counts.PROCESSING ?? 0)) : "—"],
    ["بانتظار المراجعة", data ? String(data.counts.NEEDS_REVIEW ?? 0) : "—"],
    ["مراجعة مكتملة", data ? String(data.counts.REVIEWED ?? 0) : "—"],
    ["فشل/مهلة", data ? String((data.counts.PROCESSING_FAILED ?? 0) + (data.counts.TIMED_OUT ?? 0)) : "—"],
  ];
  return <div className="space-y-6">
    <header><p className="text-sm font-bold text-teal-700">الشركة / الأتمتة</p><h1 className="mt-2 text-3xl font-black">مركز الأتمتة المالية</h1><p className="mt-2 text-sm text-slate-600">حالات محفوظة من قاعدة بيانات شركتك. نجاح المعالجة لا يعني اعتمادًا محاسبيًا.</p></header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><strong className="mt-2 block text-2xl">{value}</strong></div>)}</div>
    <p className="text-xs text-slate-500">آخر تحديث: {formatTime(data?.lastUpdatedAt ?? null)}</p>
    {data && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="status">{data.availability.reason}{data.availability.mode === "MOCK" && data.availability.available && <p className="mt-1">العينة اصطناعية؛ لا تُرفع ملفات ولا يُستدعى n8n.</p>}</div>}
    {data?.availability.mode === "MOCK" && data.availability.available && canCreate && <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black">تجربة محلية بعينة اصطناعية</h2><p className="mt-1 text-sm text-slate-600">15 حركة وهمية لمراجعة الواجهة والحساب، دون مستند أو اتصال بنكي.</p><div className="mt-3 flex flex-wrap gap-3"><select aria-label="الحساب البنكي المسجل" value={bankAccountId} onChange={event => setBankAccountId(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 px-3">{accounts.map(account => <option key={account.id} value={account.id}>{account.bankName} — {account.accountName}</option>)}</select><button type="button" disabled={busy || !bankAccountId} onClick={createSample} className="min-h-11 rounded-xl bg-teal-800 px-5 text-sm font-bold text-white disabled:opacity-50">أنشئ عينة للمراجعة</button></div>{!accounts.length && <p className="mt-2 text-sm text-amber-900">سجّل حسابًا بنكيًا نشطًا أولًا في إعدادات الشركة.</p>}</div>}
    <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-5" onSubmit={event => { event.preventDefault(); setPage(1); void load(); }}><label className="text-sm">بحث<input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="مرجع الوظيفة" className="mt-1 w-full rounded-lg border p-2" /></label><label className="text-sm">الحالة<select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className="mt-1 w-full rounded-lg border p-2"><option value="">الكل</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="text-sm">من<input type="date" value={from} onChange={event => { setFrom(event.target.value); setPage(1); }} className="mt-1 w-full rounded-lg border p-2" /></label><label className="text-sm">إلى<input type="date" value={to} onChange={event => { setTo(event.target.value); setPage(1); }} className="mt-1 w-full rounded-lg border p-2" /></label><button type="submit" className="self-end rounded-lg border border-teal-700 px-4 py-2 text-sm font-bold">تحديث النتائج</button></form>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-900">{error}</p>}
    {!data ? <p>جارٍ تحميل الوظائف…</p> : !data.jobs.length ? <p className="rounded-2xl border bg-white p-8 text-center text-slate-600">لا توجد وظائف مطابقة.</p> : <div className="space-y-3">{data.jobs.map(job => <article key={job.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-xs font-bold text-teal-700">{labels[job.status] ?? job.status}</span><h2 className="mt-1 font-black">{job.sourceReference}</h2><p className="mt-1 break-all text-xs text-slate-500">{job.id}</p></div><div className="text-sm text-slate-600">{formatTime(job.createdAt)}</div></div><p className="mt-3 text-sm text-slate-600">{job.processingType} · {job.provider} · طلبه {job.requestedBy.displayName} · المحاولة {job.attemptCount}</p>{job.failureCategory && <p className="mt-2 text-sm text-red-700">{job.failureCategory}: {job.failureMessage ?? "تعذر إكمال المعالجة."}</p>}<div className="mt-3 flex gap-3">{job.statement && <Link className="font-bold text-teal-800 underline" href={`/company/${organizationId}/bank-statements/${job.statement.id}`}>مراجعة الكشف</Link>}{canRetry && ["PROCESSING_FAILED", "TIMED_OUT"].includes(job.status) && <button type="button" disabled={busy} onClick={() => retry(job)} className="font-bold text-teal-800 underline">إعادة المحاولة</button>}</div></article>)}</div>}
    {data && data.pages > 1 && <div className="flex items-center gap-3"><button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">السابق</button><span>صفحة {data.page} من {data.pages}</span><button type="button" disabled={page >= data.pages} onClick={() => setPage(value => value + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">التالي</button></div>}
  </div>;
}
