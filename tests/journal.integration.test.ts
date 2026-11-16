import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

const cookieState = vi.hoisted(() => {
  const jar = new Map<string, string>();
  return { jar, store: { get(name: string) { const value = jar.get(name); return value ? { name, value } : undefined; }, set(name: string, value: string) { jar.set(name, value); }, delete(name: string) { jar.delete(name); } } };
});
vi.mock("next/headers", () => ({ cookies: async () => cookieState.store }));

import { db } from "@/lib/db";
import { sha256 } from "@/lib/security";
import { initializeCommercialChart } from "@/lib/accounting/chart-service";
import { actOnOpeningBatch, createOpeningBatch, saveOpeningLine } from "@/lib/accounting/opening-service";
import { generalLedger, trialBalance } from "@/lib/accounting/ledger-service";
import { accountingPeriodsOverview, closeAccountingPeriod, postApprovedOpeningBalance } from "@/lib/accounting/journal-service";
import { GET as listEntries, POST as createEntry } from "@/app/api/organizations/[id]/journal-entries/route";
import { GET as getEntry, PATCH as actEntry } from "@/app/api/organizations/[id]/journal-entries/[entryId]/route";
import { POST as reverseEntry } from "@/app/api/organizations/[id]/journal-entries/[entryId]/reversal/route";
import { POST as postOpening } from "@/app/api/organizations/[id]/opening-balances/[batchId]/post/route";
import { PATCH as closePeriod } from "@/app/api/organizations/[id]/accounting-periods/[periodId]/route";

const enabled = process.env.RUN_DB_TESTS === "1";
const marker = randomUUID();
const actors: Record<string, { id: string; displayName: string; token: string }> = {};
let companyA = ""; let companyB = ""; let yearA = ""; let cashId = ""; let capitalId = ""; let foreignCashId = "";
let liabilityId = ""; let revenueId = ""; let expenseId = ""; let contraAssetId = "";
let customerId = ""; let prepaidId = ""; let accruedId = ""; let unearnedId = "";
let postedEntryId = ""; let postedRevision = 0; let periodId = "";

function as(name: string) { cookieState.jar.set("money_coder_session", actors[name].token); }
function request(path: string, method = "GET", body?: unknown) {
  return new Request(`http://local.test${path}`, { method, headers: body === undefined ? undefined : { "content-type": "application/json", origin: "http://local.test" }, body: body === undefined ? undefined : JSON.stringify(body) });
}
function organizationContext(id: string) { return { params: Promise.resolve({ id }) }; }
function entryContext(id: string, entryId: string) { return { params: Promise.resolve({ id, entryId }) }; }
function periodContext(id: string, accountingPeriodId: string) { return { params: Promise.resolve({ id, periodId: accountingPeriodId }) }; }
async function actor(name: string) {
  const token = randomUUID();
  const user = await db.user.create({ data: { email: `${name}-${marker}@test.local`, displayName: name, passwordHash: "test-only", emailVerifiedAt: new Date() } });
  await db.session.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 86_400_000) } });
  actors[name] = { id: user.id, displayName: name, token };
  return user;
}
function draft(reference: string, idempotencyKey: string, amount = "100.25", creditAccountId = capitalId) {
  return {
    fiscalYearId: yearA,
    transactionDate: "2026-11-10",
    postingDate: "2026-11-10",
    reference,
    description: `قيد اختبار ${reference}`,
    currency: "EGP",
    idempotencyKey,
    lines: [
      { accountId: cashId, debit: amount, credit: "0", description: "الصندوق" },
      { accountId: creditAccountId, debit: "0", credit: amount, description: "رأس المال" },
    ],
  };
}
async function transition(entryId: string, action: "SUBMIT" | "APPROVE" | "POST", revision: number) {
  return actEntry(request(`/api/organizations/${companyA}/journal-entries/${entryId}`, "PATCH", { action, revision }), entryContext(companyA, entryId));
}

