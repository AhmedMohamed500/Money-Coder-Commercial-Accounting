"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, LockKeyhole } from "lucide-react";

type Counts = { draft: number; submitted: number; approved: number; rejected: number; posted: number; reversed: number };
type Period = { id: string; name: string; startsAt: string | Date; endsAt: string | Date; status: "OPEN" | "CLOSED"; closedAt: string | Date | null; closedByName: string | null; counts: Counts };

function date(value: string | Date) { return new Date(value).toISOString().slice(0, 10); }

export function AccountingPeriodsWorkspace({ organizationId, periods, canManage }: { organizationId: string; periods: Period[]; canManage: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function close(period: Period) {
    const confirmation = window.prompt(`اكتب اسم الفترة للتأكيد: ${period.name}`)?.trim();
    if (!confirmation) return;
    setBusy(period.id); setError("");
    try {
      const response = await fetch(`/api/organizations/${organizationId}/accounting-periods/${period.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "CLOSE", confirmation }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "تعذر إغلاق الفترة.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر إغلاق الفترة."); }
    finally { setBusy(""); }
  }
  return <div className="space-y-4" data-testid="accounting-periods-list">
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p>}
    {periods.map(period => {
      const blocked = period.counts.submitted + period.counts.approved > 0;
      const warnings = period.counts.draft + period.counts.rejected;
      return <article key={period.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-period-status={period.status}>
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black">{period.name}</h2><span className={`rounded-full px-3 py-1 text-xs font-bold ${period.status === "OPEN" ? "bg-emerald-50 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{period.status === "OPEN" ? "مفتوحة" : "مغلقة"}</span></div><p className="mt-2 text-sm text-slate-600" dir="ltr">{date(period.startsAt)} — {date(period.endsAt)}</p>{period.closedAt && <p className="mt-2 text-xs text-slate-500">أُغلقت في {new Date(period.closedAt).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })} بواسطة {period.closedByName || "مستخدم سابق"}</p>}</div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-6">{[["مسودة", period.counts.draft], ["مقدمة", period.counts.submitted], ["معتمدة", period.counts.approved], ["مرفوضة", period.counts.rejected], ["مرحلة", period.counts.posted], ["معكوسة", period.counts.reversed]].map(([label, value]) => <div key={String(label)} className="min-w-16 rounded-lg bg-slate-50 p-2"><b className="block text-base">{value}</b>{label}</div>)}</div></div>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><p className={`rounded-lg p-3 ${blocked ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{blocked ? <AlertTriangle className="ml-1 inline" size={16}/> : <CheckCircle2 className="ml-1 inline" size={16}/>} {blocked ? "توجد قيود مقدمة أو معتمدة لم تُرحل." : "لا توجد قيود معلقة بين التقديم والترحيل."}</p><p className={`rounded-lg p-3 ${warnings ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-700"}`}><AlertTriangle className="ml-1 inline" size={16}/> {warnings ? `${warnings} مسودة/قيد مرفوض ستظل غير مرحلة بعد الإغلاق.` : "لا توجد مسودات أو قيود مرفوضة."}</p><p className="rounded-lg bg-blue-50 p-3 text-blue-900">الإغلاق يمنع الترحيل فقط، ولا يُعد شهادة اكتمال مالي أو توافق IFRS.</p></div>
        {period.status === "OPEN" && canManage && <button type="button" data-testid={`close-period-${period.id}`} disabled={Boolean(busy) || blocked} onClick={() => void close(period)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#102B4C] px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><LockKeyhole size={17}/>{busy === period.id ? "جاري الإغلاق..." : "إغلاق الفترة"}</button>}
      </article>;
    })}
    {!periods.length && <p className="rounded-xl border bg-white p-8 text-center text-slate-600">لا توجد فترات لهذه السنة المالية.</p>}
  </div>;
}
