import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { bankAutomationAvailability } from "@/integrations/n8n/client";
import { horizonFixture } from "./bank-fixture";
import { bankMinor, BankContractError, validateBankResult } from "./bank-contract";
import { currencyPrecision } from "./opening-money";

export class AutomationError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

type Actor = { id: string; displayName: string };
type Tx = Prisma.TransactionClient;

async function lockJob(tx: Tx, jobId: string) {
  await tx.$queryRaw`SELECT "id" FROM "AutomationJob" WHERE "id" = ${jobId}::uuid FOR UPDATE`;
}

async function logEvent(tx: Tx, organizationId: string, jobId: string, action: string, actorUserId?: string, metadata: Record<string, string | number | boolean | null> = {}) {
  await tx.automationEvent.create({ data: { organizationId, jobId, action, actorUserId, metadata } });
  await tx.auditEvent.create({ data: { organizationId, actorUserId, action, entityType: "AutomationJob", entityId: jobId, metadata } });
}

export async function listAutomationJobs(organizationId: string, query: { search?: string; status?: string; from?: Date; to?: Date; page?: number } = {}) {
  const page = Math.max(1, Math.min(query.page ?? 1, 10000));
  const status = query.status && ["CREATED", "QUEUED", "PROCESSING", "NEEDS_REVIEW", "REVIEWED", "REVIEW_REJECTED", "PROCESSING_FAILED", "TIMED_OUT", "CANCELLED"].includes(query.status) ? query.status as Prisma.EnumAutomationJobStatusFilter["equals"] : undefined;
  const where: Prisma.AutomationJobWhereInput = {
    organizationId, ...(status ? { status } : {}),
    ...(query.search ? { OR: [{ sourceReference: { contains: query.search, mode: "insensitive" } }, { id: query.search.match(/^[a-f0-9-]{36}$/i) ? query.search : undefined }] } : {}),
    ...(query.from || query.to ? { createdAt: { gte: query.from, lte: query.to } } : {}),
  };
  const [total, jobs, groups, latest] = await Promise.all([
    db.automationJob.count({ where }),
    db.automationJob.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 20, take: 20, include: { statement: { select: { id: true, reviewStatus: true, mathStatus: true } }, requestedBy: { select: { displayName: true } } } }),
    db.automationJob.groupBy({ by: ["status"], where: { organizationId }, _count: { _all: true } }),
    db.automationJob.findFirst({ where: { organizationId }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
  ]);
  return { total, page, pages: Math.max(1, Math.ceil(total / 20)), jobs, counts: Object.fromEntries(groups.map(group => [group.status, group._count._all])), lastUpdatedAt: latest?.updatedAt ?? null, availability: bankAutomationAvailability() };
}