describe.skipIf(!enabled)("Phase 2D journal, ledger and trial balance on disposable PostgreSQL", () => {
  beforeAll(async () => {
    await db.$connect();
    const owner = await actor("journal-owner"); const accountant = await actor("journal-accountant"); const manager = await actor("journal-manager"); const viewer = await actor("journal-viewer"); const outsider = await actor("journal-outsider");
    const organization = await db.organization.create({ data: {
      type: "COMMERCIAL_COMPANY", legalName: `Journal A ${marker}`, createdById: owner.id,
      memberships: { create: [
        { userId: owner.id, role: "COMPANY_OWNER" }, { userId: accountant.id, role: "COMPANY_ACCOUNTANT" },
        { userId: manager.id, role: "COMPANY_MANAGER" }, { userId: viewer.id, role: "VIEWER" },
      ] },
      accountingSettings: { create: { baseCurrency: "EGP" } },
      fiscalYears: { create: { name: "FY 2026/27", startsAt: new Date("2026-11-01T00:00:00.000Z"), endsAt: new Date("2027-10-31T00:00:00.000Z") } },
    } });
    companyA = organization.id;
    companyB = (await db.organization.create({ data: { type: "COMMERCIAL_COMPANY", legalName: `Journal B ${marker}`, createdById: outsider.id, memberships: { create: { userId: outsider.id, role: "COMPANY_OWNER" } }, accountingSettings: { create: { baseCurrency: "EGP" } } } })).id;
    yearA = (await db.companyFiscalYear.findFirstOrThrow({ where: { organizationId: companyA } })).id;
    await initializeCommercialChart(companyA, actors["journal-owner"]);
    await initializeCommercialChart(companyB, actors["journal-outsider"]);
    cashId = (await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "111001" } } })).id;
    capitalId = (await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "320001" } } })).id;
    liabilityId = (await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "211001" } } })).id;
    revenueId = (await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "410001" } } })).id;
    expenseId = (await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "610001" } } })).id;
    contraAssetId = (await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "112006" } } })).id;
    customerId = (await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "112001" } } })).id;
    prepaidId = (await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "115001" } } })).id;
    accruedId = (await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "213001" } } })).id;
    unearnedId = (await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyA, code: "212001" } } })).id;
    foreignCashId = (await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId: companyB, code: "111001" } } })).id;
  });
  afterAll(async () => { cookieState.jar.clear(); await db.$disconnect(); });

  it("enforces authorization and company isolation", async () => {
    as("journal-outsider");
    expect((await listEntries(request(`/api/organizations/${companyA}/journal-entries`), organizationContext(companyA))).status).toBe(403);
    expect((await createEntry(request(`/api/organizations/${companyA}/journal-entries`, "POST", draft("FOREIGN-1", `foreign:${marker}`)), organizationContext(companyA))).status).toBe(403);
    as("journal-viewer");
    expect((await listEntries(request(`/api/organizations/${companyA}/journal-entries`), organizationContext(companyA))).status).toBe(200);
    expect((await createEntry(request(`/api/organizations/${companyA}/journal-entries`, "POST", draft("VIEWER-1", `viewer:${marker}`)), organizationContext(companyA))).status).toBe(403);
    as("journal-accountant");
    const foreignAccount = draft("FOREIGN-ACCOUNT", `foreign-account:${marker}`, "1", foreignCashId);
    expect((await createEntry(request(`/api/organizations/${companyA}/journal-entries`, "POST", foreignAccount), organizationContext(companyA))).status).toBe(400);
  });

  it("rejects unbalanced submission and treats duplicate creation idempotently", async () => {
    as("journal-accountant");
    expect((await createEntry(request(`/api/organizations/${companyA}/journal-entries`, "POST", { ...draft("USD-1", `usd:${marker}`), currency: "USD" }), organizationContext(companyA))).status).toBe(409);
    const unbalanced = draft("UNBALANCED-1", `unbalanced:${marker}`);
    unbalanced.lines[1].credit = "90.25";
    const created = await createEntry(request(`/api/organizations/${companyA}/journal-entries`, "POST", unbalanced), organizationContext(companyA));
    expect(created.status).toBe(201);
    const body = await created.json();
    expect((await transition(body.entry.id, "SUBMIT", body.entry.revision)).status).toBe(409);

    const input = draft("POST-1", `balanced:${marker}`);
    const first = await createEntry(request(`/api/organizations/${companyA}/journal-entries`, "POST", input), organizationContext(companyA));
    expect(first.status).toBe(201);
    const firstBody = await first.json();
    const duplicate = await createEntry(request(`/api/organizations/${companyA}/journal-entries`, "POST", input), organizationContext(companyA));
    expect(duplicate.status).toBe(200);
    expect((await duplicate.json()).entry.id).toBe(firstBody.entry.id);
    postedEntryId = firstBody.entry.id;
    postedRevision = firstBody.entry.revision;
    periodId = firstBody.entry.periodId;
  });

  it("requires independent approval and posting, and serializes concurrent posting", async () => {
    as("journal-accountant");
    const submitted = await transition(postedEntryId, "SUBMIT", postedRevision);
    expect(submitted.status).toBe(200); postedRevision = (await submitted.json()).revision;
    expect((await transition(postedEntryId, "APPROVE", postedRevision)).status).toBe(403);
    as("journal-manager");
    const approved = await transition(postedEntryId, "APPROVE", postedRevision);
    expect(approved.status).toBe(200); postedRevision = (await approved.json()).revision;
    as("journal-accountant");
    expect((await transition(postedEntryId, "POST", postedRevision)).status).toBe(403);
    as("journal-owner");
    const results = await Promise.all([transition(postedEntryId, "POST", postedRevision), transition(postedEntryId, "POST", postedRevision)]);
    expect(results.map(result => result.status).sort()).toEqual([200, 409]);
    const posted = await db.journalEntry.findUniqueOrThrow({ where: { id: postedEntryId } });
    expect(posted.status).toBe("POSTED"); expect(posted.entryNumber).toBe(1); expect(posted.totalDebit.toString()).toBe("100.25"); expect(posted.totalCredit.toString()).toBe("100.25");
    postedRevision = posted.revision;
  });

  it("makes posted headers and lines immutable and keeps a complete audit trail", async () => {
    await expect(db.journalEntry.update({ where: { id: postedEntryId }, data: { description: "forbidden mutation" } })).rejects.toThrow();
    const line = await db.journalLine.findFirstOrThrow({ where: { entryId: postedEntryId, accountId: cashId } });
    await expect(db.journalLine.update({ where: { id: line.id }, data: { debit: "999" } })).rejects.toThrow();
    as("journal-owner");
    const detail = await getEntry(request(`/api/organizations/${companyA}/journal-entries/${postedEntryId}`), entryContext(companyA, postedEntryId));
    expect(detail.status).toBe(200);
    expect((await detail.json()).events.map((item: { action: string }) => item.action)).toEqual(expect.arrayContaining(["JOURNAL_DRAFT_CREATED", "JOURNAL_SUBMITTED", "JOURNAL_APPROVED", "JOURNAL_POSTED"]));
    expect(await db.auditEvent.count({ where: { organizationId: companyA, entityId: postedEntryId, entityType: "JournalEntry" } })).toBeGreaterThanOrEqual(4);
  });

  it("accepts only current CLEAN document evidence and rechecks it before submission", async () => {
    as("journal-accountant");
    const pendingAsset = await db.fileAsset.create({ data: { organizationId: companyA, uploadedById: actors["journal-accountant"].id, kind: "OTHER", originalName: "pending.pdf", storageKey: `organizations/${companyA}/pending/${randomUUID()}`, releaseKey: `organizations/${companyA}/${randomUUID()}`, mimeType: "application/pdf", sizeBytes: 25, sha256: "a".repeat(64), storageProvider: "test-memory", scanStatus: "PENDING_SCAN" } });
    const pendingDocument = await db.companyDocument.create({ data: { organizationId: companyA, fileAssetId: pendingAsset.id, category: "OTHER", title: "Pending evidence" } });
    expect((await createEntry(request(`/api/organizations/${companyA}/journal-entries`, "POST", { ...draft("EVIDENCE-PENDING", `evidence-pending:${marker}`), sourceType: "DOCUMENT", documentId: pendingDocument.id }), organizationContext(companyA))).status).toBe(409);

    const cleanAsset = await db.fileAsset.create({ data: { organizationId: companyA, uploadedById: actors["journal-accountant"].id, kind: "OTHER", originalName: "clean.pdf", storageKey: `organizations/${companyA}/pending/${randomUUID()}`, releaseKey: `organizations/${companyA}/${randomUUID()}`, mimeType: "application/pdf", sizeBytes: 25, sha256: "b".repeat(64), scannedSha256: "b".repeat(64), storageProvider: "test-memory", scanStatus: "CLEAN", scanValidUntil: new Date(Date.now() + 60_000) } });
    const cleanDocument = await db.companyDocument.create({ data: { organizationId: companyA, fileAssetId: cleanAsset.id, category: "OTHER", title: "Clean evidence" } });
    const created = await createEntry(request(`/api/organizations/${companyA}/journal-entries`, "POST", { ...draft("EVIDENCE-CLEAN", `evidence-clean:${marker}`), sourceType: "DOCUMENT", documentId: cleanDocument.id }), organizationContext(companyA));
    expect(created.status).toBe(201);
    const entry = (await created.json()).entry;
    expect(await db.journalEvidenceLink.count({ where: { entryId: entry.id, documentId: cleanDocument.id } })).toBe(1);
    await db.fileAsset.update({ where: { id: cleanAsset.id }, data: { scanValidUntil: new Date(0) } });
    expect((await transition(entry.id, "SUBMIT", entry.revision)).status).toBe(409);
  });

  it("posts approved opening balances exactly once and includes them in reports", async () => {
    const accountant = actors["journal-accountant"]; const manager = actors["journal-manager"]; const owner = actors["journal-owner"];
    const created = await createOpeningBatch(companyA, accountant, yearA);
    const openingId = created.batch.id;
    let openingRevision = created.batch.revision;
    openingRevision = (await saveOpeningLine(companyA, openingId, accountant, { revision: openingRevision, accountId: cashId, debit: "900000000000.99", credit: "0", explanation: "رصيد افتتاحي كبير" })).revision;
    openingRevision = (await saveOpeningLine(companyA, openingId, accountant, { revision: openingRevision, accountId: capitalId, debit: "0", credit: "900000000000.99", explanation: "رأس المال الافتتاحي" })).revision;
    openingRevision = (await actOnOpeningBatch(companyA, openingId, accountant, "SUBMIT", openingRevision)).batch.revision;
    openingRevision = (await actOnOpeningBatch(companyA, openingId, manager, "REVIEW", openingRevision)).batch.revision;
    openingRevision = (await actOnOpeningBatch(companyA, openingId, owner, "APPROVE", openingRevision)).batch.revision;
    as("journal-manager");
    const path = `/api/organizations/${companyA}/opening-balances/${openingId}/post`;
    const context = { params: Promise.resolve({ id: companyA, batchId: openingId }) };
    const first = await postOpening(request(path, "POST", { idempotencyKey: `opening:${openingId}:${openingRevision}` }), context);
    expect(first.status).toBe(201);
    const firstId = (await first.json()).entry.id;
    const duplicate = await postOpening(request(path, "POST", { idempotencyKey: `opening:${openingId}:${openingRevision}` }), context);
    expect(duplicate.status).toBe(200); expect((await duplicate.json()).entry.id).toBe(firstId);
    expect(await db.journalEntry.count({ where: { openingBalanceBatchId: openingId } })).toBe(1);

    const ledger = await generalLedger(companyA, { accountId: cashId, fiscalYearId: yearA, from: "2026-11-01", to: "2026-11-30" });
    expect(ledger.totals.debit).toBe("900000000101.24"); expect(ledger.closing.debit).toBe("900000000101.24");
    const trial = await trialBalance(companyA, { fiscalYearId: yearA, from: "2026-11-01", to: "2026-11-30" });
    expect(trial.reconciled).toBe(true); expect(trial.totals.periodDebit).toBe("900000000101.24"); expect(trial.totals.periodCredit).toBe("900000000101.24");
  });

  it("reverses through a new posted entry without mutating financial history", async () => {
    as("journal-manager");
    const reversalResponse = await reverseEntry(request(`/api/organizations/${companyA}/journal-entries/${postedEntryId}/reversal`, "POST", { postingDate: "2026-11-11", idempotencyKey: `reversal:${marker}`, reason: "عكس موثق للقيد لاختبار سلامة التاريخ" }), entryContext(companyA, postedEntryId));
    expect(reversalResponse.status).toBe(201);
    const reversal = (await reversalResponse.json()).entry;
    as("journal-accountant");
    const submitted = await transition(reversal.id, "SUBMIT", reversal.revision);
    expect(submitted.status).toBe(200);
    as("journal-owner");
    const approved = await transition(reversal.id, "APPROVE", (await submitted.json()).revision);
    expect(approved.status).toBe(200);
    const posted = await transition(reversal.id, "POST", (await approved.json()).revision);
    expect(posted.status).toBe(200);
    expect((await db.journalEntry.findUniqueOrThrow({ where: { id: postedEntryId } })).status).toBe("REVERSED");
    const reversalStored = await db.journalEntry.findUniqueOrThrow({ where: { id: reversal.id }, include: { lines: { orderBy: { lineNumber: "asc" } } } });
    expect(reversalStored.status).toBe("POSTED"); expect(reversalStored.reversalOfId).toBe(postedEntryId);
    expect(reversalStored.lines[0].credit.toString()).toBe("100.25");
    const ledger = await generalLedger(companyA, { accountId: cashId, fiscalYearId: yearA, from: "2026-11-01", to: "2026-11-30" });
    expect(ledger.totals.debit).toBe("900000000101.24"); expect(ledger.totals.credit).toBe("100.25"); expect(ledger.closing.debit).toBe("900000000000.99");
  });

  it("calculates every account class, opposing balances, and period boundaries", async () => {
    as("journal-accountant");
    const input = {
      ...draft("ALL-CLASSES-1", `all-classes:${marker}`),
      transactionDate: "2026-12-01", postingDate: "2026-12-01",
      lines: [
        { accountId: cashId, debit: "100", credit: "0", description: "زيادة أصل" },
        { accountId: expenseId, debit: "30", credit: "0", description: "مصروف" },
        { accountId: liabilityId, debit: "0", credit: "30", description: "التزام" },
        { accountId: revenueId, debit: "0", credit: "70", description: "إيراد" },
        { accountId: capitalId, debit: "0", credit: "20", description: "حقوق ملكية" },
        { accountId: contraAssetId, debit: "0", credit: "10", description: "رصيد دائن مقابل للأصل" },
      ],
    };
    const created = await createEntry(request(`/api/organizations/${companyA}/journal-entries`, "POST", input), organizationContext(companyA));
    expect(created.status).toBe(201);
    const entry = (await created.json()).entry;
    const submitted = await transition(entry.id, "SUBMIT", entry.revision); expect(submitted.status).toBe(200);
    as("journal-manager");
    const approved = await transition(entry.id, "APPROVE", (await submitted.json()).revision); expect(approved.status).toBe(200);
    as("journal-owner");
    expect((await transition(entry.id, "POST", (await approved.json()).revision)).status).toBe(200);

    const december = await trialBalance(companyA, { fiscalYearId: yearA, from: "2026-12-01", to: "2026-12-31", view: "SUMMARY" });
    expect(december.reconciled).toBe(true); expect(december.totals.periodDebit).toBe("130.00"); expect(december.totals.periodCredit).toBe("130.00");
    expect(december.summary.map(row => row.accountClass)).toEqual(expect.arrayContaining(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]));
    expect(december.rows.find(row => row.id === contraAssetId)?.closingCredit).toBe("10.00");
    const november = await generalLedger(companyA, { accountId: cashId, fiscalYearId: yearA, from: "2026-11-01", to: "2026-11-30" });
    expect(november.movements.some(row => row.journalReference === "ALL-CLASSES-1")).toBe(false);
  });

  it("reconciles realistic Egyptian operating cases without inventing classification policy", async () => {
    const cases = [
      { reference: "CASH-PURCHASE", lines: [[expenseId, "50", "0"], [cashId, "0", "50"]] },
      { reference: "CREDIT-SALE", lines: [[customerId, "120", "0"], [revenueId, "0", "120"]] },
      { reference: "CUSTOMER-COLLECTION", lines: [[cashId, "80", "0"], [customerId, "0", "80"]] },
      { reference: "SUPPLIER-PAYMENT", lines: [[liabilityId, "40", "0"], [cashId, "0", "40"]] },
      { reference: "PREPAID-EXPENSE", lines: [[prepaidId, "60", "0"], [cashId, "0", "60"]] },
      { reference: "ACCRUED-EXPENSE", lines: [[expenseId, "30", "0"], [accruedId, "0", "30"]] },
      { reference: "UNEARNED-REVENUE", lines: [[cashId, "70", "0"], [unearnedId, "0", "70"]] },
    ] as const;
    for (const item of cases) {
      as("journal-accountant");
      const created = await createEntry(request(`/api/organizations/${companyA}/journal-entries`, "POST", { ...draft(item.reference, `quality:${item.reference}:${marker}`), lines: item.lines.map(([accountId, debit, credit]) => ({ accountId, debit, credit, description: item.reference })) }), organizationContext(companyA));
      expect(created.status).toBe(201);
      const entry = (await created.json()).entry;
      const submitted = await transition(entry.id, "SUBMIT", entry.revision); expect(submitted.status).toBe(200);
      as("journal-manager"); const approved = await transition(entry.id, "APPROVE", (await submitted.json()).revision); expect(approved.status).toBe(200);
      as("journal-owner"); expect((await transition(entry.id, "POST", (await approved.json()).revision)).status).toBe(200);
    }
    const qualityTrial = await trialBalance(companyA, { fiscalYearId: yearA, from: "2026-11-01", to: "2026-11-30" });
    expect(qualityTrial.reconciled).toBe(true);
    expect(qualityTrial.rows.find(row => row.id === customerId)?.periodDebit).toBe("120.00");
    expect(qualityTrial.rows.find(row => row.id === customerId)?.periodCredit).toBe("80.00");
    expect(qualityTrial.rows.find(row => row.id === prepaidId)?.closingDebit).toBe("60.00");
    expect(qualityTrial.rows.find(row => row.id === accruedId)?.closingCredit).toBe("30.00");
    expect(qualityTrial.rows.find(row => row.id === unearnedId)?.closingCredit).toBe("70.00");
  });

  it("replaces a posted opening balance atomically and leaves no partial reversal after period close", async () => {
    const owner = actors["journal-owner"]; const accountant = actors["journal-accountant"]; const manager = actors["journal-manager"];
    const organization = await db.organization.create({ data: {
      type: "COMMERCIAL_COMPANY", legalName: `Opening correction ${marker}`, createdById: owner.id,
      memberships: { create: [{ userId: owner.id, role: "COMPANY_OWNER" }, { userId: accountant.id, role: "COMPANY_ACCOUNTANT" }, { userId: manager.id, role: "COMPANY_MANAGER" }] },
      accountingSettings: { create: { baseCurrency: "EGP" } },
      fiscalYears: { create: { name: "Correction FY", startsAt: new Date("2026-11-01T00:00:00.000Z"), endsAt: new Date("2027-10-31T00:00:00.000Z") } },
    } });
    const organizationId = organization.id;
    const fiscalYearId = (await db.companyFiscalYear.findFirstOrThrow({ where: { organizationId } })).id;
    await initializeCommercialChart(organizationId, owner);
    const correctionCashId = (await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId, code: "111001" } } })).id;
    const correctionCapitalId = (await db.chartAccount.findUniqueOrThrow({ where: { organizationId_code: { organizationId, code: "320001" } } })).id;

    async function approveBatch(batchId: string, revision: number) {
      let current = (await actOnOpeningBatch(organizationId, batchId, accountant, "SUBMIT", revision)).batch.revision;
      current = (await actOnOpeningBatch(organizationId, batchId, manager, "REVIEW", current)).batch.revision;
      return (await actOnOpeningBatch(organizationId, batchId, owner, "APPROVE", current)).batch;
    }

    const initial = await createOpeningBatch(organizationId, accountant, fiscalYearId);
    let revision = (await saveOpeningLine(organizationId, initial.batch.id, accountant, { revision: initial.batch.revision, accountId: correctionCashId, debit: "1000", credit: "0" })).revision;
    revision = (await saveOpeningLine(organizationId, initial.batch.id, accountant, { revision, accountId: correctionCapitalId, debit: "0", credit: "1000" })).revision;
    const initialApproved = await approveBatch(initial.batch.id, revision);
    const initialPost = await postApprovedOpeningBalance(organizationId, initial.batch.id, manager, `opening-correction-initial:${marker}`);
    expect(initialPost.duplicate).toBe(false);

    const correction = await createOpeningBatch(organizationId, accountant, fiscalYearId, initial.batch.id, "تصحيح موثق لاختبار الاستبدال الذري");
    revision = (await saveOpeningLine(organizationId, correction.batch.id, accountant, { revision: correction.batch.revision, accountId: correctionCashId, debit: "1200", credit: "0" })).revision;
    revision = (await saveOpeningLine(organizationId, correction.batch.id, accountant, { revision, accountId: correctionCapitalId, debit: "0", credit: "1200" })).revision;
    const correctionApproved = await approveBatch(correction.batch.id, revision);
    const correctedPost = await postApprovedOpeningBalance(organizationId, correction.batch.id, manager, `opening-correction-post:${marker}`);
    expect(correctedPost.duplicate).toBe(false);
    const initialJournal = await db.journalEntry.findFirstOrThrow({ where: { openingBalanceBatchId: initialApproved.id } });
    expect(initialJournal.status).toBe("REVERSED");
    expect(await db.journalEntry.count({ where: { organizationId, reversalOfId: initialJournal.id, status: "POSTED" } })).toBe(1);
    const correctedLedger = await generalLedger(organizationId, { accountId: correctionCashId, fiscalYearId, from: "2026-11-01", to: "2026-11-30" });
    expect(correctedLedger.closing.debit).toBe("1200.00");

    const blocked = await createOpeningBatch(organizationId, accountant, fiscalYearId, correctionApproved.id, "تصحيح ثان لاختبار منع الأثر الجزئي");
    revision = (await saveOpeningLine(organizationId, blocked.batch.id, accountant, { revision: blocked.batch.revision, accountId: correctionCashId, debit: "1300", credit: "0" })).revision;
    revision = (await saveOpeningLine(organizationId, blocked.batch.id, accountant, { revision, accountId: correctionCapitalId, debit: "0", credit: "1300" })).revision;
    const blockedApproved = await approveBatch(blocked.batch.id, revision);
    const period = (await accountingPeriodsOverview(organizationId, fiscalYearId)).periods[0];
    await closeAccountingPeriod(organizationId, period.id, owner, period.name);
    await expect(postApprovedOpeningBalance(organizationId, blockedApproved.id, manager, `opening-correction-blocked:${marker}`)).rejects.toMatchObject({ status: 409 });
    expect(await db.journalEntry.count({ where: { organizationId, openingBalanceBatchId: blockedApproved.id } })).toBe(0);
    expect(await db.journalEntry.count({ where: { organizationId, reversalOfId: correctedPost.entry.id } })).toBe(0);
    const unchanged = await generalLedger(organizationId, { accountId: correctionCashId, fiscalYearId, from: "2026-11-01", to: "2026-11-30" });
    expect(unchanged.closing.debit).toBe("1200.00");
  });

  it("closes a period and blocks new journal activity in it", async () => {
    as("journal-owner");
    const overview = await accountingPeriodsOverview(companyA, yearA);
    const period = overview.periods.find(item => item.id === periodId)!;
    expect(period.counts.draft).toBeGreaterThan(0);
    expect((await closePeriod(request(`/api/organizations/${companyA}/accounting-periods/${periodId}`, "PATCH", { action: "CLOSE", confirmation: "wrong" }), periodContext(companyA, periodId))).status).toBe(400);
    const closed = await closePeriod(request(`/api/organizations/${companyA}/accounting-periods/${periodId}`, "PATCH", { action: "CLOSE", confirmation: period.name }), periodContext(companyA, periodId));
    expect(closed.status).toBe(200); expect((await closed.json()).status).toBe("CLOSED");
    as("journal-accountant");
    expect((await createEntry(request(`/api/organizations/${companyA}/journal-entries`, "POST", draft("CLOSED-1", `closed:${marker}`)), organizationContext(companyA))).status).toBe(409);
    expect((await db.accountingPeriod.findUniqueOrThrow({ where: { id: periodId } })).status).toBe("CLOSED");
  });
});
