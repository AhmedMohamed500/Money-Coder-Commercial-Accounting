import { Prisma, type JournalEntryStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { documentIsClean } from "@/lib/document-gateway";
import { currencyPrecision, formatMinor, parseMoney, validateSides } from "./opening-money";

type Tx = Prisma.TransactionClient;
export type JournalActor = { id: string; displayName: string };
export type JournalLineInput = { accountId: string; debit: string; credit: string; description?: string; sourceReference?: string };
export type JournalDraftInput = {
  fiscalYearId: string;
  transactionDate: string;
  postingDate: string;
  reference: string;
  description: string;
  currency: string;
  idempotencyKey: string;
  sourceType?: "MANUAL" | "BANK_STATEMENT" | "DOCUMENT";
  sourceReference?: string;
  sourceRevision?: string;
  evidenceTimestamp?: string;
  documentId?: string;
  bankTransactionId?: string;
  statementId?: string;
  lines: JournalLineInput[];
};

export class JournalError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

function dateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new JournalError("التاريخ غير صالح.");
  const result = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(result.getTime()) || result.toISOString().slice(0, 10) !== value) throw new JournalError("التاريخ غير صالح.");
  return result;
}

function dateKey(value: Date) { return value.toISOString().slice(0, 10); }

async function lockCompany(tx: Tx, organizationId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string; type: string; deletedAt: Date | null }>>`SELECT "id", "type", "deletedAt" FROM "Organization" WHERE "id" = ${organizationId}::uuid FOR UPDATE`;
  if (rows.length !== 1 || rows[0].type !== "COMMERCIAL_COMPANY" || rows[0].deletedAt) throw new JournalError("الشركة غير موجودة.", 404);
}

async function lockEntry(tx: Tx, organizationId: string, entryId: string) {
  await tx.$queryRaw`SELECT "id" FROM "JournalEntry" WHERE "id" = ${entryId}::uuid AND "organizationId" = ${organizationId}::uuid FOR UPDATE`;
}

function monthPeriods(startsAt: Date, endsAt: Date) {
  const result: Array<{ sequence: number; name: string; startsAt: Date; endsAt: Date }> = [];
  let cursor = new Date(Date.UTC(startsAt.getUTCFullYear(), startsAt.getUTCMonth(), startsAt.getUTCDate()));
  let sequence = 1;
  while (cursor <= endsAt) {
    const nextMonth = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    const periodEnd = new Date(Math.min(endsAt.getTime(), nextMonth.getTime() - 86_400_000));
    result.push({ sequence, name: `الفترة ${String(sequence).padStart(2, "0")} · ${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`, startsAt: cursor, endsAt: periodEnd });
    cursor = new Date(periodEnd.getTime() + 86_400_000);
    sequence++;
  }
  return result;
}

async function ensureFiscalPeriods(tx: Tx, organizationId: string, fiscalYear: { id: string; startsAt: Date; endsAt: Date }) {
  const existing = await tx.accountingPeriod.findMany({ where: { organizationId, fiscalYearId: fiscalYear.id }, orderBy: { sequence: "asc" } });
  if (existing.length) return existing;
  const periods = monthPeriods(fiscalYear.startsAt, fiscalYear.endsAt);
  await tx.accountingPeriod.createMany({ data: periods.map(period => ({ ...period, organizationId, fiscalYearId: fiscalYear.id })) });
  return tx.accountingPeriod.findMany({ where: { organizationId, fiscalYearId: fiscalYear.id }, orderBy: { sequence: "asc" } });
}

async function accountingContext(tx: Tx, organizationId: string, fiscalYearId: string, postingDate: Date) {
  const fiscalYear = await tx.companyFiscalYear.findFirst({ where: { id: fiscalYearId, organizationId } });
  if (!fiscalYear) throw new JournalError("السنة المالية غير موجودة.", 404);
  if (fiscalYear.isClosed) throw new JournalError("السنة المالية مغلقة.", 409);
  if (postingDate < fiscalYear.startsAt || postingDate > fiscalYear.endsAt) throw new JournalError("تاريخ الترحيل خارج السنة المالية.", 409);
  const periods = await ensureFiscalPeriods(tx, organizationId, fiscalYear);
  const period = periods.find(item => postingDate >= item.startsAt && postingDate <= item.endsAt);
  if (!period) throw new JournalError("لا توجد فترة محاسبية لتاريخ الترحيل.", 409);
  if (period.status !== "OPEN") throw new JournalError("الفترة المحاسبية مغلقة.", 409);
  return { fiscalYear, period };
}

async function assertBaseCurrency(tx: Tx, organizationId: string, currency: string) {
  const settings = await tx.companyAccountingSettings.findUnique({ where: { organizationId }, select: { baseCurrency: true } });
  if (!settings?.baseCurrency || settings.baseCurrency !== currency) throw new JournalError("لا يمكن ترحيل عملة تختلف عن العملة الأساسية قبل اعتماد سياسة تحويل عملات.", 409);
}

