import { notFound } from "next/navigation";
import { CompanyShell } from "@/components/accounting/company-shell";
import { JournalEntryDetail } from "@/components/accounting/journal-entry-detail";
import { loadCompanyContext } from "@/lib/accounting/company-operations";
import { authorizeOrganization, requireUser } from "@/lib/auth";

export default async function JournalEntryPage({ params }: { params: Promise<{ id: string; entryId: string }> }) {
  const user = await requireUser(); const { id, entryId } = await params; const context = await loadCompanyContext(user.id, id); if (!context?.canJournal) notFound();
  const checks = await Promise.all(["submit", "approve", "post", "reverse", "edit"].map(name => authorizeOrganization(user.id, id, `accounting:journal:${name}` as "accounting:journal:submit")));
  const capability = { submit: Boolean(checks[0]), approve: Boolean(checks[1]), post: Boolean(checks[2]), reverse: Boolean(checks[3]), edit: Boolean(checks[4]) };
  return <CompanyShell organizationId={id} companyName={context.company.tradeName || context.company.legalName} userName={user.displayName} delegated={context.delegated} canChart={context.canChart} canOpening={context.canOpening} canAudit={context.canAudit} canManageTeam={context.canManageTeam} canAutomation={context.canAutomation} canBankStatements={context.canBankStatements} canJournal={context.canJournal} canLedger={context.canLedger} canTrialBalance={context.canTrialBalance}><JournalEntryDetail organizationId={id} entryId={entryId} capability={capability}/></CompanyShell>;
}
