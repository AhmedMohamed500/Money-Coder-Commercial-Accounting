import { notFound } from "next/navigation";
import { CompanyShell } from "@/components/accounting/company-shell";
import { OpeningWorkspace } from "@/components/accounting/opening-workspace";
import { OpeningTeamAccess } from "@/components/accounting/opening-team-access";
import { loadCompanyContext } from "@/lib/accounting/company-operations";
import { authorizeOrganization, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { validPermissions } from "@/lib/permissions";

export default async function OpeningBalancesPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const context = await loadCompanyContext(user.id, id);
  if (!context?.canOpening) notFound();
  const names = ["create", "edit", "import", "submit", "review", "approve", "audit:view"] as const;
  const permissions = await Promise.all(names.map(name => authorizeOrganization(user.id, id, `accounting:opening:${name}`)));
  const capability = Object.fromEntries(names.map((name, index) => [name === "audit:view" ? "audit" : name, Boolean(permissions[index])])) as Record<"create" | "edit" | "import" | "submit" | "review" | "approve" | "audit", boolean>;
  const members = context.canManageTeam ? await db.organizationMembership.findMany({ where: { organizationId: id, status: "ACTIVE", deletedAt: null }, include: { user: { select: { displayName: true } } } }) : [];
  return <CompanyShell organizationId={id} companyName={context.company.tradeName || context.company.legalName} userName={user.displayName} delegated={context.delegated} canChart={context.canChart} canOpening={context.canOpening} canAudit={context.canAudit} canManageTeam={context.canManageTeam} canAutomation={context.canAutomation} canBankStatements={context.canBankStatements}>
    <OpeningWorkspace organizationId={id} capability={capability} canManageTeam={context.canManageTeam} />
    {context.canManageTeam && <OpeningTeamAccess organizationId={id} currentUserId={user.id} members={members.map(member => ({ id: member.id, userId: member.userId, displayName: member.user.displayName, role: member.role, permissions: validPermissions(member.permissions) }))} />}
  </CompanyShell>;
}