async function normalizeLines(tx: Tx, organizationId: string, precision: number, lines: JournalLineInput[]) {
  if (lines.length < 2 || lines.length > 200) throw new JournalError("يجب أن يحتوي القيد على سطرين على الأقل وبحد أقصى 200 سطر.");
  const ids = Array.from(new Set(lines.map(line => line.accountId)));
  const accounts = await tx.chartAccount.findMany({ where: { organizationId, id: { in: ids }, deletedAt: null }, select: { id: true, code: true, nameAr: true, isPostable: true, isActive: true } });
  const byId = new Map(accounts.map(account => [account.id, account]));
  let debitMinor = BigInt(0); let creditMinor = BigInt(0);
  const normalized = lines.map((line, index) => {
    const account = byId.get(line.accountId);
    if (!account || !account.isPostable || !account.isActive) throw new JournalError(`الحساب في السطر ${index + 1} غير موجود أو غير قابل للترحيل.`);
    const sides = validateSides(line.debit || "0", line.credit || "0", precision);
    if (sides.empty) throw new JournalError(`السطر ${index + 1} لا يحتوي مبلغًا.`);
    debitMinor += parseMoney(sides.debit, precision).minor;
    creditMinor += parseMoney(sides.credit, precision).minor;
    return { organizationId, accountId: account.id, lineNumber: index + 1, debit: sides.debit, credit: sides.credit, description: line.description?.trim().slice(0, 500) || null, sourceReference: line.sourceReference?.trim().slice(0, 160) || null };
  });
  return { normalized, debitMinor, creditMinor, debit: formatMinor(debitMinor, precision), credit: formatMinor(creditMinor, precision), balanced: debitMinor === creditMinor && debitMinor > BigInt(0) };
}

async function event(tx: Tx, input: { organizationId: string; entryId: string; actor: JournalActor; action: string; fromStatus?: JournalEntryStatus; toStatus?: JournalEntryStatus; reason?: string; metadata?: Record<string, unknown>; request?: Request }) {
  const metadata = { ...(input.metadata ?? {}), actorName: input.actor.displayName } as Prisma.InputJsonValue;
  await tx.journalEntryEvent.create({ data: { organizationId: input.organizationId, entryId: input.entryId, actorUserId: input.actor.id, action: input.action, fromStatus: input.fromStatus, toStatus: input.toStatus, reason: input.reason?.trim().slice(0, 500), metadata } });
  await tx.auditEvent.create({ data: { organizationId: input.organizationId, actorUserId: input.actor.id, action: input.action, entityType: "JournalEntry", entityId: input.entryId, metadata, ipAddress: input.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: input.request?.headers.get("user-agent") ?? null } });
}

async function attachEvidence(tx: Tx, organizationId: string, entryId: string, input: JournalDraftInput) {
  if (input.documentId) {
    const document = await tx.companyDocument.findFirst({ where: { id: input.documentId, organizationId, deletedAt: null }, select: { id: true, fileAsset: { select: { scanStatus: true, sha256: true, scannedSha256: true, releaseKey: true, scanValidUntil: true, deletedAt: true } } } });
    if (!document) throw new JournalError("المستند الداعم غير موجود لهذه الشركة.", 404);
    if (!documentIsClean(document.fileAsset)) throw new JournalError("لا يمكن ربط مستند لم يجتز فحص الأمان أو انتهت صلاحية فحصه.", 409);
    const exists = await tx.journalEvidenceLink.findFirst({ where: { organizationId, entryId, documentId: document.id }, select: { id: true } });
    if (!exists) await tx.journalEvidenceLink.create({ data: { organizationId, entryId, documentId: document.id, sourceType: "DOCUMENT", sourceId: document.id, sourceRevision: input.sourceRevision, evidenceAt: input.evidenceTimestamp ? new Date(input.evidenceTimestamp) : new Date() } });
  }
  if (input.bankTransactionId || input.statementId) {
    if (!input.bankTransactionId || !input.statementId) throw new JournalError("مرجع حركة البنك غير مكتمل.");
    const bank = await tx.bankStatementTransaction.findFirst({ where: { id: input.bankTransactionId, statementId: input.statementId, organizationId }, select: { id: true, statementId: true, revision: true } });
    if (!bank) throw new JournalError("حركة البنك غير موجودة لهذه الشركة.", 404);
    const exists = await tx.journalEvidenceLink.findFirst({ where: { organizationId, entryId, bankTransactionId: bank.id, statementId: bank.statementId }, select: { id: true } });
    if (!exists) await tx.journalEvidenceLink.create({ data: { organizationId, entryId, statementId: bank.statementId, bankTransactionId: bank.id, sourceType: "BANK_TRANSACTION", sourceId: bank.id, sourceRevision: String(bank.revision), evidenceAt: input.evidenceTimestamp ? new Date(input.evidenceTimestamp) : new Date() } });
  }
}

