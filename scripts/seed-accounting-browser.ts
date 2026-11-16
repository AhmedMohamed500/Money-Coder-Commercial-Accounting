import { writeFile } from "node:fs/promises";
import { db } from "../src/lib/db";
import { initializeCommercialChart } from "../src/lib/accounting/chart-service";
import { hashPassword, verifyPassword } from "../src/lib/security";

async function main() {
const output = process.env.BROWSER_FIXTURE_PATH;
if (!output) throw new Error("BROWSER_FIXTURE_PATH is required");
const password = "Browser-Test-2026!";
const passwordHash = await hashPassword(password);
if (!(await verifyPassword(password, passwordHash))) throw new Error("Browser fixture password hash failed verification");
const marker = crypto.randomUUID().slice(0, 8);

async function user(role: string) {
  const slug = role.toLowerCase().replaceAll(" ", "-");
  return db.user.create({ data: { email: `${slug}-${marker}@browser.test`, displayName: role, passwordHash, emailVerifiedAt: new Date() } });
}

try {
  const owner = await user("Owner");
  const accountant = await user("Accountant");
  const manager = await user("Manager");
  const viewer = await user("Viewer");
  const officeStaff = await user("Office Accountant");
  const outsider = await user("Outsider");
  const company = await db.organization.create({ data: {
    type: "COMMERCIAL_COMPANY", legalName: `شركة اختبار المتصفح ${marker}`, createdById: owner.id,
    memberships: { create: [
      { userId: owner.id, role: "COMPANY_OWNER" },
      { userId: accountant.id, role: "COMPANY_ACCOUNTANT" },
      { userId: manager.id, role: "COMPANY_MANAGER" },
      { userId: viewer.id, role: "VIEWER" },
    ] },
    accountingSettings: { create: { baseCurrency: "EGP" } },
    fiscalYears: { create: { name: "FY Browser 2026/27", startsAt: new Date("2026-11-01T00:00:00.000Z"), endsAt: new Date("2027-10-31T00:00:00.000Z") } },
  } });
  const otherCompany = await db.organization.create({ data: {
    type: "COMMERCIAL_COMPANY", legalName: `شركة معزولة ${marker}`, createdById: outsider.id,
    memberships: { create: { userId: outsider.id, role: "COMPANY_OWNER" } },
    accountingSettings: { create: { baseCurrency: "EGP" } },
  } });
  const office = await db.organization.create({ data: {
    type: "ACCOUNTING_OFFICE", legalName: `مكتب اختبار ${marker}`, createdById: officeStaff.id,
    memberships: { create: { userId: officeStaff.id, role: "OFFICE_ACCOUNTANT" } },
  } });
  const officeMembership = await db.organizationMembership.findUniqueOrThrow({ where: { userId_organizationId: { userId: officeStaff.id, organizationId: office.id } } });
  const delegatedPermissions = ["organization:view", "accounting:journal:view", "accounting:ledger:view", "accounting:trial-balance:view"];
  const engagement = await db.officeCompanyEngagement.create({ data: { officeOrganizationId: office.id, companyOrganizationId: company.id, requestedById: owner.id, status: "ACTIVE", acceptedAt: new Date(), permissions: delegatedPermissions } });
  await db.engagementStaff.create({ data: { engagementId: engagement.id, membershipId: officeMembership.id, userId: officeStaff.id, permissions: delegatedPermissions } });
  await initializeCommercialChart(company.id, { id: owner.id, displayName: owner.displayName });
  const fiscalYear = await db.companyFiscalYear.findFirstOrThrow({ where: { organizationId: company.id } });
  const cash = await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: company.id, code: "111001" } } });
  const capital = await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: company.id, code: "320001" } } });
  await writeFile(output, JSON.stringify({ password, companyId: company.id, otherCompanyId: otherCompany.id, fiscalYearId: fiscalYear.id, cashId: cash.id, capitalId: capital.id, users: { owner: owner.email, accountant: accountant.email, manager: manager.email, viewer: viewer.email, officeStaff: officeStaff.email, outsider: outsider.email } }), "utf8");
} finally {
  await db.$disconnect();
}
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
