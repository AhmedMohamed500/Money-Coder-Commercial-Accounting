import { db } from "@/lib/db";
import { authorizeOrganization } from "@/lib/auth";

export async function loadCompanyContext(userId: string, organizationId: string) {
  const membership = await authorizeOrganization(userId, organizationId, "organization:view");
  if (!membership) return null;
  const company = await db.organization.findFirst({
    where: { id: organizationId, type: "COMMERCIAL_COMPANY", deletedAt: null },
    select: { id: true, legalName: true, tradeName: true, onboardingStatus: true },
  });
  if (!company) return null;
  const [chart, opening, audit, manageTeam, viewTeam, initialize, automation, bankStatements] = await Promise.all([
    authorizeOrganization(userId, organizationId, "accounting:chart:view"),
    authorizeOrganization(userId, organizationId, "accounting:opening:view"),
    authorizeOrganization(userId, organizationId, "accounting:chart:audit:view"),
    authorizeOrganization(userId, organizationId, "members:manage"),
    authorizeOrganization(userId, organizationId, "members:view"),
    authorizeOrganization(userId, organizationId, "accounting:chart:template:initialize"),
    authorizeOrganization(userId, organizationId, "automation:jobs:view"),
    authorizeOrganization(userId, organizationId, "bank-statements:view"),
  ]);
  return {
    company,
    delegated: membership.organizationId !== organizationId,
    canChart: Boolean(chart),
    canOpening: Boolean(opening && chart),
    canAudit: Boolean(audit && chart),
    canManageTeam: Boolean(manageTeam),
    canViewTeam: Boolean(viewTeam),
    canInitializeChart: Boolean(initialize && chart),
    canAutomation: Boolean(automation),
    canBankStatements: Boolean(bankStatements),
  };
}

export async function loadCompanyOperations(userId: string, organizationId: string) {
  const context = await loadCompanyContext(userId, organizationId);
  if (!context) return null;
  const [settings, fiscalYear, bankCount, teamCount, installation, accountCount] = await Promise.all([
    db.companyAccountingSettings.findUnique({ where: { organizationId }, select: { businessActivity: true, inventoryMethod: true, baseCurrency: true } }),
    db.companyFiscalYear.findFirst({ where: { organizationId }, orderBy: { startsAt: "desc" }, select: { name: true, startsAt: true, endsAt: true, isClosed: true } }),
    db.companyBankAccount.count({ where: { organizationId, deletedAt: null } }),
    context.canViewTeam ? db.organizationMembership.count({ where: { organizationId, status: "ACTIVE", deletedAt: null } }) : Promise.resolve(null),
    context.canChart ? db.chartInstallation.findUnique({ where: { organizationId }, select: { activity: true, templateVersion: true, accountCount: true, installedAt: true } }) : Promise.resolve(null),
    context.canChart ? db.chartAccount.count({ where: { organizationId, deletedAt: null } }) : Promise.resolve(null),
  ]);
  return { ...context, settings, fiscalYear, bankCount, teamCount, installation, accountCount };
}