export async function createJournalDraft(organizationId: string, actor: JournalActor, input: JournalDraftInput, request?: Request) {
  return db.$transaction(async tx => {
    await lockCompany(tx, organizationId);
    const prior = await tx.journalEntry.findUnique({ where: { organizationId_idempotencyKey: { organizationId, idempotencyKey: input.idempotencyKey } }, include: { lines: true } });
    if (prior) return { entry: prior, duplicate: true };
    const postingDate = dateOnly(input.postingDate); const transactionDate = dateOnly(input.transactionDate);
    const currency = input.currency.trim().toUpperCase(); const precision = currencyPrecision(currency);
    await assertBaseCurrency(tx, organizationId, currency);
    const { period } = await accountingContext(tx, organizationId, input.fiscalYearId, postingDate);
    const values = await normalizeLines(tx, organizationId, precision, input.lines);
    let entry;
    try {
      entry = await tx.journalEntry.create({ data: { organizationId, fiscalYearId: input.fiscalYearId, periodId: period.id, reference: input.reference.trim().slice(0, 80), description: input.description.trim().slice(0, 500), transactionDate, postingDate, currency, currencyPrecision: precision, sourceType: input.sourceType ?? "MANUAL", sourceReference: input.sourceReference?.trim().slice(0, 160) || null, sourceRevision: input.sourceRevision?.trim().slice(0, 80) || null, evidenceTimestamp: input.evidenceTimestamp ? new Date(input.evidenceTimestamp) : null, idempotencyKey: input.idempotencyKey, totalDebit: values.debit, totalCredit: values.credit, createdById: actor.id } });
    } catch (cause) {
      if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === "P2002") throw new JournalError("مرجع القيد أو مفتاح عدم التكرار مستخدم بالفعل.", 409);
      throw cause;
    }
    await tx.journalLine.createMany({ data: values.normalized.map(line => ({ ...line, entryId: entry.id })) });
    await attachEvidence(tx, organizationId, entry.id, input);
    await event(tx, { organizationId, entryId: entry.id, actor, action: "JOURNAL_DRAFT_CREATED", toStatus: "DRAFT", metadata: { balanced: values.balanced, debit: values.debit, credit: values.credit }, request });
    return { entry: await tx.journalEntry.findUniqueOrThrow({ where: { id: entry.id }, include: { lines: { include: { account: { select: { code: true, nameAr: true } } }, orderBy: { lineNumber: "asc" } }, evidenceLinks: true } }), duplicate: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function replaceJournalDraft(organizationId: string, entryId: string, actor: JournalActor, revision: number, input: Omit<JournalDraftInput, "idempotencyKey">, request?: Request) {
  return db.$transaction(async tx => {
    await lockCompany(tx, organizationId); await lockEntry(tx, organizationId, entryId);
    const before = await tx.journalEntry.findFirst({ where: { id: entryId, organizationId } });
    if (!before) throw new JournalError("القيد غير موجود.", 404);
    if (before.revision !== revision) throw new JournalError("تغير القيد. حدّث الصفحة قبل الحفظ.", 409);
    if (before.status !== "DRAFT" && before.status !== "REJECTED") throw new JournalError("لا يمكن تعديل القيد بعد تقديمه.", 409);
    const postingDate = dateOnly(input.postingDate); const transactionDate = dateOnly(input.transactionDate);
    const currency = input.currency.trim().toUpperCase(); const precision = currencyPrecision(currency);
    await assertBaseCurrency(tx, organizationId, currency);
    const { period } = await accountingContext(tx, organizationId, input.fiscalYearId, postingDate);
    const values = await normalizeLines(tx, organizationId, precision, input.lines);
    await tx.journalLine.deleteMany({ where: { entryId, organizationId } });
    await tx.journalLine.createMany({ data: values.normalized.map(line => ({ ...line, entryId })) });
    await attachEvidence(tx, organizationId, entryId, { ...input, idempotencyKey: before.idempotencyKey });
    const updated = await tx.journalEntry.update({ where: { id: entryId }, data: { fiscalYearId: input.fiscalYearId, periodId: period.id, reference: input.reference.trim().slice(0, 80), description: input.description.trim().slice(0, 500), transactionDate, postingDate, currency, currencyPrecision: precision, sourceType: input.sourceType ?? before.sourceType, sourceReference: input.sourceReference?.trim().slice(0, 160) || null, sourceRevision: input.sourceRevision?.trim().slice(0, 80) || null, evidenceTimestamp: input.evidenceTimestamp ? new Date(input.evidenceTimestamp) : null, totalDebit: values.debit, totalCredit: values.credit, status: "DRAFT", rejectionReason: null, rejectedAt: null, rejectedById: null, revision: { increment: 1 } } });
    await event(tx, { organizationId, entryId, actor, action: "JOURNAL_DRAFT_UPDATED", fromStatus: before.status, toStatus: "DRAFT", metadata: { balanced: values.balanced, revision: updated.revision }, request });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function listJournalEntries(organizationId: string, filters: { status?: string; fiscalYearId?: string; search?: string; page?: number } = {}) {
  const page = Math.max(1, Math.min(filters.page ?? 1, 10000));
  const statuses: JournalEntryStatus[] = ["DRAFT", "SUBMITTED", "APPROVED", "POSTED", "REJECTED", "REVERSED"];
  const where: Prisma.JournalEntryWhereInput = { organizationId, ...(statuses.includes(filters.status as JournalEntryStatus) ? { status: filters.status as JournalEntryStatus } : {}), ...(filters.fiscalYearId ? { fiscalYearId: filters.fiscalYearId } : {}), ...(filters.search ? { OR: [{ reference: { contains: filters.search.slice(0, 80), mode: "insensitive" } }, { description: { contains: filters.search.slice(0, 120), mode: "insensitive" } }] } : {}) };
  const [total, entries, fiscalYears, groups] = await Promise.all([
    db.journalEntry.count({ where }),
    db.journalEntry.findMany({ where, orderBy: [{ postingDate: "desc" }, { createdAt: "desc" }], skip: (page - 1) * 25, take: 25, include: { _count: { select: { lines: true, evidenceLinks: true } } } }),
    db.companyFiscalYear.findMany({ where: { organizationId }, orderBy: { startsAt: "desc" }, select: { id: true, name: true, startsAt: true, endsAt: true, isClosed: true } }),
    db.journalEntry.groupBy({ by: ["status"], where: { organizationId }, _count: { _all: true } }),
  ]);
  return { total, page, pages: Math.max(1, Math.ceil(total / 25)), entries, fiscalYears, counts: Object.fromEntries(groups.map(group => [group.status, group._count._all])) };
}

export async function journalEntryDetail(organizationId: string, entryId: string) {
  const entry = await db.journalEntry.findFirst({ where: { id: entryId, organizationId }, include: { fiscalYear: { select: { name: true, startsAt: true, endsAt: true } }, period: { select: { name: true, status: true } }, lines: { orderBy: { lineNumber: "asc" }, include: { account: { select: { code: true, nameAr: true, normalBalance: true } }, evidenceLinks: true } }, events: { orderBy: { createdAt: "asc" } }, evidenceLinks: true, reversal: { select: { id: true, reference: true, status: true } }, reversalOf: { select: { id: true, reference: true, status: true } }, correction: { select: { id: true, reference: true, status: true } }, correctionOf: { select: { id: true, reference: true, status: true } }, openingBalanceBatch: { select: { id: true, revision: true, status: true } } } });
  if (!entry) throw new JournalError("القيد غير موجود.", 404);
  const actorIds = Array.from(new Set([entry.createdById, entry.submittedById, entry.approvedById, entry.postedById, entry.rejectedById, ...entry.events.map(item => item.actorUserId)].filter((value): value is string => Boolean(value))));
  const actors = await db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, displayName: true } });
  return { ...entry, actors: Object.fromEntries(actors.map(actor => [actor.id, actor.displayName])) };
}

async function assertBalancedEntry(tx: Tx, organizationId: string, entry: { id: string; fiscalYearId: string; postingDate: Date; currencyPrecision: number }) {
  await accountingContext(tx, organizationId, entry.fiscalYearId, entry.postingDate);
  const documents = await tx.journalEvidenceLink.findMany({ where: { organizationId, entryId: entry.id, documentId: { not: null } }, select: { document: { select: { deletedAt: true, fileAsset: { select: { scanStatus: true, sha256: true, scannedSha256: true, releaseKey: true, scanValidUntil: true, deletedAt: true } } } } } });
  if (documents.some(link => !link.document || link.document.deletedAt || !documentIsClean(link.document.fileAsset))) throw new JournalError("أحد مستندات الإثبات غير متاح أو لم يعد يحمل فحص أمان صالحًا.", 409);
  const lines = await tx.journalLine.findMany({ where: { entryId: entry.id, organizationId }, orderBy: { lineNumber: "asc" } });
  const values = await normalizeLines(tx, organizationId, entry.currencyPrecision, lines.map(line => ({ accountId: line.accountId, debit: line.debit.toString(), credit: line.credit.toString(), description: line.description ?? undefined, sourceReference: line.sourceReference ?? undefined })));
  if (!values.balanced) throw new JournalError("القيد غير متوازن؛ يجب أن يتساوى إجمالي المدين والدائن.", 409);
  return values;
}

async function nextEntryNumber(tx: Tx, organizationId: string) {
  const rows = await tx.$queryRaw<Array<{ next: bigint }>>`SELECT COALESCE(MAX("entryNumber"), 0)::bigint + 1 AS "next" FROM "JournalEntry" WHERE "organizationId" = ${organizationId}::uuid`;
  const value = Number(rows[0]?.next ?? BigInt(1));
  if (!Number.isSafeInteger(value)) throw new JournalError("تسلسل القيود تجاوز الحد الآمن.", 500);
  return value;
}

async function postApprovedEntry(tx: Tx, organizationId: string, entry: Awaited<ReturnType<Tx["journalEntry"]["findFirst"]>> & { id: string }, actor: JournalActor, request?: Request) {
  const values = await assertBalancedEntry(tx, organizationId, entry);
  const number = await nextEntryNumber(tx, organizationId);
  const posted = await tx.journalEntry.update({ where: { id: entry.id }, data: { status: "POSTED", entryNumber: number, postedById: actor.id, postedAt: new Date(), totalDebit: values.debit, totalCredit: values.credit, revision: { increment: 1 } } });
  await event(tx, { organizationId, entryId: entry.id, actor, action: "JOURNAL_POSTED", fromStatus: entry.status, toStatus: "POSTED", metadata: { entryNumber: number, debit: values.debit, credit: values.credit }, request });
  if (entry.reversalOfId) {
    await tx.journalEntry.update({ where: { id: entry.reversalOfId }, data: { status: "REVERSED", revision: { increment: 1 } } });
    await event(tx, { organizationId, entryId: entry.reversalOfId, actor, action: "JOURNAL_REVERSED", fromStatus: "POSTED", toStatus: "REVERSED", metadata: { reversalEntryId: entry.id }, request });
  }
  return posted;
}

export async function actOnJournalEntry(organizationId: string, entryId: string, actor: JournalActor, input: { action: "SUBMIT" | "APPROVE" | "POST" | "REJECT"; revision: number; reason?: string }, request?: Request) {
  return db.$transaction(async tx => {
    await lockCompany(tx, organizationId); await lockEntry(tx, organizationId, entryId);
    const entry = await tx.journalEntry.findFirst({ where: { id: entryId, organizationId } });
    if (!entry) throw new JournalError("القيد غير موجود.", 404);
    if (entry.revision !== input.revision) throw new JournalError("تغير القيد. حدّث الصفحة قبل المتابعة.", 409);
    if (input.action === "SUBMIT") {
      if (entry.status !== "DRAFT" && entry.status !== "REJECTED") throw new JournalError("يمكن تقديم المسودة أو القيد المرفوض فقط.", 409);
      const values = await assertBalancedEntry(tx, organizationId, entry);
      const updated = await tx.journalEntry.update({ where: { id: entry.id }, data: { status: "SUBMITTED", submittedById: actor.id, submittedAt: new Date(), rejectionReason: null, rejectedById: null, rejectedAt: null, totalDebit: values.debit, totalCredit: values.credit, revision: { increment: 1 } } });
      await event(tx, { organizationId, entryId, actor, action: "JOURNAL_SUBMITTED", fromStatus: entry.status, toStatus: "SUBMITTED", request });
      return updated;
    }
    if (input.action === "REJECT") {
      if (entry.status !== "SUBMITTED") throw new JournalError("القيد ليس بانتظار المراجعة.", 409);
      if (!input.reason?.trim() || input.reason.trim().length < 10) throw new JournalError("سبب الرفض مطلوب بوضوح.");
      if (actor.id === entry.createdById || actor.id === entry.submittedById) throw new JournalError("لا يمكن لمُعدّ القيد مراجعته.", 403);
      const updated = await tx.journalEntry.update({ where: { id: entry.id }, data: { status: "REJECTED", rejectedById: actor.id, rejectedAt: new Date(), rejectionReason: input.reason.trim().slice(0, 500), revision: { increment: 1 } } });
      await event(tx, { organizationId, entryId, actor, action: "JOURNAL_REJECTED", fromStatus: "SUBMITTED", toStatus: "REJECTED", reason: input.reason, request });
      return updated;
    }
    if (input.action === "APPROVE") {
      if (entry.status !== "SUBMITTED") throw new JournalError("القيد ليس بانتظار الاعتماد.", 409);
      if (actor.id === entry.createdById || actor.id === entry.submittedById) throw new JournalError("لا يمكن لمُعدّ القيد اعتماده بنفسه.", 403);
      await assertBalancedEntry(tx, organizationId, entry);
      const updated = await tx.journalEntry.update({ where: { id: entry.id }, data: { status: "APPROVED", approvedById: actor.id, approvedAt: new Date(), revision: { increment: 1 } } });
      await event(tx, { organizationId, entryId, actor, action: "JOURNAL_APPROVED", fromStatus: "SUBMITTED", toStatus: "APPROVED", request });
      return updated;
    }
    if (entry.status !== "APPROVED") throw new JournalError("القيد غير معتمد للترحيل.", 409);
    if (actor.id === entry.createdById || actor.id === entry.submittedById) throw new JournalError("لا يمكن لمُعدّ القيد ترحيله بنفسه.", 403);
    return postApprovedEntry(tx, organizationId, entry, actor, request);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function createReversalDraft(organizationId: string, entryId: string, actor: JournalActor, input: { postingDate: string; idempotencyKey: string; reason: string }, request?: Request) {
  return db.$transaction(async tx => {
    await lockCompany(tx, organizationId); await lockEntry(tx, organizationId, entryId);
    const original = await tx.journalEntry.findFirst({ where: { id: entryId, organizationId }, include: { lines: { orderBy: { lineNumber: "asc" } }, reversal: true } });
    if (!original) throw new JournalError("القيد الأصلي غير موجود.", 404);
    if (original.reversal) return { entry: original.reversal, duplicate: true };
    if (original.status !== "POSTED") throw new JournalError("يمكن عكس قيد مرحل فقط.", 409);
    if (input.reason.trim().length < 10) throw new JournalError("سبب العكس مطلوب بوضوح.");
    const postingDate = dateOnly(input.postingDate); const { period } = await accountingContext(tx, organizationId, original.fiscalYearId, postingDate);
    const entry = await tx.journalEntry.create({ data: { organizationId, fiscalYearId: original.fiscalYearId, periodId: period.id, reference: `REV-${original.reference}`.slice(0, 80), description: `عكس القيد ${original.reference}: ${input.reason.trim()}`.slice(0, 500), transactionDate: postingDate, postingDate, currency: original.currency, currencyPrecision: original.currencyPrecision, entryType: "REVERSAL", sourceType: original.sourceType, sourceReference: original.sourceReference, sourceRevision: String(original.revision), evidenceTimestamp: new Date(), idempotencyKey: input.idempotencyKey, totalDebit: original.totalCredit, totalCredit: original.totalDebit, createdById: actor.id, reversalOfId: original.id } });
    await tx.journalLine.createMany({ data: original.lines.map(line => ({ organizationId, entryId: entry.id, accountId: line.accountId, lineNumber: line.lineNumber, debit: line.credit, credit: line.debit, description: `عكس: ${line.description ?? original.description}`.slice(0, 500), sourceReference: line.sourceReference })) });
    await event(tx, { organizationId, entryId: entry.id, actor, action: "JOURNAL_REVERSAL_DRAFT_CREATED", toStatus: "DRAFT", reason: input.reason, metadata: { originalEntryId: original.id }, request });
    return { entry, duplicate: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function createCorrectionDraft(organizationId: string, entryId: string, actor: JournalActor, idempotencyKey: string, request?: Request) {
  return db.$transaction(async tx => {
    await lockCompany(tx, organizationId); await lockEntry(tx, organizationId, entryId);
    const original = await tx.journalEntry.findFirst({ where: { id: entryId, organizationId }, include: { lines: { orderBy: { lineNumber: "asc" } }, correction: true } });
    if (!original) throw new JournalError("القيد الأصلي غير موجود.", 404);
    if (original.correction) return { entry: original.correction, duplicate: true };
    if (original.status !== "REVERSED") throw new JournalError("أنشئ وارحل قيد العكس قبل إنشاء التصحيح.", 409);
    const { period } = await accountingContext(tx, organizationId, original.fiscalYearId, original.postingDate);
    const entry = await tx.journalEntry.create({ data: { organizationId, fiscalYearId: original.fiscalYearId, periodId: period.id, reference: `COR-${original.reference}`.slice(0, 80), description: `تصحيح القيد ${original.reference}`.slice(0, 500), transactionDate: original.transactionDate, postingDate: original.postingDate, currency: original.currency, currencyPrecision: original.currencyPrecision, entryType: "CORRECTION", sourceType: original.sourceType, sourceReference: original.sourceReference, sourceRevision: String(original.revision), evidenceTimestamp: new Date(), idempotencyKey, totalDebit: original.totalDebit, totalCredit: original.totalCredit, createdById: actor.id, correctionOfId: original.id } });
    await tx.journalLine.createMany({ data: original.lines.map(line => ({ organizationId, entryId: entry.id, accountId: line.accountId, lineNumber: line.lineNumber, debit: line.debit, credit: line.credit, description: line.description, sourceReference: line.sourceReference })) });
    await event(tx, { organizationId, entryId: entry.id, actor, action: "JOURNAL_CORRECTION_DRAFT_CREATED", toStatus: "DRAFT", metadata: { originalEntryId: original.id }, request });
    return { entry, duplicate: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function createAndPostAutomaticReversal(tx: Tx, organizationId: string, originalId: string, actor: JournalActor, idempotencyKey: string, reason: string, request?: Request) {
  const original = await tx.journalEntry.findFirst({ where: { id: originalId, organizationId }, include: { lines: { orderBy: { lineNumber: "asc" } }, reversal: true } });
  if (!original || original.status === "REVERSED") return original?.reversal ?? null;
  if (original.status !== "POSTED") throw new JournalError("قيد الافتتاح السابق ليس في حالة تسمح بالعكس.", 409);
  const entry = await tx.journalEntry.create({ data: { organizationId, fiscalYearId: original.fiscalYearId, periodId: original.periodId, reference: `REV-${original.reference}`.slice(0, 80), description: reason.slice(0, 500), transactionDate: original.transactionDate, postingDate: original.postingDate, currency: original.currency, currencyPrecision: original.currencyPrecision, entryType: "REVERSAL", sourceType: "OPENING_BALANCE", sourceReference: original.sourceReference, sourceRevision: String(original.revision), evidenceTimestamp: new Date(), idempotencyKey, status: "APPROVED", totalDebit: original.totalCredit, totalCredit: original.totalDebit, createdById: actor.id, submittedById: actor.id, submittedAt: new Date(), approvedById: actor.id, approvedAt: new Date(), reversalOfId: original.id } });
  await tx.journalLine.createMany({ data: original.lines.map(line => ({ organizationId, entryId: entry.id, accountId: line.accountId, lineNumber: line.lineNumber, debit: line.credit, credit: line.debit, description: `عكس رصيد افتتاحي: ${line.description ?? original.description}`.slice(0, 500), sourceReference: line.sourceReference })) });
  await event(tx, { organizationId, entryId: entry.id, actor, action: "OPENING_REVERSAL_APPROVED", toStatus: "APPROVED", metadata: { originalEntryId: original.id }, request });
  return postApprovedEntry(tx, organizationId, entry, actor, request);
}

export async function postApprovedOpeningBalance(organizationId: string, batchId: string, actor: JournalActor, idempotencyKey: string, request?: Request) {
  return db.$transaction(async tx => {
    await lockCompany(tx, organizationId);
    await tx.$queryRaw`SELECT "id" FROM "OpeningBalanceBatch" WHERE "id" = ${batchId}::uuid AND "organizationId" = ${organizationId}::uuid FOR UPDATE`;
    const existing = await tx.journalEntry.findFirst({ where: { organizationId, openingBalanceBatchId: batchId } });
    if (existing) return { entry: existing, duplicate: true };
    const batch = await tx.openingBalanceBatch.findFirst({ where: { id: batchId, organizationId }, include: { lines: { orderBy: { accountCode: "asc" } } } });
    if (!batch) throw new JournalError("دفعة الأرصدة غير موجودة.", 404);
    if (batch.status !== "APPROVED" || !batch.approvedAt) throw new JournalError("يجب اعتماد أرصدة أول المدة قبل ترحيلها.", 409);
    if (actor.id === batch.createdById || actor.id === batch.submittedById) throw new JournalError("لا يمكن لمُعدّ أرصدة أول المدة ترحيلها بنفسه.", 403);
    const { period } = await accountingContext(tx, organizationId, batch.fiscalYearId, batch.openingDate);
    const values = await normalizeLines(tx, organizationId, batch.currencyPrecision, batch.lines.map(line => ({ accountId: line.accountId, debit: line.debit.toString(), credit: line.credit.toString(), description: line.explanation ?? `رصيد افتتاحي ${line.accountCode}`, sourceReference: line.sourceReference ?? undefined })));
    if (!values.balanced) throw new JournalError("دفعة أرصدة أول المدة المعتمدة غير متوازنة.", 409);
    if (batch.correctionOfId) {
      const previous = await tx.journalEntry.findFirst({ where: { organizationId, openingBalanceBatchId: batch.correctionOfId } });
      if (previous) await createAndPostAutomaticReversal(tx, organizationId, previous.id, actor, `opening-reversal:${batch.id}:${previous.id}`, `عكس قيد الافتتاح السابق بسبب اعتماد التصحيح ${batch.id}`, request);
    }
    const entry = await tx.journalEntry.create({ data: { organizationId, fiscalYearId: batch.fiscalYearId, periodId: period.id, reference: `OPEN-${batch.id.slice(0, 8).toUpperCase()}`, description: `ترحيل أرصدة أول المدة المعتمدة · نسخة ${batch.revision}`, transactionDate: batch.openingDate, postingDate: batch.openingDate, currency: batch.baseCurrency, currencyPrecision: batch.currencyPrecision, entryType: "OPENING", sourceType: "OPENING_BALANCE", sourceReference: batch.id, sourceRevision: String(batch.revision), evidenceTimestamp: batch.approvedAt, idempotencyKey, status: "APPROVED", totalDebit: values.debit, totalCredit: values.credit, createdById: actor.id, submittedById: actor.id, submittedAt: new Date(), approvedById: actor.id, approvedAt: new Date(), openingBalanceBatchId: batch.id } });
    await tx.journalLine.createMany({ data: values.normalized.map(line => ({ ...line, entryId: entry.id })) });
    await tx.journalEvidenceLink.create({ data: { organizationId, entryId: entry.id, sourceType: "OPENING_BALANCE", sourceId: batch.id, sourceRevision: String(batch.revision), evidenceAt: batch.approvedAt, metadata: { approvedSnapshot: true } } });
    await event(tx, { organizationId, entryId: entry.id, actor, action: "OPENING_JOURNAL_APPROVED", toStatus: "APPROVED", metadata: { batchId: batch.id, batchRevision: batch.revision }, request });
    const posted = await postApprovedEntry(tx, organizationId, entry, actor, request);
    return { entry: posted, duplicate: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 });
}

async function periodCounts(tx: Tx | typeof db, organizationId: string, periodId: string) {
  const groups = await tx.journalEntry.groupBy({ by: ["status"], where: { organizationId, periodId }, _count: { _all: true } });
  const counts = Object.fromEntries(groups.map(group => [group.status, group._count._all])) as Partial<Record<JournalEntryStatus, number>>;
  return {
    draft: counts.DRAFT ?? 0,
    submitted: counts.SUBMITTED ?? 0,
    approved: counts.APPROVED ?? 0,
    rejected: counts.REJECTED ?? 0,
    posted: counts.POSTED ?? 0,
    reversed: counts.REVERSED ?? 0,
  };
}

export async function accountingPeriodsOverview(organizationId: string, fiscalYearId?: string) {
  return db.$transaction(async tx => {
    await lockCompany(tx, organizationId);
    const fiscalYears = await tx.companyFiscalYear.findMany({ where: { organizationId }, orderBy: { startsAt: "desc" }, select: { id: true, name: true, startsAt: true, endsAt: true, isClosed: true } });
    const selected = fiscalYears.find(year => year.id === fiscalYearId) ?? fiscalYears[0];
    if (!selected) return { fiscalYears, selectedFiscalYearId: null, periods: [] };
    if (fiscalYearId && selected.id !== fiscalYearId) throw new JournalError("السنة المالية غير موجودة.", 404);
    const periods = await ensureFiscalPeriods(tx, organizationId, selected);
    const actors = await tx.user.findMany({ where: { id: { in: periods.flatMap(period => period.closedById ? [period.closedById] : []) } }, select: { id: true, displayName: true } });
    const actorNames = new Map(actors.map(actor => [actor.id, actor.displayName]));
    const rows = await Promise.all(periods.map(async period => ({
      ...period,
      closedByName: period.closedById ? actorNames.get(period.closedById) ?? "مستخدم سابق" : null,
      counts: await periodCounts(tx, organizationId, period.id),
    })));
    return { fiscalYears, selectedFiscalYearId: selected.id, periods: rows };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function closeAccountingPeriod(organizationId: string, periodId: string, actor: JournalActor, confirmation: string, request?: Request) {
  return db.$transaction(async tx => {
    await lockCompany(tx, organizationId);
    const period = await tx.accountingPeriod.findFirst({ where: { id: periodId, organizationId } });
    if (!period) throw new JournalError("الفترة غير موجودة.", 404);
    if (period.status === "CLOSED") return period;
    if (confirmation !== period.name) throw new JournalError("اكتب اسم الفترة كما يظهر لتأكيد الإغلاق.", 400);
    const counts = await periodCounts(tx, organizationId, periodId);
    if (counts.submitted || counts.approved) throw new JournalError("لا يمكن إغلاق فترة تحتوي قيودًا بانتظار الاعتماد أو الترحيل.", 409);
    const updated = await tx.accountingPeriod.update({ where: { id: periodId }, data: { status: "CLOSED", closedById: actor.id, closedAt: new Date() } });
    await tx.auditEvent.create({ data: { organizationId, actorUserId: actor.id, action: "ACCOUNTING_PERIOD_CLOSED", entityType: "AccountingPeriod", entityId: periodId, metadata: { name: period.name, startsAt: dateKey(period.startsAt), endsAt: dateKey(period.endsAt), counts, warning: "Period closure prevents posting; it is not a representation of IFRS completeness." }, ipAddress: request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: request?.headers.get("user-agent") ?? null } });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
