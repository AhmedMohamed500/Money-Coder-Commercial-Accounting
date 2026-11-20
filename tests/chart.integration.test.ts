import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

const cookieState = vi.hoisted(() => {
  const jar = new Map<string, string>();
  return { jar, store: { get(name: string) { const value = jar.get(name); return value ? { name, value } : undefined; }, set(name: string, value: string) { jar.set(name, value); }, delete(name: string) { jar.delete(name); } } };
});
vi.mock("next/headers", () => ({ cookies: async () => cookieState.store }));

import { db } from "@/lib/db";
import { sha256 } from "@/lib/security";
import { authorizeOrganization } from "@/lib/auth";
import { loadCompanyContext, loadCompanyOperations } from "@/lib/accounting/company-operations";
import { initializeCommercialChart } from "@/lib/accounting/chart-service";
import { commercialChartTemplate } from "@/lib/accounting/chart-template";
import { GET as getChart, POST as initializeChart } from "@/app/api/organizations/[id]/chart/route";
import { POST as createAccount } from "@/app/api/organizations/[id]/chart/accounts/route";
import { PATCH as editAccount } from "@/app/api/organizations/[id]/chart/accounts/[accountId]/route";
import { POST as submitChange } from "@/app/api/organizations/[id]/chart/changes/route";
import { PATCH as decideChange } from "@/app/api/organizations/[id]/chart/changes/[changeId]/route";
import { GET as getHistory } from "@/app/api/organizations/[id]/chart/audit/route";
import { PATCH as decideEngagement } from "@/app/api/engagements/[id]/route";
import { POST as assignOfficeStaff } from "@/app/api/engagements/[id]/staff/route";
import { PATCH as updateMembership } from "@/app/api/organizations/[id]/memberships/[membershipId]/route";
import { PATCH as updateOrganization } from "@/app/api/organizations/[id]/route";

const enabled = process.env.RUN_DB_TESTS === "1";
const marker = randomUUID();
const actors: Record<string, { id: string; displayName: string; token: string }> = {};
let companyA = ""; let companyB = ""; let office = "";
let manualId = ""; let manualCode = "";
let ownerMembershipId = "";

function context(id: string) { return { params: Promise.resolve({ id }) }; }
function accountContext(id: string, accountId: string) { return { params: Promise.resolve({ id, accountId }) }; }
function changeContext(id: string, changeId: string) { return { params: Promise.resolve({ id, changeId }) }; }
function request(path: string, method = "GET", body?: unknown) { return new Request(`http://local.test${path}`, { method, headers: body ? { "content-type": "application/json", origin: "http://local.test" } : undefined, body: body ? JSON.stringify(body) : undefined }); }
function as(name: string) { cookieState.jar.set("money_coder_session", actors[name].token); }
async function actor(name: string) {
  const token = randomUUID();
  const user = await db.user.create({ data: { email: `${name}-${marker}@test.local`, displayName: name, passwordHash: "test-only", emailVerifiedAt: new Date() } });
  await db.session.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 86_400_000) } });
  actors[name] = { id: user.id, displayName: name, token };
  return user;
}

