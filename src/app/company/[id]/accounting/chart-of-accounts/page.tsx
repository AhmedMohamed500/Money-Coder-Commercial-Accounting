import Link from "next/link";
import { notFound } from "next/navigation";
import { ChartWorkspace } from "@/components/accounting/chart-workspace";
import { ChartTeamAccess } from "@/components/accounting/chart-team-access";
import { CompanyShell } from "@/components/accounting/company-shell";
import { loadCompanyContext } from "@/lib/accounting/company-operations";
import { authorizeOrganization, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { validPermissions } from "@/lib/permissions";

export default async function ChartPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const context = await loadCompanyContext(user.id, id);
  if (!context?.canChart) notFound();
  const auditView = (await searchParams).view === "audit";
  if (auditView && !context.canAudit) notFound();
  const permissionNames = [
    "accounting:chart:create", "accounting:chart:edit", "accounting:chart:deactivate", "accounting:chart:delete",
    "accounting:chart:template:initialize", "accounting:chart:audit:view", "accounting:chart:approve",
  ] as const;
  const permissions = await Promise.all(permissionNames.map(permission => authorizeOrganization(user.id, id, permission)));
  const capability = {
    create: Boolean(permissions[0]), edit: Boolean(permissions[1]), deactivate: Boolean(permissions[2]),
    delete: Boolean(permissions[3]), initialize: Boolean(permissions[4]), audit: Boolean(permissions[5]), approve: Boolean(permissions[6]),
  };
  const canManageTeam = context.canManageTeam;
  const members = canManageTeam ? await db.organizationMembership.findMany({ where: { organizationId: id, status: "ACTIVE", deletedAt: null }, include: { user: { select: { displayName: true } } } }) : [];
  return <CompanyShell organizationId={id} companyName={context.company.tradeName || context.company.legalName} userName={user.displayName} delegated={context.delegated} canChart={context.canChart} canOpening={context.canOpening} canAudit={context.canAudit} canManageTeam={context.canManageTeam} canAutomation={context.canAutomation} canBankStatements={context.canBankStatements} activeView={auditView ? "audit" : undefined}>
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div><Link className="text-sm font-bold text-teal-700 underline" href={`/company/${id}`}>العودة إلى لوحة الشركة</Link><h1 className="mt-2 text-3xl font-black text-slate-900">دليل الحسابات</h1><p className="mt-1 text-slate-600">{context.company.tradeName || context.company.legalName}</p></div>
      <span className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-bold text-teal-900">Phase 2A · النشاط التجاري</span>
    </div>
    <ChartWorkspace key={auditView ? "audit" : "chart"} organizationId={id} actorId={user.id} capability={capability} initialPanel={auditView ? "audit" : "details"}/>
    {canManageTeam && <div id="team-access" className="mt-8 scroll-mt-6"><ChartTeamAccess organizationId={id} currentUserId={user.id} members={members.map(member => ({ id: member.id, userId: member.userId, displayName: member.user.displayName, role: member.role, status: member.status, permissions: validPermissions(member.permissions) }))}/></div>}
  </CompanyShell>;
}
