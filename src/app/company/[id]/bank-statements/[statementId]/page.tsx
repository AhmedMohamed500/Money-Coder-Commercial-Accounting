import { notFound } from "next/navigation";
import { CompanyShell } from "@/components/accounting/company-shell";
import { BankReviewCenter } from "@/components/accounting/bank-review-center";
import { loadCompanyContext } from "@/lib/accounting/company-operations";
import { authorizeOrganization, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function BankStatementPage({ params }: { params: Promise<{ id: string; statementId: string }> }) {
  const user = await requireUser(); const { id, statementId } = await params;
  const context = await loadCompanyContext(user.id, id);
  if (!context?.canBankStatements || !await db.bankStatement.findFirst({ where: { id: statementId, organizationId: id }, select: { id: true } })) notFound();
  const [review, correct, exportAccess, audit] = await Promise.all([
    authorizeOrganization(user.id, id, "bank-statements:review"), authorizeOrganization(user.id, id, "bank-statements:correct"),
    authorizeOrganization(user.id, id, "bank-statements:export"), authorizeOrganization(user.id, id, "bank-statements:audit:view"),
  ]);
  return <CompanyShell organizationId={id} companyName={context.company.tradeName || context.company.legalName} userName={user.displayName} delegated={context.delegated} canChart={context.canChart} canOpening={context.canOpening} canAudit={context.canAudit} canManageTeam={context.canManageTeam} canAutomation={context.canAutomation} canBankStatements={context.canBankStatements}>
    <BankReviewCenter organizationId={id} statementId={statementId} canReview={Boolean(review)} canCorrect={Boolean(correct)} canExport={Boolean(exportAccess)} canAudit={Boolean(audit)} />
  </CompanyShell>;
}
