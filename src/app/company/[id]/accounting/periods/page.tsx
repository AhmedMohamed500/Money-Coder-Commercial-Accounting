import { notFound } from "next/navigation";
import { CompanyShell } from "@/components/accounting/company-shell";
import { AccountingPeriodsWorkspace } from "@/components/accounting/accounting-periods-workspace";
import { loadCompanyContext } from "@/lib/accounting/company-operations";
import { accountingPeriodsOverview } from "@/lib/accounting/journal-service";
import { authorizeOrganization, requireUser } from "@/lib/auth";

export default async function AccountingPeriodsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fiscalYearId?: string }> }) {
  const user = await requireUser(); const { id } = await params; const query = await searchParams;
  const context = await loadCompanyContext(user.id, id); if (!context?.canLedger) notFound();
  const [overview, canManage] = await Promise.all([accountingPeriodsOverview(id, query.fiscalYearId), authorizeOrganization(user.id, id, "accounting:periods:manage")]);
  return <CompanyShell organizationId={id} companyName={context.company.tradeName || context.company.legalName} userName={user.displayName} delegated={context.delegated} canChart={context.canChart} canOpening={context.canOpening} canAudit={context.canAudit} canManageTeam={context.canManageTeam} canAutomation={context.canAutomation} canBankStatements={context.canBankStatements} canJournal={context.canJournal} canLedger={context.canLedger} canTrialBalance={context.canTrialBalance}>
    <div className="space-y-6"><header><p className="text-sm font-bold text-teal-700">الرقابة المحاسبية</p><h1 className="mt-2 text-3xl font-black">الفترات المحاسبية</h1><p className="mt-2 text-sm text-slate-600">راجع القيود المعلقة قبل الإغلاق. لا توجد إعادة فتح أو إقفال سنة مالية في هذه المرحلة.</p></header>
      <form className="rounded-2xl border bg-white p-4"><label className="text-sm font-bold">السنة المالية<select name="fiscalYearId" defaultValue={overview.selectedFiscalYearId ?? ""} className="mr-3 min-h-11 rounded-xl border px-3">{overview.fiscalYears.map(year => <option key={year.id} value={year.id}>{year.name}{year.isClosed ? " · السنة مغلقة" : ""}</option>)}</select></label><button className="mr-3 min-h-11 rounded-xl border border-teal-700 px-4 font-bold text-teal-900">عرض</button></form>
      <AccountingPeriodsWorkspace organizationId={id} periods={overview.periods} canManage={Boolean(canManage)}/>
    </div>
  </CompanyShell>;
}