export async function createSyntheticJob(organizationId: string, actor: Actor, bankAccountId: string, idempotencyKey: string) {
  const availability = bankAutomationAvailability();
  if (!availability.available || availability.mode !== "MOCK") throw new AutomationError(availability.reason, 503);
  const account = await db.companyBankAccount.findFirst({ where: { id: bankAccountId, organizationId, deletedAt: null, isActive: true } });
  if (!account) throw new AutomationError("الحساب البنكي غير موجود لهذه الشركة.", 404);
  const prior = await db.automationJob.findUnique({ where: { organizationId_idempotencyKey: { organizationId, idempotencyKey } } });
  if (prior) return { jobId: prior.id, duplicate: true };
  let job;
  try {
    job = await db.$transaction(async tx => {
      const created = await tx.automationJob.create({ data: { organizationId, requestedById: actor.id, bankAccountId, processingType: "BANK_STATEMENT", sourceReference: "HORIZON-SYNTHETIC-SAMPLE", idempotencyKey, provider: "MOCK", status: "PROCESSING", attemptCount: 1, startedAt: new Date() } });
      await logEvent(tx, organizationId, created.id, "JOB_CREATED", actor.id, { sourceType: "SYNTHETIC" });
      await logEvent(tx, organizationId, created.id, "JOB_PROCESSING", actor.id, { provider: "MOCK" });
      return created;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await db.automationJob.findUnique({ where: { organizationId_idempotencyKey: { organizationId, idempotencyKey } } });
      if (existing) return { jobId: existing.id, duplicate: true };
    }
    throw error;
  }
  try {
    await ingestBankResult(job.id, horizonFixture(job.id));
  } catch (error) {
    await db.$transaction(async tx => {
      await lockJob(tx, job.id);
      const current = await tx.automationJob.findUnique({ where: { id: job.id } });
      if (current?.status === "PROCESSING") {
        await tx.automationJob.update({ where: { id: job.id }, data: { status: "PROCESSING_FAILED", failureCategory: "MOCK_VALIDATION", failureMessage: "تعذر التحقق من العينة الاصطناعية.", revision: { increment: 1 } } });
        await logEvent(tx, organizationId, job.id, "JOB_FAILED", actor.id, { category: "MOCK_VALIDATION" });
      }
    });
    throw error;
  }
  return { jobId: job.id, duplicate: false };
}

export async function ingestBankResult(jobId: string, raw: unknown, nonce?: { nonceHash: string; expiresAt: Date }) {
  const normalized = validateBankResult(raw);
  if (normalized.jobId !== jobId) throw new BankContractError("معرّف الوظيفة لا يطابق النتيجة.");
  const resultHash = createHash("sha256").update(JSON.stringify(raw)).digest("hex");
  return db.$transaction(async tx => {
    await lockJob(tx, jobId);
    const job = await tx.automationJob.findUnique({ where: { id: jobId } });
    if (!job) throw new AutomationError("الوظيفة غير موجودة.", 404);
    if (nonce) {
      try { await tx.automationCallbackNonce.create({ data: { ...nonce, jobId, organizationId: job.organizationId } }); }
      catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AutomationError("استدعاء مكرر.", 409); throw error; }
    }
    if (job.resultHash) {
      if (job.resultHash === resultHash) return { statementId: (await tx.bankStatement.findUnique({ where: { jobId } }))?.id, duplicate: true };
      throw new AutomationError("توجد نتيجة أخرى محفوظة لهذه الوظيفة.", 409);
    }
    if (job.status !== "QUEUED" && job.status !== "PROCESSING") throw new AutomationError("حالة الوظيفة لا تسمح باستقبال نتيجة.", 409);
    if (!job.bankAccountId) throw new AutomationError("الوظيفة غير مرتبطة بحساب بنكي.", 409);
    const account = await tx.companyBankAccount.findFirst({ where: { id: job.bankAccountId, organizationId: job.organizationId, deletedAt: null } });
    if (!account || account.currency !== normalized.currency) throw new AutomationError("عملة النتيجة أو الحساب البنكي غير متطابقين.", 409);
    const statement = await tx.bankStatement.create({ data: {
      organization: { connect: { id: job.organizationId } },
      job: { connect: { id_organizationId: { id: jobId, organizationId: job.organizationId } } },
      bankAccount: { connect: { id_organizationId: { id: account.id, organizationId: job.organizationId } } },
      bankFromPdf: normalized.bankFromPdf,
      currency: normalized.currency, periodStart: normalized.periodStart, periodEnd: normalized.periodEnd,
      openingBalance: normalized.openingBalance, totalCredits: normalized.totalCredits, totalDebits: normalized.totalDebits,
      closingBalance: normalized.closingBalance, difference: normalized.difference, mathStatus: normalized.mathStatus,
      parserVersion: normalized.parserVersion, issues: normalized.issues,
    } });
    await tx.bankStatementTransaction.createMany({ data: normalized.rows.map(row => ({ organizationId: job.organizationId, statementId: statement.id, ...row })) });
    await tx.automationJob.update({ where: { id: jobId }, data: { resultHash, status: "NEEDS_REVIEW", completedAt: new Date(), revision: { increment: 1 } } });
    await logEvent(tx, job.organizationId, jobId, "JOB_RESULT_RECEIVED", undefined, { statementId: statement.id, transactionCount: normalized.rows.length, mathStatus: normalized.mathStatus, issueCount: normalized.issueCount });
    return { statementId: statement.id, duplicate: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function retrySyntheticJob(organizationId: string, jobId: string, actor: Actor, revision: number) {
  const availability = bankAutomationAvailability();
  if (!availability.available || availability.mode !== "MOCK") throw new AutomationError(availability.reason, 503);
  await db.$transaction(async tx => {
    await lockJob(tx, jobId);
    const job = await tx.automationJob.findFirst({ where: { id: jobId, organizationId } });
    if (!job) throw new AutomationError("الوظيفة غير موجودة.", 404);
    if (job.revision !== revision) throw new AutomationError("تغيرت الوظيفة؛ حدّث الصفحة.", 409);
    const staleProcessing = job.status === "PROCESSING" && !!job.startedAt && job.startedAt.getTime() < Date.now() - 10 * 60_000;
    if (!["PROCESSING_FAILED", "TIMED_OUT"].includes(job.status) && !staleProcessing || job.resultHash || job.attemptCount >= 3 || job.provider !== "MOCK") throw new AutomationError("إعادة المحاولة غير متاحة لهذه الوظيفة.", 409);
    if (staleProcessing) await logEvent(tx, organizationId, jobId, "JOB_TIMED_OUT", actor.id, { priorAttempt: job.attemptCount });
    await tx.automationJob.update({ where: { id: jobId }, data: { status: "PROCESSING", attemptCount: { increment: 1 }, revision: { increment: 1 }, startedAt: new Date(), failureCategory: null, failureMessage: null } });
    await logEvent(tx, organizationId, jobId, "JOB_RETRIED", actor.id, { attempt: job.attemptCount + 1 });
  });
  return ingestBankResult(jobId, horizonFixture(jobId));
}

export async function listBankStatements(organizationId: string, page = 1, query: { search?: string; status?: string } = {}) {
  const bounded = Math.max(1, Math.min(page, 10000));
  const where: Prisma.BankStatementWhereInput = { organizationId,
    ...(query.search ? { OR: [{ bankFromPdf: { contains: query.search.slice(0, 120), mode: "insensitive" } }, { bankAccount: { bankName: { contains: query.search.slice(0, 120), mode: "insensitive" } } }] } : {}),
    ...(["PENDING_REVIEW", "CORRECTION_REQUESTED", "REVIEWED", "REJECTED"].includes(query.status ?? "") ? { reviewStatus: query.status as "PENDING_REVIEW" | "CORRECTION_REQUESTED" | "REVIEWED" | "REJECTED" } : {}),
  };
  const [total, statements] = await Promise.all([
    db.bankStatement.count({ where }),
    db.bankStatement.findMany({ where, orderBy: { createdAt: "desc" }, skip: (bounded - 1) * 20, take: 20, include: { bankAccount: { select: { bankName: true, accountName: true } }, _count: { select: { transactions: true } } } }),
  ]);
  return { total, page: bounded, pages: Math.max(1, Math.ceil(total / 20)), statements };
}

export async function bankStatementDetail(organizationId: string, statementId: string) {
  const statement = await db.bankStatement.findFirst({ where: { id: statementId, organizationId }, include: {
    bankAccount: { select: { bankName: true, accountName: true, currency: true } },
    transactions: { orderBy: { sequence: "asc" } },
    decisions: { orderBy: { createdAt: "desc" }, take: 100, include: { actor: { select: { displayName: true } } } },
    job: { select: { id: true, sourceReference: true, provider: true, status: true } },
  } });
  if (!statement) throw new AutomationError("كشف الحساب غير موجود.", 404);
  return statement;
}

export async function reviewBankTransaction(organizationId: string, statementId: string, transactionId: string, actor: Actor, input: { action: "CORRECT" | "REVIEW" | "REJECT"; revision: number; reason?: string; description?: string; debit?: string; credit?: string }) {
  return db.$transaction(async tx => {
    const statement = await tx.bankStatement.findFirst({ where: { id: statementId, organizationId } });
    const transaction = await tx.bankStatementTransaction.findFirst({ where: { id: transactionId, statementId, organizationId } });
    if (!statement || !transaction) throw new AutomationError("الحركة غير موجودة.", 404);
    if (statement.reviewStatus === "REVIEWED" || statement.reviewStatus === "REJECTED") throw new AutomationError("مراجعة الكشف مقفلة.", 409);
    if (transaction.revision !== input.revision) throw new AutomationError("تغيرت الحركة؛ حدّث الصفحة.", 409);
    if (input.action !== "REVIEW" && (!input.reason || input.reason.trim().length < 10)) throw new AutomationError("اذكر سببًا واضحًا من 10 أحرف على الأقل.");
    if (input.action === "REVIEW" && transaction.mathStatus !== "MATCHED") throw new AutomationError("لا يمكن إقرار حركة تخالف الرصيد الجاري؛ ارفضها أو اطلب تصحيحًا.", 409);
    let changes: Prisma.BankStatementTransactionUpdateInput;
    if (input.action === "CORRECT") {
      const validated = validateCorrection(input.debit ?? transaction.originalDebit.toString(), input.credit ?? transaction.originalCredit.toString(), statement.currency);
      changes = { correctedDescription: input.description?.trim().slice(0, 1000) || transaction.originalDescription, correctedDebit: validated.debit, correctedCredit: validated.credit, correctionReason: input.reason!.trim(), reviewStatus: "CORRECTION_REQUESTED" };
    } else changes = { reviewStatus: input.action === "REVIEW" ? "REVIEWED" : "REJECTED", reviewedById: actor.id, reviewedAt: new Date() };
    const updated = await tx.bankStatementTransaction.update({ where: { id: transactionId }, data: { ...changes, revision: { increment: 1 } } });
    await tx.bankReviewDecision.create({ data: { organizationId, statementId, transactionId, actorUserId: actor.id, action: input.action, previous: { description: transaction.correctedDescription ?? transaction.originalDescription, debit: (transaction.correctedDebit ?? transaction.originalDebit).toString(), credit: (transaction.correctedCredit ?? transaction.originalCredit).toString(), status: transaction.reviewStatus }, next: { description: updated.correctedDescription ?? updated.originalDescription, debit: (updated.correctedDebit ?? updated.originalDebit).toString(), credit: (updated.correctedCredit ?? updated.originalCredit).toString(), status: updated.reviewStatus }, reason: input.reason?.trim() ?? null } });
    await logEvent(tx, organizationId, statement.jobId, input.action === "CORRECT" ? "TRANSACTION_CORRECTED" : input.action === "REJECT" ? "REVIEW_REJECTED" : "TRANSACTION_REVIEWED", actor.id, { transactionId, statementId });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

function validateCorrection(debit: string, credit: string, currency: string) {
  const precision = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const check = (value: string) => { if (!/^\d{1,16}(?:\.\d{1,3})?$/.test(value) || value.split(".")[1]?.length > precision) throw new AutomationError("مبلغ التصحيح غير صالح."); return value; };
  const left = check(debit); const right = check(credit);
  if (BigInt(left.replace(".", "")) > BigInt(0) && BigInt(right.replace(".", "")) > BigInt(0)) throw new AutomationError("لا يجوز وجود مدين ودائن للحركة نفسها.");
  return { debit: left, credit: right };
}

export async function decideBankStatement(organizationId: string, statementId: string, actor: Actor, input: { action: "REVIEW" | "REJECT"; revision: number; reason?: string }) {
  return db.$transaction(async tx => {
    const statement = await tx.bankStatement.findFirst({ where: { id: statementId, organizationId }, include: { transactions: { orderBy: { sequence: "asc" }, select: { reviewStatus: true, originalDebit: true, originalCredit: true, correctedDebit: true, correctedCredit: true, runningBalance: true } } } });
    if (!statement) throw new AutomationError("كشف الحساب غير موجود.", 404);
    if (statement.revision !== input.revision || ["REVIEWED", "REJECTED"].includes(statement.reviewStatus)) throw new AutomationError("تغيرت حالة الكشف؛ حدّث الصفحة.", 409);
    if (input.action === "REVIEW" && (statement.mathStatus !== "MATCHED" || statement.transactions.some(row => row.reviewStatus !== "REVIEWED"))) throw new AutomationError("راجع كل الحركات والفروق الحسابية قبل إقرار الكشف.", 409);
    if (input.action === "REVIEW") {
      const precision = currencyPrecision(statement.currency);
      let running = bankMinor(statement.openingBalance.toString(), precision);
      let debits = BigInt(0); let credits = BigInt(0);
      for (const row of statement.transactions) {
        const debit = bankMinor((row.correctedDebit ?? row.originalDebit).toString(), precision);
        const credit = bankMinor((row.correctedCredit ?? row.originalCredit).toString(), precision);
        debits += debit; credits += credit; running += credit - debit;
        if (running !== bankMinor(row.runningBalance.toString(), precision)) throw new AutomationError("التصحيحات المالية لا تطابق الرصيد الجاري؛ ارفض الكشف أو اطلب إعادة معالجة.", 409);
      }
      if (debits !== bankMinor(statement.totalDebits.toString(), precision) || credits !== bankMinor(statement.totalCredits.toString(), precision) || running !== bankMinor(statement.closingBalance.toString(), precision)) throw new AutomationError("التصحيحات المالية لا تطابق إجماليات الكشف.", 409);
    }
    if (input.action === "REJECT" && (!input.reason || input.reason.trim().length < 10)) throw new AutomationError("سبب الرفض مطلوب.");
    const nextStatus = input.action === "REVIEW" ? "REVIEWED" : "REJECTED";
    const updated = await tx.bankStatement.update({ where: { id: statementId }, data: { reviewStatus: nextStatus, reviewedById: actor.id, reviewedAt: new Date(), revision: { increment: 1 } } });
    await tx.bankReviewDecision.create({ data: { organizationId, statementId, actorUserId: actor.id, action: input.action, previous: { status: statement.reviewStatus }, next: { status: nextStatus }, reason: input.reason?.trim() ?? null } });
    await tx.automationJob.update({ where: { id: statement.jobId }, data: { status: input.action === "REVIEW" ? "REVIEWED" : "REVIEW_REJECTED", revision: { increment: 1 } } });
    await logEvent(tx, organizationId, statement.jobId, input.action === "REVIEW" ? "STATEMENT_REVIEWED" : "REVIEW_REJECTED", actor.id, { statementId });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
