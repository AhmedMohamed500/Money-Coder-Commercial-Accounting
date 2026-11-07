import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";

const cookieState = vi.hoisted(() => { const jar = new Map<string, string>(); return { jar, store: { get(name: string) { const value = jar.get(name); return value ? { name, value } : undefined; }, set(name: string, value: string) { jar.set(name, value); }, delete(name: string) { jar.delete(name); } } }; });
vi.mock("next/headers", () => ({ cookies: async () => cookieState.store }));

import { db } from "@/lib/db";
import { sha256 } from "@/lib/security";
import { signBankCallback } from "@/integrations/n8n/client";
import { horizonFixture } from "@/lib/accounting/bank-fixture";
import { reviewBankTransaction } from "@/lib/accounting/bank-automation-service";
import { GET as getJobs, POST as createJob } from "@/app/api/organizations/[id]/automation/jobs/route";
import { GET as getStatement, PATCH as reviewStatement } from "@/app/api/organizations/[id]/bank-statements/[statementId]/route";
import { PATCH as reviewTransaction } from "@/app/api/organizations/[id]/bank-statements/[statementId]/transactions/[transactionId]/route";
import { GET as exportStatement } from "@/app/api/organizations/[id]/bank-statements/[statementId]/export/route";
import { POST as callback } from "@/app/api/internal/automation/results/route";
import { POST as retryJob } from "@/app/api/organizations/[id]/automation/jobs/[jobId]/retry/route";

const marker = randomUUID();
const users: Record<string, { id: string; token: string; displayName: string }> = {};
let companyA = ""; let companyB = ""; let bankA = ""; let statementId = ""; let jobId = ""; let officeEngagementId = "";
function as(name: string) { cookieState.jar.set("money_coder_session", users[name].token); }
function json(path: string, body: unknown, method = "POST") { return new Request(`http://local.test${path}`, { method, headers: { origin: "http://local.test", "content-type": "application/json" }, body: JSON.stringify(body) }); }
function orgCtx(id: string) { return { params: Promise.resolve({ id }) }; }
function statementCtx(id: string, statement: string) { return { params: Promise.resolve({ id, statementId: statement }) }; }
async function user(name: string) {
  const token = randomUUID();
  const created = await db.user.create({ data: { email: `automation-${name}-${marker}@test.local`, displayName: name, passwordHash: "test-only", emailVerifiedAt: new Date() } });
  await db.session.create({ data: { userId: created.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 86_400_000) } });
  users[name] = { id: created.id, token, displayName: name };
}

