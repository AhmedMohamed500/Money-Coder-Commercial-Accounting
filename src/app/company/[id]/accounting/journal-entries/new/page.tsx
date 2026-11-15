import { notFound } from "next/navigation";
import { CompanyShell } from "@/components/accounting/company-shell";
import { JournalEntryForm } from "@/components/accounting/journal-entry-form";
import { loadCompanyContext } from "@/lib/accounting/company-operations";
import { authorizeOrganization, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function NewJournalEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(); const { id } = await params; const context = await loadCompanyContext(user.id, id); if (!context?.canJournal || !await authorizeOrganization(user.id, id, "accounting:journal:create")) notFound();
  const [accounts, fiscalYears, settings] = await Promise.all([db.chartAccount.findMany({ where: { organizationId: id, deletedAt: null, isActive: true, isPostable: true }, orderBy: { code: "asc" }, select: { id: true, code: true, nameAr: true } }), db.companyFiscalYear.findMany({ where: { organizationId: id, isClosed: false }, orderBy: { startsAt: "desc" }, select: { id: true, name: true, startsAt: true, endsAt: true } }), db.companyAccountingSettings.findUnique({ where: { organizationId: id }, select: { baseCurrency: true } })]);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <CompanyShell organizationId={id} companyName={context.company.tradeName || context.company.legalName} userName={user.displayName} delegated={context.delegated} canChart={context.canChart} canOpening={context.canOpening} canAudit={context.canAudit} canManageTeam={context.canManageTeam} canAutomation={context.canAutomation} canBankStatements={context.canBankStatements} canJournal={context.canJournal} canLedger={context.canLedger} canTrialBalance={context.canTrialBalance}><JournalEntryForm organizationId={id} accounts={accounts} fiscalYears={fiscalYears.map(year => ({ ...year, startsAt: year.startsAt.toISOString(), endsAt: year.endsAt.toISOString() }))} currency={settings?.baseCurrency ?? "EGP"} defaultDate={today}/></CompanyShell>;
}