describe.skipIf(!enabled)("Phase 2A Chart of Accounts on isolated PostgreSQL", () => {
  beforeAll(async () => {
    await db.$connect();
    const ownerA = await actor("ownerA"); const ownerB = await actor("ownerB"); const viewer = await actor("viewer"); const accountant = await actor("accountant"); const outsider = await actor("outsider"); const staff = await actor("staff"); const manager = await actor("manager");
    const a = await db.organization.create({ data: { type: "COMMERCIAL_COMPANY", legalName: `Chart A ${marker}`, createdById: ownerA.id, memberships: { create: [
      { userId: ownerA.id, role: "COMPANY_OWNER" }, { userId: ownerB.id, role: "COMPANY_OWNER" },
      { userId: viewer.id, role: "VIEWER" }, { userId: manager.id, role: "COMPANY_MANAGER" }, { userId: accountant.id, role: "COMPANY_ACCOUNTANT", permissions: ["accounting:chart:create", "accounting:chart:edit"] },
    ] } } });
    companyA = a.id;
    ownerMembershipId = (await db.organizationMembership.findUniqueOrThrow({ where: { userId_organizationId: { userId: viewer.id, organizationId: companyA } } })).id;
    companyB = (await db.organization.create({ data: { type: "COMMERCIAL_COMPANY", legalName: `Chart B ${marker}`, createdById: outsider.id, memberships: { create: { userId: outsider.id, role: "COMPANY_OWNER" } } } })).id;
    office = (await db.organization.create({ data: { type: "ACCOUNTING_OFFICE", legalName: `Chart Office ${marker}`, createdById: ownerA.id, memberships: { create: [{ userId: staff.id, role: "OFFICE_ACCOUNTANT", permissions: ["accounting:chart:view"] }, { userId: ownerA.id, role: "OFFICE_OWNER" }] } } })).id;
  });
  afterAll(async () => { cookieState.jar.clear(); await db.$disconnect(); });

  it("loads only authorized company operations without initializing accounting data", async () => {
    expect(await loadCompanyOperations(actors.outsider.id, companyA)).toBeNull();
    const owner = await loadCompanyOperations(actors.ownerA.id, companyA);
    expect(owner?.company.legalName).toContain("Chart A");
    expect(owner?.installation).toBeNull();
    expect(owner?.accountCount).toBe(0);
    expect(owner?.bankCount).toBe(0);
    expect(await db.chartInstallation.count({ where: { organizationId: companyA } })).toBe(0);
    const viewer = await loadCompanyOperations(actors.viewer.id, companyA);
    expect(viewer?.canChart).toBe(true);
    expect(viewer?.canInitializeChart).toBe(false);
    expect(viewer?.teamCount).toBeNull();
    expect(await loadCompanyContext(actors.staff.id, companyA)).toBeNull();
  });

  it("keeps an industrial classification intact when commercial initialization is attempted", async () => {
    const industrial = await db.organization.create({ data: { type: "COMMERCIAL_COMPANY", legalName: `Industrial ${marker}`, createdById: actors.outsider.id, memberships: { create: { userId: actors.outsider.id, role: "COMPANY_OWNER" } }, accountingSettings: { create: { businessActivity: "INDUSTRIAL" } } } });
    as("outsider");
    const response = await initializeChart(request(`/api/organizations/${industrial.id}/chart`, "POST", { activity: "COMMERCIAL" }), context(industrial.id));
    expect(response.status).toBe(409);
    expect((await db.companyAccountingSettings.findUniqueOrThrow({ where: { organizationId: industrial.id } })).businessActivity).toBe("INDUSTRIAL");
    expect(await db.chartAccount.count({ where: { organizationId: industrial.id } })).toBe(0);
  });

  it("denies unauthenticated, cross-company, and viewer mutation requests", async () => {
    cookieState.jar.clear();
    expect((await getChart(request(`/api/organizations/${companyA}/chart`), context(companyA))).status).toBe(403);
    as("outsider");
    expect((await getChart(request(`/api/organizations/${companyA}/chart`), context(companyA))).status).toBe(403);
    as("viewer");
    expect((await getChart(request(`/api/organizations/${companyA}/chart`), context(companyA))).status).toBe(200);
    expect((await initializeChart(request(`/api/organizations/${companyA}/chart`, "POST", { activity: "COMMERCIAL" }), context(companyA))).status).toBe(403);
    expect((await createAccount(request(`/api/organizations/${companyA}/chart/accounts`, "POST", { parentId: randomUUID(), nameAr: "حساب غير مصرح", isPostable: true }), context(companyA))).status).toBe(403);
    expect((await editAccount(request(`/api/organizations/${companyA}/chart/accounts/${randomUUID()}`, "PATCH", { nameAr: "حساب", reason: "سبب كاف" }), accountContext(companyA, randomUUID()))).status).toBe(403);
    expect((await submitChange(request(`/api/organizations/${companyA}/chart/changes`, "POST", { action: "DELETE", accountId: randomUUID(), reason: "طلب غير مصرح" }), context(companyA))).status).toBe(403);
  });

  it("rejects incomplete activity templates and initializes commercial chart once under concurrency", async () => {
    as("ownerA");
    expect((await initializeChart(request(`/api/organizations/${companyA}/chart`, "POST", { activity: "INDUSTRIAL" }), context(companyA))).status).toBe(400);
    const results = await Promise.allSettled([initializeCommercialChart(companyA, actors.ownerA), initializeCommercialChart(companyA, actors.ownerA)]);
    expect(results.some(result => result.status === "fulfilled" && result.value.created)).toBe(true);
    expect(await db.chartAccount.count({ where: { organizationId: companyA } })).toBe(commercialChartTemplate.length);
    const repeat = await initializeChart(request(`/api/organizations/${companyA}/chart`, "POST", { activity: "COMMERCIAL" }), context(companyA));
    expect(repeat.status).toBe(200);
    expect((await repeat.json()).created).toBe(false);
    expect(await db.chartAccount.count({ where: { organizationId: companyA } })).toBe(commercialChartTemplate.length);
    expect(await db.chartAccount.count({ where: { organizationId: companyB } })).toBe(0);
    expect((await db.companyAccountingSettings.findUnique({ where: { organizationId: companyA } }))?.businessActivity).toBe("COMMERCIAL");
    const operations = await loadCompanyOperations(actors.ownerA.id, companyA);
    expect(operations?.installation?.templateVersion).toBe("commercial-eg-1.0.0");
    expect(operations?.accountCount).toBe(commercialChartTemplate.length);
  });

  it("checks the account hierarchy and does not put balances on account records", async () => {
    const cash = await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "111001" } }, include: { parent: true } });
    expect(cash.parent?.code).toBe("1110");
    expect(cash.isPostable).toBe(true);
    expect(cash.accountClass).toBe("ASSET");
    expect("balance" in cash).toBe(false);
    expect((await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "510001" } } })).isActive).toBe(false);
    expect((await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "520001" } } })).isActive).toBe(true);
  });

  it("blocks switching inventory policy after template initialization", async () => {
    as("ownerA");
    const response = await updateOrganization(request(`/api/organizations/${companyA}`, "PATCH", { accounting: { baseCurrency: "EGP", fiscalYearStartMonth: 1, fiscalYearStartDay: 1, fiscalYearEndMonth: 12, fiscalYearEndDay: 31, inventoryMethod: "PERPETUAL" } }), context(companyA));
    expect(response.status).toBe(409);
    expect((await db.companyAccountingSettings.findUniqueOrThrow({ where: { organizationId: companyA } })).inventoryMethod).toBe("PERIODIC");
  });

  it("allows an owner to assign chart permissions but prevents role and grantor escalation", async () => {
    const accountant = await db.organizationMembership.findUniqueOrThrow({ where: { userId_organizationId: { userId: actors.accountant.id, organizationId: companyA } } });
    as("manager");
    const elevated = await updateMembership(request(`/api/organizations/${companyA}/memberships/${accountant.id}`, "PATCH", { action: "SET_CHART_PERMISSIONS", permissions: ["accounting:chart:approve"] }), { params: Promise.resolve({ id: companyA, membershipId: accountant.id }) });
    expect(elevated.status).toBe(403);
    as("ownerA");
    const viewer = await updateMembership(request(`/api/organizations/${companyA}/memberships/${ownerMembershipId}`, "PATCH", { action: "SET_CHART_PERMISSIONS", permissions: ["accounting:chart:create"] }), { params: Promise.resolve({ id: companyA, membershipId: ownerMembershipId }) });
    expect(viewer.status).toBe(400);
    const allowed = await updateMembership(request(`/api/organizations/${companyA}/memberships/${accountant.id}`, "PATCH", { action: "SET_CHART_PERMISSIONS", permissions: ["accounting:chart:create", "accounting:chart:edit"] }), { params: Promise.resolve({ id: companyA, membershipId: accountant.id }) });
    expect(allowed.status).toBe(200);
    expect(await db.auditEvent.count({ where: { organizationId: companyA, entityId: accountant.id, action: "MEMBERSHIP_SET_CHART_PERMISSIONS" } })).toBe(1);
  });

  it("allows explicitly permitted accountant creation but blocks duplicate and foreign parent", async () => {
    as("accountant");
    const parent = await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "1110" } } });
    const response = await createAccount(request(`/api/organizations/${companyA}/chart/accounts`, "POST", { parentId: parent.id, nameAr: "حساب بنكي جديد", isPostable: true }), context(companyA));
    expect(response.status).toBe(201);
    const account = await response.json(); manualId = account.id; manualCode = account.code;
    expect(manualCode).toBe("111011");
    expect((await createAccount(request(`/api/organizations/${companyA}/chart/accounts`, "POST", { parentId: parent.id, code: manualCode, nameAr: "مكرر", isPostable: true }), context(companyA))).status).toBe(409);
    as("outsider");
    const foreignParent = await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "1120" } } });
    await initializeCommercialChart(companyB, actors.outsider);
    expect((await createAccount(request(`/api/organizations/${companyB}/chart/accounts`, "POST", { parentId: foreignParent.id, nameAr: "عبر شركة أخرى", isPostable: true }), context(companyB))).status).toBe(400);
    expect(await db.chartAccount.count({ where: { organizationId: companyB, nameAr: "عبر شركة أخرى" } })).toBe(0);
  });

  it("writes edits and audit snapshots atomically with server timestamps", async () => {
    as("accountant");
    const response = await editAccount(request(`/api/organizations/${companyA}/chart/accounts/${manualId}`, "PATCH", { nameAr: "حساب بنكي معتمد", reason: "تصحيح مسمى الحساب" }), accountContext(companyA, manualId));
    expect(response.status).toBe(200);
    const latest = await db.auditEvent.findFirstOrThrow({ where: { organizationId: companyA, entityId: manualId, action: "CHART_ACCOUNT_RENAMED" }, orderBy: { createdAt: "desc" } });
    expect(latest.actorUserId).toBe(actors.accountant.id);
    expect(latest.createdAt).toBeInstanceOf(Date);
    expect(latest.metadata).toMatchObject({ accountCode: manualCode, actorName: "accountant", reason: "تصحيح مسمى الحساب" });
    const audit = await getHistory(request(`/api/organizations/${companyA}/chart/audit?code=${manualCode}`), context(companyA));
    expect(audit.status).toBe(403);
    as("ownerA");
    const allowed = await getHistory(request(`/api/organizations/${companyA}/chart/audit?code=${manualCode}`), context(companyA));
    expect(allowed.status).toBe(200);
    expect((await allowed.json()).length).toBeGreaterThan(0);
    expect((await initializeChart(request(`/api/organizations/${companyA}/chart`, "POST", { activity: "COMMERCIAL" }), context(companyA))).status).toBe(200);
    expect((await db.chartAccount.findUniqueOrThrow({ where: { id: manualId } })).nameAr).toBe("حساب بنكي معتمد");
  });

  it("requires a second approver and applies a deactivation plus audit atomically", async () => {
    as("ownerA");
    const submitted = await submitChange(request(`/api/organizations/${companyA}/chart/changes`, "POST", { action: "DEACTIVATE", accountId: manualId, reason: "الحساب لم يعد مستخدمًا" }), context(companyA));
    expect(submitted.status).toBe(201);
    const change = await submitted.json();
    expect((await db.chartAccount.findUniqueOrThrow({ where: { id: manualId } })).isActive).toBe(true);
    expect((await decideChange(request(`/api/organizations/${companyA}/chart/changes/${change.id}`, "PATCH", { decision: "APPROVE", reason: "تمت المراجعة" }), changeContext(companyA, change.id))).status).toBe(403);
    as("ownerB");
    expect((await decideChange(request(`/api/organizations/${companyA}/chart/changes/${change.id}`, "PATCH", { decision: "APPROVE", reason: "تمت المراجعة" }), changeContext(companyA, change.id))).status).toBe(200);
    expect((await db.chartAccount.findUniqueOrThrow({ where: { id: manualId } })).isActive).toBe(false);
    expect(await db.auditEvent.count({ where: { organizationId: companyA, entityId: manualId, action: "CHART_ACCOUNT_DEACTIVATED" } })).toBe(1);
  });

  it("rejects cross-tenant approval and stale or invalid sensitive changes", async () => {
    as("ownerA");
    const bad = await submitChange(request(`/api/organizations/${companyA}/chart/changes`, "POST", { action: "UPDATE", accountId: manualId, reason: "تغيير تصنيف للتجربة", proposed: { reportGroup: "FINANCE_COST" } }), context(companyA));
    expect(bad.status).toBe(400);
    const valid = await submitChange(request(`/api/organizations/${companyA}/chart/changes`, "POST", { action: "UPDATE", accountId: manualId, reason: "إعادة تفعيل الحساب", proposed: { isActive: true } }), context(companyA));
    expect(valid.status).toBe(201);
    const id = (await valid.json()).id;
    as("outsider");
    expect((await decideChange(request(`/api/organizations/${companyA}/chart/changes/${id}`, "PATCH", { decision: "APPROVE", reason: "غير مصرح" }), changeContext(companyA, id))).status).toBe(403);
    as("ownerB");
    expect((await decideChange(request(`/api/organizations/${companyA}/chart/changes/${id}`, "PATCH", { decision: "REJECT", reason: "لا حاجة لإعادة التفعيل" }), changeContext(companyA, id))).status).toBe(200);
    expect((await db.chartAccount.findUniqueOrThrow({ where: { id: manualId } })).reportGroup).toBe("CURRENT_ASSET");
  });

  it("blocks a hierarchy cycle and soft-deletes only an approved manual leaf", async () => {
    as("ownerA");
    const parent = await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "1170" } } });
    const groupResponse = await createAccount(request(`/api/organizations/${companyA}/chart/accounts`, "POST", { parentId: parent.id, nameAr: "مجموعة فرعية تجريبية", isPostable: false }), context(companyA));
    const group = await groupResponse.json();
    const childResponse = await createAccount(request(`/api/organizations/${companyA}/chart/accounts`, "POST", { parentId: group.id, nameAr: "مجموعة تابعة", isPostable: false }), context(companyA));
    const child = await childResponse.json();
    const cycle = await submitChange(request(`/api/organizations/${companyA}/chart/changes`, "POST", { action: "UPDATE", accountId: group.id, reason: "طلب نقل ضمن الفرع", proposed: { parentId: child.id } }), context(companyA));
    expect(cycle.status).toBe(400);
    const template = await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "111001" } } });
    const denied = await submitChange(request(`/api/organizations/${companyA}/chart/changes`, "POST", { action: "DELETE", accountId: template.id, reason: "محاولة حذف حساب قالب" }), context(companyA));
    expect(denied.status).toBe(409);
    expect(await db.auditEvent.count({ where: { organizationId: companyA, entityId: template.id, action: "CHART_DELETION_DENIED" } })).toBe(1);
    const stale = await submitChange(request(`/api/organizations/${companyA}/chart/changes`, "POST", { action: "DELETE", accountId: manualId, reason: "طلب سابق لتعديل لاحق" }), context(companyA));
    const staleId = (await stale.json()).id;
    as("accountant");
    expect((await editAccount(request(`/api/organizations/${companyA}/chart/accounts/${manualId}`, "PATCH", { nameAr: "حساب بنكي مراجع", reason: "تحديث الاسم قبل الاعتماد" }), accountContext(companyA, manualId))).status).toBe(200);
    as("ownerB");
    expect((await decideChange(request(`/api/organizations/${companyA}/chart/changes/${staleId}`, "PATCH", { decision: "APPROVE", reason: "الطلب لم يعد صالحًا" }), changeContext(companyA, staleId))).status).toBe(409);
    as("ownerA");
    const deletion = await submitChange(request(`/api/organizations/${companyA}/chart/changes`, "POST", { action: "DELETE", accountId: manualId, reason: "حساب تجريبي بلا قيود" }), context(companyA));
    const deletionId = (await deletion.json()).id;
    as("ownerB");
    expect((await decideChange(request(`/api/organizations/${companyA}/chart/changes/${deletionId}`, "PATCH", { decision: "APPROVE", reason: "تم التحقق من عدم الاستخدام" }), changeContext(companyA, deletionId))).status).toBe(200);
    expect((await db.chartAccount.findUniqueOrThrow({ where: { id: manualId } })).deletedAt).toBeInstanceOf(Date);
    expect(await db.auditEvent.count({ where: { organizationId: companyA, action: "CHART_ACCOUNT_SOFT_DELETED", entityId: manualId } })).toBe(1);
  });

  it("removes suspended and revoked office access, applying the role intersection", async () => {
    const membership = await db.organizationMembership.findUniqueOrThrow({ where: { userId_organizationId: { userId: actors.staff.id, organizationId: office } } });
    const engagement = await db.officeCompanyEngagement.create({ data: { officeOrganizationId: office, companyOrganizationId: companyA, requestedById: actors.staff.id } });
    as("manager");
    expect((await decideEngagement(request(`/api/engagements/${engagement.id}`, "PATCH", { action: "ACCEPT", permissions: ["organization:view", "accounting:chart:approve"] }), { params: Promise.resolve({ id: engagement.id }) })).status).toBe(403);
    as("ownerA");
    expect((await decideEngagement(request(`/api/engagements/${engagement.id}`, "PATCH", { action: "ACCEPT", permissions: ["organization:view", "accounting:chart:view"] }), { params: Promise.resolve({ id: engagement.id }) })).status).toBe(200);
    expect((await assignOfficeStaff(request(`/api/engagements/${engagement.id}/staff`, "POST", { membershipId: membership.id, permissions: ["organization:view", "accounting:chart:view"] }), { params: Promise.resolve({ id: engagement.id }) })).status).toBe(201);
    as("staff");
    expect(await authorizeOrganization(actors.staff.id, companyA, "accounting:chart:view")).not.toBeNull();
    expect(await authorizeOrganization(actors.staff.id, companyA, "accounting:chart:create")).toBeNull();
    expect((await loadCompanyOperations(actors.staff.id, companyA))?.delegated).toBe(true);
    expect((await getChart(request(`/api/organizations/${companyA}/chart`), context(companyA))).status).toBe(200);
    await db.organizationMembership.update({ where: { id: membership.id }, data: { status: "SUSPENDED" } });
    expect((await getChart(request(`/api/organizations/${companyA}/chart`), context(companyA))).status).toBe(403);
    expect(await loadCompanyOperations(actors.staff.id, companyA)).toBeNull();
    await db.organizationMembership.update({ where: { id: membership.id }, data: { status: "ACTIVE" } });
    as("ownerA");
    expect((await decideEngagement(request(`/api/engagements/${engagement.id}`, "PATCH", { action: "REVOKE" }), { params: Promise.resolve({ id: engagement.id }) })).status).toBe(200);
    as("staff");
    expect((await getChart(request(`/api/organizations/${companyA}/chart`), context(companyA))).status).toBe(403);
    expect(await loadCompanyOperations(actors.staff.id, companyA)).toBeNull();
    as("viewer");
    await db.organizationMembership.update({ where: { id: ownerMembershipId }, data: { status: "SUSPENDED" } });
    expect((await getChart(request(`/api/organizations/${companyA}/chart`), context(companyA))).status).toBe(403);
  });
});