describe.skipIf(process.env.RUN_DB_TESTS !== "1")("Phase 2C automation on disposable PostgreSQL", () => {
  beforeAll(async () => {
    await db.$connect();
    for (const name of ["owner", "accountant", "viewer", "outsider", "office"]) await user(name);
    const a = await db.organization.create({ data: { type: "COMMERCIAL_COMPANY", legalName: `Automation A ${marker}`, createdById: users.owner.id, memberships: { create: [
      { userId: users.owner.id, role: "COMPANY_OWNER" }, { userId: users.accountant.id, role: "COMPANY_ACCOUNTANT" }, { userId: users.viewer.id, role: "VIEWER" },
    ] } } });
    companyA = a.id;
    companyB = (await db.organization.create({ data: { type: "COMMERCIAL_COMPANY", legalName: `Automation B ${marker}`, createdById: users.outsider.id, memberships: { create: { userId: users.outsider.id, role: "COMPANY_OWNER" } } } })).id;
    bankA = (await db.companyBankAccount.create({ data: { organizationId: companyA, bankName: "Demo Bank", accountName: "Demo Account", accountNumber: `DEMO-${marker}`, currency: "EGP" } })).id;
    const office = await db.organization.create({ data: { type: "ACCOUNTING_OFFICE", legalName: `Automation Office ${marker}`, createdById: users.office.id, memberships: { create: { userId: users.office.id, role: "OFFICE_OWNER" } } } });
    const officeMembership = await db.organizationMembership.findUniqueOrThrow({ where: { userId_organizationId: { userId: users.office.id, organizationId: office.id } } });
    const engagement = await db.officeCompanyEngagement.create({ data: { officeOrganizationId: office.id, companyOrganizationId: companyA, requestedById: users.owner.id, status: "ACTIVE", permissions: ["automation:jobs:view", "bank-statements:view"], acceptedAt: new Date() } });
    officeEngagementId = engagement.id;
    await db.engagementStaff.create({ data: { engagementId: engagement.id, membershipId: officeMembership.id, userId: users.office.id, permissions: ["automation:jobs:view", "bank-statements:view"] } });
  });
  afterAll(async () => { cookieState.jar.clear(); await db.$disconnect(); });

  it("does not create jobs on reads and blocks other companies and viewers", async () => {
    as("owner");
    const before = await db.automationJob.count({ where: { organizationId: companyA } });
    expect((await getJobs(new Request(`http://local.test/api/organizations/${companyA}/automation/jobs`), orgCtx(companyA))).status).toBe(200);
    expect(await db.automationJob.count({ where: { organizationId: companyA } })).toBe(before);
    as("outsider");
    expect((await getJobs(new Request(`http://local.test/api/organizations/${companyA}/automation/jobs`), orgCtx(companyA))).status).toBe(403);
    as("viewer");
    expect((await createJob(json(`/api/organizations/${companyA}/automation/jobs`, { bankAccountId: bankA, idempotencyKey: randomUUID() }), orgCtx(companyA))).status).toBe(403);
  });

  it("creates one deterministic mock job and isolates statement reads", async () => {
    as("accountant");
    const path = `/api/organizations/${companyA}/automation/jobs`;
    const input = { bankAccountId: bankA, idempotencyKey: randomUUID() };
    const created = await createJob(json(path, input), orgCtx(companyA));
    expect(created.status).toBe(201); jobId = (await created.json()).jobId;
    const duplicate = await createJob(json(path, input), orgCtx(companyA));
    expect(duplicate.status).toBe(200); expect((await duplicate.json()).jobId).toBe(jobId);
    const job = await db.automationJob.findUniqueOrThrow({ where: { id: jobId }, include: { statement: { include: { transactions: true } } } });
    expect(job.status).toBe("NEEDS_REVIEW"); expect(job.statement?.transactions).toHaveLength(15);
    expect(job.statement?.closingBalance.toString()).toBe("66190");
    expect(job.statement?.mathStatus).toBe("MATCHED"); statementId = job.statement!.id;
    as("outsider");
    expect((await getStatement(new Request(`http://local.test/api/organizations/${companyA}/bank-statements/${statementId}`), statementCtx(companyA, statementId))).status).toBe(403);
    as("owner");
    expect((await getStatement(new Request(`http://local.test/api/organizations/${companyB}/bank-statements/${statementId}`), statementCtx(companyB, statementId))).status).toBe(403);
  });

  it("honors office assignment and revocation for company data", async () => {
    as("office");
    expect((await getJobs(new Request(`http://local.test/api/organizations/${companyA}/automation/jobs`), orgCtx(companyA))).status).toBe(200);
    expect((await getStatement(new Request(`http://local.test/api/organizations/${companyA}/bank-statements/${statementId}`), statementCtx(companyA, statementId))).status).toBe(200);
    await db.officeCompanyEngagement.update({ where: { id: officeEngagementId }, data: { status: "REVOKED", revokedAt: new Date() } });
    expect((await getJobs(new Request(`http://local.test/api/organizations/${companyA}/automation/jobs`), orgCtx(companyA))).status).toBe(403);
    expect((await getStatement(new Request(`http://local.test/api/organizations/${companyA}/bank-statements/${statementId}`), statementCtx(companyA, statementId))).status).toBe(403);
  });

  it("rejects unauthorized review, records corrections and refuses premature statement approval", async () => {
    const row = await db.bankStatementTransaction.findFirstOrThrow({ where: { statementId }, orderBy: { sequence: "asc" } });
    const rowPath = `/api/organizations/${companyA}/bank-statements/${statementId}/transactions/${row.id}`;
    const ctx = { params: Promise.resolve({ id: companyA, statementId, transactionId: row.id }) };
    as("viewer");
    expect((await reviewTransaction(json(rowPath, { action: "REVIEW", revision: row.revision }, "PATCH"), ctx)).status).toBe(403);
    as("owner");
    const early = await reviewStatement(json(`/api/organizations/${companyA}/bank-statements/${statementId}`, { action: "REVIEW", revision: 1 }, "PATCH"), statementCtx(companyA, statementId));
    expect(early.status).toBe(409);
    const corrected = await reviewTransaction(json(rowPath, { action: "CORRECT", revision: row.revision, description: "توصيف مصحح للعينة", debit: row.originalDebit.toString(), credit: row.originalCredit.toString(), reason: "تصحيح نص المعاملة بعد المراجعة" }, "PATCH"), ctx);
    expect(corrected.status).toBe(200);
    const current = await db.bankStatementTransaction.findUniqueOrThrow({ where: { id: row.id } });
    expect(current.originalDescription).toBe(row.originalDescription); expect(current.correctedDescription).toBe("توصيف مصحح للعينة");
    expect(await db.bankReviewDecision.count({ where: { statementId, transactionId: row.id } })).toBe(1);
  });

  it("reviews all rows, then exports a readable XLSX without posting a journal", async () => {
    const rows = await db.bankStatementTransaction.findMany({ where: { statementId }, orderBy: { sequence: "asc" } });
    for (const row of rows) await reviewBankTransaction(companyA, statementId, row.id, users.owner, { action: "REVIEW", revision: row.revision });
    as("owner");
    const reviewed = await reviewStatement(json(`/api/organizations/${companyA}/bank-statements/${statementId}`, { action: "REVIEW", revision: 1 }, "PATCH"), statementCtx(companyA, statementId));
    expect(reviewed.status).toBe(200);
    expect((await db.bankStatement.findUniqueOrThrow({ where: { id: statementId } })).reviewStatus).toBe("REVIEWED");
    expect((await db.automationJob.findUniqueOrThrow({ where: { id: jobId } })).status).toBe("REVIEWED");
    const downloaded = await exportStatement(new Request(`http://local.test/api/organizations/${companyA}/bank-statements/${statementId}/export`), statementCtx(companyA, statementId));
    expect(downloaded.status).toBe(200);
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(Buffer.from(await downloaded.arrayBuffer()) as unknown as Parameters<typeof book.xlsx.load>[0]);
    expect(book.worksheets[0].rowCount).toBe(18);
    expect(await db.auditEvent.count({ where: { organizationId: companyA, action: "BANK_STATEMENT_EXPORTED" } })).toBe(1);
  });

  it("closes a rejected review without calling it a processing failure", async () => {
    as("owner");
    const path = `/api/organizations/${companyA}/automation/jobs`;
    const created = await createJob(json(path, { bankAccountId: bankA, idempotencyKey: randomUUID() }), orgCtx(companyA));
    expect(created.status).toBe(201);
    const rejectedJobId = (await created.json()).jobId as string;
    const statement = await db.bankStatement.findUniqueOrThrow({ where: { jobId: rejectedJobId } });
    const decision = await reviewStatement(json(`/api/organizations/${companyA}/bank-statements/${statement.id}`, { action: "REJECT", revision: statement.revision, reason: "الكشف يحتاج مراجعة المصدر الأصلي" }, "PATCH"), statementCtx(companyA, statement.id));
    expect(decision.status).toBe(200);
    expect((await db.automationJob.findUniqueOrThrow({ where: { id: rejectedJobId } })).status).toBe("REVIEW_REJECTED");
    expect((await db.bankStatement.findUniqueOrThrow({ where: { id: statement.id } })).reviewStatus).toBe("REJECTED");
    expect(await db.automationEvent.count({ where: { jobId: rejectedJobId, action: "REVIEW_REJECTED" } })).toBe(1);
  });

  it("authenticates callbacks, rejects replay and stores only one result", async () => {
    const pending = await db.automationJob.create({ data: { organizationId: companyA, requestedById: users.owner.id, bankAccountId: bankA, sourceReference: "SYNTHETIC-CALLBACK", idempotencyKey: randomUUID(), provider: "MOCK", status: "QUEUED", processingType: "BANK_STATEMENT" } });
    const body = JSON.stringify(horizonFixture(pending.id)); const timestamp = String(Date.now()); const nonce = "automation-callback-nonce-123456";
    const path = "http://local.test/api/internal/automation/results";
    const request = (signature: string, nonceValue = nonce) => new Request(path, { method: "POST", headers: { "content-type": "application/json", "x-mc-timestamp": timestamp, "x-mc-nonce": nonceValue, "x-mc-signature": signature }, body });
    expect((await callback(request("0".repeat(64)))).status).toBe(401);
    const signature = signBankCallback(body, timestamp, nonce, process.env.AUTOMATION_CALLBACK_SECRET!);
    expect((await callback(request(signature))).status).toBe(200);
    expect((await callback(request(signature))).status).toBe(409);
    const anotherNonce = "automation-callback-nonce-654321";
    const anotherSignature = signBankCallback(body, timestamp, anotherNonce, process.env.AUTOMATION_CALLBACK_SECRET!);
    expect((await callback(request(anotherSignature, anotherNonce))).status).toBe(200);
    expect(await db.bankStatement.count({ where: { jobId: pending.id } })).toBe(1);
    expect(await db.automationCallbackNonce.count({ where: { jobId: pending.id } })).toBe(2);
    const malformedBody = JSON.stringify({ jobId: pending.id, processingStatus: "approved" });
    const malformedNonce = "automation-callback-malformed-1234";
    const malformedSignature = signBankCallback(malformedBody, timestamp, malformedNonce, process.env.AUTOMATION_CALLBACK_SECRET!);
    expect((await callback(new Request(path, { method: "POST", headers: { "x-mc-timestamp": timestamp, "x-mc-nonce": malformedNonce, "x-mc-signature": malformedSignature }, body: malformedBody }))).status).toBe(400);
  });

  it("retries only stale or failed synthetic jobs with revision checks", async () => {
    const stale = await db.automationJob.create({ data: { organizationId: companyA, requestedById: users.owner.id, bankAccountId: bankA, sourceReference: "SYNTHETIC-STALE", idempotencyKey: randomUUID(), provider: "MOCK", status: "PROCESSING", processingType: "BANK_STATEMENT", attemptCount: 1, startedAt: new Date(Date.now() - 11 * 60_000) } });
    const path = `/api/organizations/${companyA}/automation/jobs/${stale.id}/retry`;
    as("viewer");
    expect((await retryJob(json(path, { revision: 1 }), { params: Promise.resolve({ id: companyA, jobId: stale.id }) })).status).toBe(403);
    as("owner");
    expect((await retryJob(json(path, { revision: 99 }), { params: Promise.resolve({ id: companyA, jobId: stale.id }) })).status).toBe(409);
    expect((await retryJob(json(path, { revision: 1 }), { params: Promise.resolve({ id: companyA, jobId: stale.id }) })).status).toBe(200);
    expect((await db.automationJob.findUniqueOrThrow({ where: { id: stale.id } })).status).toBe("NEEDS_REVIEW");
    expect(await db.automationEvent.count({ where: { jobId: stale.id, action: "JOB_TIMED_OUT" } })).toBe(1);
  });
});
