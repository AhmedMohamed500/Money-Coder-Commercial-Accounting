import { notFound } from "next/navigation";
import { CompanyShell } from "@/components/accounting/company-shell";
import { AutomationCenter } from "@/components/accounting/automation-center";
import { loadCompanyContext } from "@/lib/accounting/company-operations";
import { authorizeOrganization, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AutomationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(); const { id } = await params;
  const context = await loadCompanyContext(user.id, id);
  if (!context?.canAutomation) notFound();
  const [create, retry, accounts] = await Promise.all([
    authorizeOrganization(user.id, id, "automation:jobs:create"), authorizeOrganization(user.id, id, "automation:jobs:retry"),
    db.companyBankAccount.findMany({ where: { organizationId: id, deletedAt: null, isActive: true }, select: { id: true, bankName: true, accountName: true }, orderBy: { bankName: "asc" } }),
  ]);
  return <CompanyShell organizationId={id} companyName={context.company.tradeName || context.company.legalName} userName={user.displayName} delegated={context.delegated} canChart={context.canChart} canOpening={context.canOpening} canAudit={context.canAudit} canManageTeam={context.canManageTeam} canAutomation={context.canAutomation} canBankStatements={context.canBankStatements}>
    <AutomationCenter organizationId={id} accounts={accounts} canCreate={Boolean(create)} canRetry={Boolean(retry)} />
  </CompanyShell>;
}
