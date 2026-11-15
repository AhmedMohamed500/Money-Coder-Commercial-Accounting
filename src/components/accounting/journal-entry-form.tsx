"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Save, Trash2 } from "lucide-react";

type Account = { id: string; code: string; nameAr: string };
type FiscalYear = { id: string; name: string; startsAt: string; endsAt: string };
type DraftLine = { key: string; accountId: string; debit: string; credit: string; description: string; sourceReference: string };
const field = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100";
const newLine = (): DraftLine => ({ key: crypto.randomUUID(), accountId: "", debit: "", credit: "", description: "", sourceReference: "" });

export function JournalEntryForm({ organizationId, accounts, fiscalYears, currency, defaultDate }: { organizationId: string; accounts: Account[]; fiscalYears: FiscalYear[]; currency: string; defaultDate: string }) {
  const router = useRouter(); const [lines, setLines] = useState<DraftLine[]>([newLine(), newLine()]); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const accountOptions = useMemo(() => accounts.map(account => <option key={account.id} value={account.id}>{account.code} — {account.nameAr}</option>), [accounts]);
  const update = (key: string, name: keyof Omit<DraftLine, "key">, value: string) => setLines(current => current.map(line => line.key === key ? { ...line, [name]: value } : line));
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const body = { fiscalYearId: String(form.get("fiscalYearId")), transactionDate: String(form.get("transactionDate")), postingDate: String(form.get("postingDate")), reference: String(form.get("reference")), description: String(form.get("description")), currency: String(form.get("currency")), idempotencyKey: crypto.randomUUID(), sourceType: String(form.get("sourceType")) as "MANUAL" | "DOCUMENT" | "BANK_STATEMENT", sourceReference: String(form.get("sourceReference") || "") || undefined, lines: lines.map(({ accountId, debit, credit, description, sourceReference }) => ({ accountId, debit: debit || "0", credit: credit || "0", description: description || undefined, sourceReference: sourceReference || undefined })) };
    try {
      const response = await fetch(`/api/organizations/${organizationId}/journal-entries`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { entry?: { id: string }; error?: string };
      if (!response.ok || !result.entry) throw new Error(result.error || "تعذر حفظ القيد.");
      router.push(`/company/${organizationId}/accounting/journal-entries/${result.entry.id}`); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر حفظ القيد."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-6">
    <header><Link href={`/company/${organizationId}/accounting/journal-entries`} className="text-sm font-bold text-teal-700 underline">العودة إلى القيود</Link><h1 className="mt-3 text-3xl font-black">إنشاء قيد يومية جديد</h1><p className="mt-2 text-sm text-slate-600">يحفظ القيد كمسودة. التقديم والاعتماد والترحيل خطوات مستقلة.</p></header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p>}
    <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm font-bold">السنة المالية<select name="fiscalYearId" required className={`mt-1 ${field}`}><option value="">اختر السنة</option>{fiscalYears.map(year => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
      <label className="text-sm font-bold">تاريخ العملية<input name="transactionDate" type="date" required defaultValue={defaultDate} className={`mt-1 ${field}`}/></label>
      <label className="text-sm font-bold">تاريخ الترحيل<input name="postingDate" type="date" required defaultValue={defaultDate} className={`mt-1 ${field}`}/></label>
      <label className="text-sm font-bold">العملة<input name="currency" required defaultValue={currency} maxLength={3} className={`mt-1 ${field}`} dir="ltr"/></label>
      <label className="text-sm font-bold">مرجع القيد<input name="reference" required minLength={2} maxLength={80} placeholder="JV-2026-001" className={`mt-1 ${field}`} dir="ltr"/></label>
      <label className="text-sm font-bold md:col-span-2">البيان<input name="description" required minLength={3} maxLength={500} placeholder="وصف واضح للغرض المحاسبي" className={`mt-1 ${field}`}/></label>
      <label className="text-sm font-bold">نوع المصدر<select name="sourceType" className={`mt-1 ${field}`}><option value="MANUAL">يدوي</option><option value="DOCUMENT">مستند</option><option value="BANK_STATEMENT">كشف بنك</option></select></label>
      <label className="text-sm font-bold md:col-span-2">مرجع المصدر<input name="sourceReference" maxLength={160} className={`mt-1 ${field}`} placeholder="اختياري"/></label>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">سطور القيد</h2><p className="text-sm text-slate-600">كل سطر مدين أو دائن فقط، والحساب يجب أن يكون نشطًا وقابلًا للترحيل.</p></div><button type="button" onClick={() => setLines(current => [...current, newLine()])} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-teal-700 px-4 text-sm font-bold text-teal-800"><Plus size={17}/> إضافة سطر</button></div>
      <div className="mt-5 hidden overflow-x-auto md:block"><table className="min-w-[1050px] w-full border-collapse text-sm"><thead className="bg-[#102B4C] text-white"><tr>{["الحساب", "مدين", "دائن", "بيان السطر", "مرجع المصدر", ""].map(label => <th key={label} className="px-3 py-3 text-right">{label}</th>)}</tr></thead><tbody>{lines.map(line => <tr key={line.key} className="border-t border-slate-100"><td className="min-w-64 p-2"><select required value={line.accountId} onChange={event => update(line.key, "accountId", event.target.value)} className={field}><option value="">اختر الحساب</option>{accountOptions}</select></td><td className="p-2"><input inputMode="decimal" value={line.debit} onChange={event => update(line.key, "debit", event.target.value)} className={field} dir="ltr"/></td><td className="p-2"><input inputMode="decimal" value={line.credit} onChange={event => update(line.key, "credit", event.target.value)} className={field} dir="ltr"/></td><td className="p-2"><input value={line.description} onChange={event => update(line.key, "description", event.target.value)} className={field}/></td><td className="p-2"><input value={line.sourceReference} onChange={event => update(line.key, "sourceReference", event.target.value)} className={field}/></td><td className="p-2"><button type="button" aria-label="حذف السطر" disabled={lines.length <= 2} onClick={() => setLines(current => current.filter(item => item.key !== line.key))} className="rounded-lg p-2 text-red-700 disabled:opacity-30"><Trash2 size={18}/></button></td></tr>)}</tbody></table></div>
      <div className="mt-5 grid gap-4 md:hidden">{lines.map((line, index) => <div key={line.key} className="rounded-xl border border-slate-200 p-4"><div className="mb-3 flex items-center justify-between"><strong>السطر {index + 1}</strong><button type="button" aria-label="حذف السطر" disabled={lines.length <= 2} onClick={() => setLines(current => current.filter(item => item.key !== line.key))} className="text-red-700 disabled:opacity-30"><Trash2 size={18}/></button></div><div className="grid gap-3"><select required value={line.accountId} onChange={event => update(line.key, "accountId", event.target.value)} className={field}><option value="">اختر الحساب</option>{accountOptions}</select><div className="grid grid-cols-2 gap-2"><input aria-label="مدين" placeholder="مدين" inputMode="decimal" value={line.debit} onChange={event => update(line.key, "debit", event.target.value)} className={field} dir="ltr"/><input aria-label="دائن" placeholder="دائن" inputMode="decimal" value={line.credit} onChange={event => update(line.key, "credit", event.target.value)} className={field} dir="ltr"/></div><input aria-label="بيان السطر" placeholder="بيان السطر" value={line.description} onChange={event => update(line.key, "description", event.target.value)} className={field}/><input aria-label="مرجع المصدر" placeholder="مرجع المصدر" value={line.sourceReference} onChange={event => update(line.key, "sourceReference", event.target.value)} className={field}/></div></div>)}</div>
    </section>
    <button disabled={busy || !fiscalYears.length || accounts.length < 2} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#064B50] px-6 font-bold text-white disabled:opacity-50"><Save size={18}/>{busy ? "جاري الحفظ..." : "حفظ المسودة"}</button>
  </form>;
}
