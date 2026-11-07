import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanyShell } from "@/components/accounting/company-shell";
import { loadCompanyContext } from "@/lib/accounting/company-operations";
import { listBankStatements } from "@/lib/accounting/bank-automation-service";
import { requireUser } from "@/lib/auth";

const statusNames: Record<string, string> = { PENDING_REVIEW: "بانتظار المراجعة", CORRECTION_REQUESTED: "تصحيح مطلوب", REVIEWED: "تمت المراجعة", REJECTED: "مرفوض" };
export default async function BankStatementsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ search?: string; status?: string; page?: string }> }) {
  const user = await requireUser(); const { id } = await params; const query = await searchParams;
  const context = await loadCompanyContext(user.id, id);
  if (!context?.canBankStatements) notFound();
  const result = await listBankStatements(id, Number(query.page ?? 1) || 1, { search: query.search, status: query.status });
  const href = (page: number) => { const params = new URLSearchParams(); if (query.search) params.set("search", query.search); if (query.status) params.set("status", query.status); params.set("page", String(page)); return `/company/${id}/bank-statements?${params}`; };
  return <CompanyShell organizationId={id} companyName={context.company.tradeName || context.company.legalName} userName={user.displayName} delegated={context.delegated} canChart={context.canChart} canOpening={context.canOpening} canAudit={context.canAudit} canManageTeam={context.canManageTeam} canAutomation={context.canAutomation} canBankStatements={context.canBankStatements}>
    <div className="space-y-6"><header><p className="text-sm font-bold text-teal-700">الشركة / العمليات البنكية</p><h1 className="mt-2 text-3xl font-black">كشوف الحساب البنكية</h1><p className="mt-2 text-sm text-slate-600">نتائج محفوظة للمراجعة البشرية. المطابقة الحسابية داخل الكشف تختلف عن التسوية مع دفتر الأستاذ، وهي غير متاحة بعد.</p></header>
      <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4"><label className="text-sm">بحث باسم البنك<input name="search" defaultValue={query.search ?? ""} maxLength={120} className="mt-1 block min-h-11 rounded-lg border px-3" /></label><label className="text-sm">الحالة<select name="status" defaultValue={query.status ?? ""} className="mt-1 block min-h-11 rounded-lg border px-3"><option value="">الكل</option>{Object.entries(statusNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button className="min-h-11 rounded-lg border border-teal-700 px-5 font-bold">بحث</button></form>
      {!result.statements.length ? <p className="rounded-2xl border bg-white p-8 text-center text-slate-600">لا توجد كشوف مطابقة. إنشاء عينة محلية متاح من مركز الأتمتة عند تفعيل وضع الاختبار فقط.</p> : <div className="grid gap-3">{result.statements.map(statement => <article key={statement.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-black">{statement.bankAccount.bankName} — {statement.bankAccount.accountName}</h2><p className="mt-1 text-sm text-slate-600">المصدر: {statement.bankFromPdf} · {statement._count.transactions} حركة</p></div><span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-900">{statusNames[statement.reviewStatus]}</span></div><p className="mt-3 text-sm text-slate-600">إقفال الكشف: <b dir="ltr">{statement.closingBalance.toString()} {statement.currency}</b> · المطابقة الحسابية: {statement.mathStatus === "MATCHED" ? "مطابق" : "به فرق"}</p><Link href={`/company/${id}/bank-statements/${statement.id}`} className="mt-4 inline-block font-bold text-teal-800 underline">فتح المراجعة</Link></article>)}</div>}
      {result.pages > 1 && <nav className="flex items-center gap-3" aria-label="صفحات الكشوف">{result.page > 1 && <Link className="rounded-lg border px-3 py-2" href={href(result.page - 1)}>السابق</Link>}<span>صفحة {result.page} من {result.pages}</span>{result.page < result.pages && <Link className="rounded-lg border px-3 py-2" href={href(result.page + 1)}>التالي</Link>}</nav>}
    </div>
  </CompanyShell>;
}
