import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";

const cookieState = vi.hoisted(() => { const jar = new Map<string, string>(); return { jar, store: { get(name: string) { const value = jar.get(name); return value ? { name, value } : undefined; }, set(name: string, value: string) { jar.set(name, value); }, delete(name: string) { jar.delete(name); } } }; });
vi.mock("next/headers", () => ({ cookies: async () => cookieState.store }));

import { db } from "@/lib/db";
import { sha256 } from "@/lib/security";
import { initializeCommercialChart } from "@/lib/accounting/chart-service";
import { GET as getOverview, POST as createBatch } from "@/app/api/organizations/[id]/opening-balances/route";
import { GET as getBatch, PATCH as actBatch } from "@/app/api/organizations/[id]/opening-balances/[batchId]/route";
import { PUT as putLine } from "@/app/api/organizations/[id]/opening-balances/[batchId]/lines/route";
import { POST as stageImport } from "@/app/api/organizations/[id]/opening-balances/[batchId]/imports/route";
import { POST as applyImport } from "@/app/api/organizations/[id]/opening-balances/[batchId]/imports/[stageId]/route";
import { GET as getAudit } from "@/app/api/organizations/[id]/opening-balances/[batchId]/audit/route";

const marker = randomUUID();
const actors: Record<string, { id: string; displayName: string; token: string }> = {};
let companyA = ""; let companyB = ""; let yearA = ""; let batchId = ""; let revision = 1; let cashId = ""; let capitalId = ""; let otherCashId = "";
function as(name: string) { cookieState.jar.set("money_coder_session", actors[name].token); }
function req(path: string, method = "GET", body?: unknown) { return new Request(`http://local.test${path}`, { method, headers: body ? { "content-type": "application/json", origin: "http://local.test" } : undefined, body: body ? JSON.stringify(body) : undefined }); }
function ctx(id: string) { return { params: Promise.resolve({ id }) }; }
function batchCtx(id: string, batch: string) { return { params: Promise.resolve({ id, batchId: batch }) }; }
async function actor(name: string) {
  const token = randomUUID();
  const user = await db.user.create({ data: { email: `${name}-${marker}@test.local`, displayName: name, passwordHash: "test-only", emailVerifiedAt: new Date() } });
  await db.session.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 86_400_000) } });
  actors[name] = { id: user.id, displayName: name, token };
  return user;
}
async function makeFile(code: string, debit: string, credit: string) {
  const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet("Opening");
  sheet.addRow(["Account Code", "Opening Debit", "Opening Credit"]); sheet.addRow([code, debit, credit]);
  return new File([new Uint8Array(await book.xlsx.writeBuffer())], "opening.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

describe.skipIf(process.env.RUN_DB_TESTS !== "1")("Phase 2B opening balances on disposable PostgreSQL", () => {
  beforeAll(async () => {
    await db.$connect();
    const owner = await actor("opening-owner"); const accountant = await actor("opening-accountant"); const manager = await actor("opening-manager"); const viewer = await actor("opening-viewer"); const outsider = await actor("opening-outsider");
    const a = await db.organization.create({ data: { type: "COMMERCIAL_COMPANY", legalName: `Opening A ${marker}`, createdById: owner.id, memberships: { create: [
      { userId: owner.id, role: "COMPANY_OWNER" }, { userId: accountant.id, role: "COMPANY_ACCOUNTANT" }, { userId: manager.id, role: "COMPANY_MANAGER" }, { userId: viewer.id, role: "VIEWER" },
    ] }, accountingSettings: { create: { baseCurrency: "EGP" } }, fiscalYears: { create: { name: "FY Nov 2026", startsAt: new Date("2026-11-01"), endsAt: new Date("2027-10-31") } } } });
    companyA = a.id;
    companyB = (await db.organization.create({ data: { type: "COMMERCIAL_COMPANY", legalName: `Opening B ${marker}`, createdById: outsider.id, memberships: { create: { userId: outsider.id, role: "COMPANY_OWNER" } }, accountingSettings: { create: { baseCurrency: "EGP" } } } })).id;
    yearA = (await db.companyFiscalYear.findFirstOrThrow({ where: { organizationId: companyA } })).id;
    await initializeCommercialChart(companyA, actors["opening-owner"]);
    await initializeCommercialChart(companyB, actors["opening-outsider"]);
    cashId = (await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "111001" } } })).id;
    otherCashId = (await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyB, code: "111001" } } })).id;
    capitalId = (await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "320001" } } })).id;
  });
  afterAll(async () => { cookieState.jar.clear(); await db.$disconnect(); });

  it("enforces company and role isolation before any financial mutation", async () => {
    as("opening-outsider");
    expect((await getOverview(req(`/api/organizations/${companyA}/opening-balances`), ctx(companyA))).status).toBe(403);
    expect((await createBatch(req(`/api/organizations/${companyA}/opening-balances`, "POST", { fiscalYearId: yearA }), ctx(companyA))).status).toBe(403);
    as("opening-viewer");
    expect((await getOverview(req(`/api/organizations/${companyA}/opening-balances`), ctx(companyA))).status).toBe(200);
    expect((await createBatch(req(`/api/organizations/${companyA}/opening-balances`, "POST", { fiscalYearId: yearA }), ctx(companyA))).status).toBe(403);
  });

  it("creates a fiscal-year draft and rejects invalid account, side and unbalanced submission", async () => {
    as("opening-accountant");
    const created = await createBatch(req(`/api/organizations/${companyA}/opening-balances`, "POST", { fiscalYearId: yearA }), ctx(companyA));
    expect(created.status).toBe(201);
    const data = await created.json(); batchId = data.batch.id; revision = data.batch.revision;
    const reopened = await createBatch(req(`/api/organizations/${companyA}/opening-balances`, "POST", { fiscalYearId: yearA }), ctx(companyA));
    expect(reopened.status).toBe(200); expect((await reopened.json()).batch.id).toBe(batchId);
    const group = await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "1110" } } });
    const foreignOrigin = new Request(`http://local.test/api/organizations/${companyA}/opening-balances/${batchId}/lines`, { method: "PUT", headers: { "content-type": "application/json", origin: "http://foreign.test" }, body: JSON.stringify({ revision, accountId: cashId, debit: "1", credit: "0" }) });
    expect((await putLine(foreignOrigin, batchCtx(companyA, batchId))).status).toBe(403);
    for (const accountId of [group.id, otherCashId]) {
      const response = await putLine(req(`/api/organizations/${companyA}/opening-balances/${batchId}/lines`, "PUT", { revision, accountId, debit: "10", credit: "0" }), batchCtx(companyA, batchId));
      expect(response.status).toBe(400);
    }
    expect((await putLine(req(`/api/organizations/${companyA}/opening-balances/${batchId}/lines`, "PUT", { revision, accountId: cashId, debit: "10", credit: "10" }), batchCtx(companyA, batchId))).status).toBe(400);
    const saved = await putLine(req(`/api/organizations/${companyA}/opening-balances/${batchId}/lines`, "PUT", { revision, accountId: cashId, debit: "100.25", credit: "0", explanation: "رصيد الصندوق", sourceReference: "statement-1" }), batchCtx(companyA, batchId));
    expect(saved.status).toBe(200); revision = (await saved.json()).revision;
    expect((await actBatch(req(`/api/organizations/${companyA}/opening-balances/${batchId}`, "PATCH", { action: "SUBMIT", revision }), batchCtx(companyA, batchId))).status).toBe(409);
    expect((await db.openingBalanceBatch.findUniqueOrThrow({ where: { id: batchId } })).status).toBe("DRAFT");
    as("opening-outsider");
    expect((await getBatch(req(`/api/organizations/${companyA}/opening-balances/${batchId}`), batchCtx(companyA, batchId))).status).toBe(403);
    expect((await putLine(req(`/api/organizations/${companyA}/opening-balances/${batchId}/lines`, "PUT", { revision, accountId: cashId, debit: "1", credit: "0" }), batchCtx(companyA, batchId))).status).toBe(403);
    const foreignForm = new FormData(); foreignForm.set("file", await makeFile("111001", "1", "0")); foreignForm.set("revision", String(revision));
    expect((await stageImport(new Request(`http://local.test/api/organizations/${companyA}/opening-balances/${batchId}/imports`, { method: "POST", headers: { origin: "http://local.test" }, body: foreignForm }), batchCtx(companyA, batchId))).status).toBe(403);
  });

  it("stages private XLSX, maps unknown codes, blocks duplicate uploads, and confirms import", async () => {
    as("opening-accountant");
    const file = await makeFile("unmapped-code", "0", "100.25");
    const form = new FormData(); form.set("file", file); form.set("revision", String(revision));
    const path = `/api/organizations/${companyA}/opening-balances/${batchId}/imports`;
    const response = await stageImport(new Request(`http://local.test${path}`, { method: "POST", headers: { origin: "http://local.test" }, body: form }), batchCtx(companyA, batchId));
    expect(response.status).toBe(201);
    const staged = await response.json(); expect(staged.preview.issues.map((issue: { code: string }) => issue.code)).toContain("UNKNOWN_ACCOUNT");
    const duplicateForm = new FormData(); duplicateForm.set("file", file); duplicateForm.set("revision", String(revision));
    expect((await stageImport(new Request(`http://local.test${path}`, { method: "POST", headers: { origin: "http://local.test" }, body: duplicateForm }), batchCtx(companyA, batchId))).status).toBe(409);
    const stageCtx = { params: Promise.resolve({ id: companyA, batchId, stageId: staged.stageId }) };
    const bad = await applyImport(req(`${path}/${staged.stageId}`, "POST", { action: "APPLY", revision, accountMapping: {}, overwriteExisting: false }), stageCtx);
    expect(bad.status).toBe(409);
    const applied = await applyImport(req(`${path}/${staged.stageId}`, "POST", { action: "APPLY", revision, accountMapping: { "2": capitalId }, overwriteExisting: false }), stageCtx);
    expect(applied.status).toBe(200); revision = (await applied.json()).revision;
    expect((await applyImport(req(`${path}/${staged.stageId}`, "POST", { action: "APPLY", revision, accountMapping: { "2": capitalId }, overwriteExisting: false }), stageCtx)).status).toBe(409);
    expect(await db.openingBalanceLine.count({ where: { organizationId: companyA, batchId } })).toBe(2);
    expect(await db.openingImportStage.count({ where: { batchId, status: "APPLIED" } })).toBe(1);
  });

  it("requires independent review, approves an exact balance, locks it and records audit", async () => {
    as("opening-accountant");
    const submitted = await actBatch(req(`/api/organizations/${companyA}/opening-balances/${batchId}`, "PATCH", { action: "SUBMIT", revision }), batchCtx(companyA, batchId));
    expect(submitted.status).toBe(200); revision = (await submitted.json()).batch.revision;
    expect((await actBatch(req(`/api/organizations/${companyA}/opening-balances/${batchId}`, "PATCH", { action: "SUBMIT", revision }), batchCtx(companyA, batchId))).status).toBe(409);
    expect((await putLine(req(`/api/organizations/${companyA}/opening-balances/${batchId}/lines`, "PUT", { revision, accountId: cashId, debit: "2", credit: "0" }), batchCtx(companyA, batchId))).status).toBe(409);
    await db.organizationMembership.update({ where: { userId_organizationId: { userId: actors["opening-accountant"].id, organizationId: companyA } }, data: { permissions: ["accounting:opening:review", "accounting:opening:approve"] } });
    expect((await actBatch(req(`/api/organizations/${companyA}/opening-balances/${batchId}`, "PATCH", { action: "REVIEW", revision }), batchCtx(companyA, batchId))).status).toBe(403);
    as("opening-owner");
    expect((await actBatch(req(`/api/organizations/${companyA}/opening-balances/${batchId}`, "PATCH", { action: "APPROVE", revision }), batchCtx(companyA, batchId))).status).toBe(409);
    as("opening-manager");
    const reviewed = await actBatch(req(`/api/organizations/${companyA}/opening-balances/${batchId}`, "PATCH", { action: "REVIEW", revision }), batchCtx(companyA, batchId));
    expect(reviewed.status).toBe(200); revision = (await reviewed.json()).batch.revision;
    as("opening-owner");
    const approved = await actBatch(req(`/api/organizations/${companyA}/opening-balances/${batchId}`, "PATCH", { action: "APPROVE", revision }), batchCtx(companyA, batchId));
    expect(approved.status).toBe(200); revision = (await approved.json()).batch.revision;
    const snapshot = await db.openingBalanceBatch.findUniqueOrThrow({ where: { id: batchId } });
    expect(snapshot.status).toBe("APPROVED"); expect(snapshot.approvedById).toBe(actors["opening-owner"].id);
    expect((await putLine(req(`/api/organizations/${companyA}/opening-balances/${batchId}/lines`, "PUT", { revision, accountId: cashId, debit: "9", credit: "0" }), batchCtx(companyA, batchId))).status).toBe(409);
    expect((await db.openingBalanceLine.findUniqueOrThrow({ where: { batchId_accountId: { batchId, accountId: cashId } } })).debit.toString()).toBe("100.25");
    const extraAccount = await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "111002" } } });
    await expect(db.openingBalanceLine.create({ data: { organizationId: companyA, batchId, accountId: extraAccount.id, accountCode: extraAccount.code, accountNameAr: extraAccount.nameAr, accountClass: extraAccount.accountClass, normalBalance: extraAccount.normalBalance, debit: "1", credit: "0" } })).rejects.toThrow();
    await expect(db.openingBalanceLine.update({ where: { batchId_accountId: { batchId, accountId: cashId } }, data: { debit: "9" } })).rejects.toThrow();
    const audit = await getAudit(req(`/api/organizations/${companyA}/opening-balances/${batchId}/audit`), batchCtx(companyA, batchId));
    expect(audit.status).toBe(200);
    expect((await audit.json()).map((item: { action: string }) => item.action)).toEqual(expect.arrayContaining(["OPENING_DRAFT_CREATED", "OPENING_LINE_ADDED", "OPENING_EXCEL_IMPORTED", "OPENING_SUBMITTED", "OPENING_REVIEWED", "OPENING_APPROVED_SNAPSHOT_LOCKED"]));
    expect(await db.openingBalanceBatch.count({ where: { organizationId: companyB } })).toBe(0);
  });

  it("creates a reviewed correction while preserving the historical approved snapshot", async () => {
    as("opening-accountant");
    const response = await createBatch(req(`/api/organizations/${companyA}/opening-balances`, "POST", { fiscalYearId: yearA, correctionOfId: batchId, correctionReason: "تصحيح موثق لبيانات أول المدة" }), ctx(companyA));
    expect(response.status).toBe(201);
    const correction = (await response.json()).batch;
    expect(correction.correctionOfId).toBe(batchId);
    expect(await db.openingBalanceLine.count({ where: { batchId: correction.id } })).toBe(2);
    expect((await db.openingBalanceBatch.findUniqueOrThrow({ where: { id: batchId } })).status).toBe("APPROVED");
    const path = `/api/organizations/${companyA}/opening-balances/${correction.id}`;
    const correctionSubmit = await actBatch(req(path, "PATCH", { action: "SUBMIT", revision: correction.revision }), batchCtx(companyA, correction.id));
    expect(correctionSubmit.status).toBe(200);
    as("opening-manager");
    const reviewed = await actBatch(req(path, "PATCH", { action: "REVIEW", revision: (await correctionSubmit.json()).batch.revision }), batchCtx(companyA, correction.id));
    expect(reviewed.status).toBe(200);
    as("opening-owner");
    const approved = await actBatch(req(path, "PATCH", { action: "APPROVE", revision: (await reviewed.json()).batch.revision }), batchCtx(companyA, correction.id));
    expect(approved.status).toBe(200);
    expect((await db.openingBalanceBatch.findUniqueOrThrow({ where: { id: batchId } })).status).toBe("SUPERSEDED");
    expect((await db.openingBalanceBatch.findUniqueOrThrow({ where: { id: correction.id } })).status).toBe("APPROVED");
    expect(await db.openingBalanceBatch.count({ where: { organizationId: companyA, fiscalYearId: yearA, status: "APPROVED" } })).toBe(1);
  });

  it("limits accounting-office access to active engagement, assignment and role permissions", async () => {
    const staff = await actor("opening-office-staff");
    const office = await db.organization.create({ data: { type: "ACCOUNTING_OFFICE", legalName: `Opening office ${marker}`, createdById: staff.id, memberships: { create: { userId: staff.id, role: "OFFICE_ACCOUNTANT" } } } });
    const member = await db.organizationMembership.findUniqueOrThrow({ where: { userId_organizationId: { userId: staff.id, organizationId: office.id } } });
    const engagement = await db.officeCompanyEngagement.create({ data: { officeOrganizationId: office.id, companyOrganizationId: companyA, requestedById: staff.id, status: "ACTIVE", acceptedAt: new Date(), permissions: ["organization:view", "accounting:chart:view", "accounting:opening:view"] } });
    await db.engagementStaff.create({ data: { engagementId: engagement.id, membershipId: member.id, userId: staff.id, permissions: ["organization:view", "accounting:chart:view", "accounting:opening:view"] } });
    as("opening-office-staff");
    expect((await getOverview(req(`/api/organizations/${companyA}/opening-balances`), ctx(companyA))).status).toBe(200);
    expect((await createBatch(req(`/api/organizations/${companyA}/opening-balances`, "POST", { fiscalYearId: yearA }), ctx(companyA))).status).toBe(403);
    await db.officeCompanyEngagement.update({ where: { id: engagement.id }, data: { status: "REVOKED", revokedAt: new Date() } });
    expect((await getOverview(req(`/api/organizations/${companyA}/opening-balances`), ctx(companyA))).status).toBe(403);
  });
});
