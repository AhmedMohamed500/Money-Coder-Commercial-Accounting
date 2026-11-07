import { randomUUID } from "node:crypto";
import { Prisma, type OpeningBalanceBatch } from "@prisma/client";
import { db } from "@/lib/db";
import { currencyPrecision, openingTotals, validateSides } from "./opening-money";
import type { StagedOpeningRow, ColumnMap } from "./opening-excel";

type Tx = Prisma.TransactionClient;
type Actor = { id: string; displayName: string };
type Issue = { code: string; message: string; accountId?: string };
const requestIds = new WeakMap<Request, string>();

export class OpeningError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

async function lockCompany(tx: Tx, organizationId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string; type: string; deletedAt: Date | null }>>`SELECT "id", "type", "deletedAt" FROM "Organization" WHERE "id" = ${organizationId}::uuid FOR UPDATE`;
  if (rows.length !== 1 || rows[0].type !== "COMMERCIAL_COMPANY" || rows[0].deletedAt) throw new OpeningError("الشركة غير موجودة.", 404);
}

async function audit(tx: Tx, organizationId: string, actor: Actor, action: string, batchId: string, metadata: Record<string, unknown> = {}, request?: Request) {
  if (request && !requestIds.has(request)) requestIds.set(request, randomUUID());
  await tx.auditEvent.create({ data: {
    organizationId, actorUserId: actor.id, action, entityType: "OpeningBalanceBatch", entityId: batchId,
    metadata: { ...metadata, actorName: actor.displayName, requestId: request ? requestIds.get(request) : randomUUID() } as Prisma.InputJsonValue,
    ipAddress: request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request?.headers.get("user-agent") ?? null,
  } });
}

async function editableBatch(tx: Tx, organizationId: string, batchId: string, revision: number) {
  const batch = await tx.openingBalanceBatch.findFirst({ where: { id: batchId, organizationId }, include: { fiscalYear: true } });
  if (!batch) throw new OpeningError("دفعة الأرصدة غير موجودة.", 404);
  if (batch.revision !== revision) throw new OpeningError("تغيرت الدفعة في جلسة أخرى. حدّث الصفحة قبل الحفظ.", 409);
  if (batch.status !== "DRAFT" && batch.status !== "REJECTED") throw new OpeningError("الدفعة مقدمة للمراجعة أو مقفلة.", 409);
  if (batch.fiscalYear.isClosed) throw new OpeningError("السنة المالية مغلقة.", 409);
  return batch;
}

export async function openingOverview(organizationId: string) {
  const [company, settings, fiscalYears, installation, batches] = await Promise.all([
    db.organization.findFirst({ where: { id: organizationId, type: "COMMERCIAL_COMPANY", deletedAt: null }, select: { id: true, legalName: true, tradeName: true } }),
    db.companyAccountingSettings.findUnique({ where: { organizationId }, select: { baseCurrency: true, openingBalanceDate: true, businessActivity: true } }),
    db.companyFiscalYear.findMany({ where: { organizationId }, orderBy: { startsAt: "desc" }, select: { id: true, name: true, startsAt: true, endsAt: true, isClosed: true } }),
    db.chartInstallation.findUnique({ where: { organizationId }, select: { activity: true, templateVersion: true } }),
    db.openingBalanceBatch.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, select: { id: true, fiscalYearId: true, status: true, openingDate: true, baseCurrency: true, revision: true, createdAt: true, submittedAt: true, approvedAt: true, correctionOfId: true } }),
  ]);
  if (!company) throw new OpeningError("الشركة غير موجودة.", 404);
  return { company, settings, fiscalYears, installation, batches };
}

export async function openingBatchDetail(organizationId: string, batchId: string) {
  const batch = await db.openingBalanceBatch.findFirst({
    where: { id: batchId, organizationId },
    include: { fiscalYear: { select: { id: true, name: true, startsAt: true, endsAt: true, isClosed: true } }, lines: { orderBy: { accountCode: "asc" } }, imports: { orderBy: { createdAt: "desc" }, select: { id: true, originalName: true, fileSha256: true, rowCount: true, rows: true, status: true, expiresAt: true, createdAt: true } } },
  });
  if (!batch) throw new OpeningError("دفعة الأرصدة غير موجودة.", 404);
  const accounts = await db.chartAccount.findMany({ where: { organizationId, deletedAt: null, isPostable: true }, orderBy: { code: "asc" }, select: { id: true, code: true, nameAr: true, accountClass: true, reportGroup: true, normalBalance: true, isContra: true, isActive: true, inventoryMethod: true } });
  const validation = await validateOpeningBatch(db, batch);
  return { batch, accounts, validation };
}

export async function createOpeningBatch(organizationId: string, actor: Actor, fiscalYearId: string, correctionOfId?: string, correctionReason?: string, request?: Request) {
  return db.$transaction(async tx => {
    await lockCompany(tx, organizationId);
    const [year, settings, installation, existing] = await Promise.all([
      tx.companyFiscalYear.findFirst({ where: { id: fiscalYearId, organizationId } }),
      tx.companyAccountingSettings.findUnique({ where: { organizationId } }),
      tx.chartInstallation.findUnique({ where: { organizationId } }),
      tx.openingBalanceBatch.findMany({ where: { organizationId, fiscalYearId, status: { in: ["DRAFT", "REJECTED", "SUBMITTED", "APPROVED"] } }, orderBy: { createdAt: "desc" } }),
    ]);
    if (!year || year.isClosed) throw new OpeningError("اختر سنة مالية مفتوحة ومسجلة لهذه الشركة.", 409);
    if (!settings || !/^[A-Z]{3}$/.test(settings.baseCurrency)) throw new OpeningError("أكمل إعداد العملة الأساسية للشركة.", 409);
    if (!installation || installation.activity !== "COMMERCIAL" || settings.businessActivity !== "COMMERCIAL") throw new OpeningError("يلزم دليل حسابات تجاري مهيأ لهذه الشركة.", 409);
    const prior = existing.find(item => item.status === "APPROVED");
    const pending = existing.find(item => item.status === "DRAFT" || item.status === "REJECTED" || item.status === "SUBMITTED");
    if (pending) {
      if (pending.status === "SUBMITTED") throw new OpeningError("توجد دفعة مقدمة للمراجعة لهذه السنة.", 409);
      if (!correctionOfId && !prior) return { batch: pending, reopened: true };
      throw new OpeningError("توجد مسودة قائمة لهذه السنة. افتحها قبل إنشاء مسودة أخرى.", 409);
    }
    if (prior && (!correctionOfId || correctionOfId !== prior.id || !correctionReason?.trim() || correctionReason.trim().length < 10)) throw new OpeningError("تصحيح الرصيد المعتمد يتطلب تحديد النسخة السابقة وسببًا واضحًا.", 409);
    if (!prior && correctionOfId) throw new OpeningError("لا توجد نسخة معتمدة لتصحيحها.", 409);
    const openingDate = settings.openingBalanceDate ?? year.startsAt;
    if (openingDate < year.startsAt || openingDate > year.endsAt) throw new OpeningError("تاريخ أرصدة أول المدة خارج السنة المالية.", 409);
    const batch = await tx.openingBalanceBatch.create({ data: { organizationId, fiscalYearId, openingDate, baseCurrency: settings.baseCurrency, currencyPrecision: currencyPrecision(settings.baseCurrency), createdById: actor.id, correctionOfId: prior?.id ?? null, correctionReason: prior ? correctionReason!.trim() : null } });
    if (prior) {
      const previousLines = await tx.openingBalanceLine.findMany({ where: { batchId: prior.id, organizationId } });
      if (previousLines.length) await tx.openingBalanceLine.createMany({ data: previousLines.map(line => ({ organizationId, batchId: batch.id, accountId: line.accountId, accountCode: line.accountCode, accountNameAr: line.accountNameAr, accountClass: line.accountClass, normalBalance: line.normalBalance, debit: line.debit, credit: line.credit, explanation: line.explanation, sourceReference: line.sourceReference })) });
      await audit(tx, organizationId, actor, "OPENING_CORRECTION_REQUESTED", batch.id, { previousBatchId: prior.id, reason: correctionReason!.trim() }, request);
    }
    await audit(tx, organizationId, actor, "OPENING_DRAFT_CREATED", batch.id, { fiscalYearId, openingDate: openingDate.toISOString(), currency: settings.baseCurrency }, request);
    return { batch, reopened: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function saveOpeningLine(organizationId: string, batchId: string, actor: Actor, input: { revision: number; accountId: string; debit: string; credit: string; explanation?: string; sourceReference?: string }, request?: Request) {
  return db.$transaction(async tx => {
    await lockCompany(tx, organizationId);
    const batch = await editableBatch(tx, organizationId, batchId, input.revision);
    const account = await tx.chartAccount.findFirst({ where: { id: input.accountId, organizationId, deletedAt: null, isPostable: true, isActive: true } });
    if (!account) throw new OpeningError("الحساب غير موجود أو غير قابل لإدخال رصيد.", 400);
    const values = validateSides(input.debit, input.credit, batch.currencyPrecision);
    const before = await tx.openingBalanceLine.findUnique({ where: { batchId_accountId: { batchId, accountId: account.id } } });
    const reason = input.explanation?.trim().slice(0, 500) || null;
    const sourceReference = input.sourceReference?.trim().slice(0, 120) || null;
    if ((!before && values.empty) || (before && before.debit.equals(values.debit) && before.credit.equals(values.credit) && before.explanation === reason && before.sourceReference === sourceReference)) return { revision: batch.revision, changed: false };
    if (values.empty) {
      if (before) await tx.openingBalanceLine.delete({ where: { id: before.id } });
    } else {
      await tx.openingBalanceLine.upsert({ where: { batchId_accountId: { batchId, accountId: account.id } }, create: { organizationId, batchId, accountId: account.id, accountCode: account.code, accountNameAr: account.nameAr, accountClass: account.accountClass, normalBalance: account.normalBalance, debit: values.debit, credit: values.credit, explanation: reason, sourceReference }, update: { debit: values.debit, credit: values.credit, explanation: reason, sourceReference } });
    }
    const updated = await tx.openingBalanceBatch.update({ where: { id: batchId }, data: { revision: { increment: 1 }, status: "DRAFT", reviewedAt: null, reviewedById: null, rejectionReason: null } });
    await audit(tx, organizationId, actor, values.empty ? "OPENING_LINE_REMOVED" : before ? "OPENING_LINE_EDITED" : "OPENING_LINE_ADDED", batchId, { accountId: account.id, accountCode: account.code, previous: before ? { debit: before.debit.toString(), credit: before.credit.toString(), explanation: before.explanation, sourceReference: before.sourceReference } : null, next: values.empty ? null : { debit: values.debit, credit: values.credit, explanation: reason, sourceReference } }, request);
    return { revision: updated.revision, changed: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function validateOpeningBatch(tx: Tx | typeof db, batch: OpeningBalanceBatch): Promise<{ issues: Issue[]; totals: ReturnType<typeof openingTotals>; lineCount: number }> {
  const [year, settings, installation, lines, authoritative] = await Promise.all([
    tx.companyFiscalYear.findFirst({ where: { id: batch.fiscalYearId, organizationId: batch.organizationId } }),
    tx.companyAccountingSettings.findUnique({ where: { organizationId: batch.organizationId } }),
    tx.chartInstallation.findUnique({ where: { organizationId: batch.organizationId } }),
    tx.openingBalanceLine.findMany({ where: { batchId: batch.id, organizationId: batch.organizationId }, include: { account: true } }),
    tx.openingBalanceBatch.findFirst({ where: { organizationId: batch.organizationId, fiscalYearId: batch.fiscalYearId, status: "APPROVED" } }),
  ]);
  const issues: Issue[] = [];
  if (!year) issues.push({ code: "YEAR_MISSING", message: "السنة المالية غير موجودة." });
  else {
    if (year.isClosed) issues.push({ code: "YEAR_CLOSED", message: "السنة المالية مغلقة." });
    if (batch.openingDate < year.startsAt || batch.openingDate > year.endsAt) issues.push({ code: "DATE_OUTSIDE_YEAR", message: "تاريخ الافتتاح خارج السنة المالية." });
  }
  if (!settings || settings.baseCurrency !== batch.baseCurrency || currencyPrecision(batch.baseCurrency) !== batch.currencyPrecision) issues.push({ code: "CURRENCY_CHANGED", message: "عملة الدفعة أو دقتها لا تطابق إعداد الشركة." });
  if (!installation || installation.activity !== "COMMERCIAL") issues.push({ code: "CHART_MISSING", message: "دليل الحسابات التجاري غير مهيأ." });
  if (authoritative && authoritative.id !== batch.id && authoritative.id !== batch.correctionOfId) issues.push({ code: "APPROVED_EXISTS", message: "توجد نسخة معتمدة أخرى لهذه السنة." });
  if (batch.correctionOfId && (!authoritative || authoritative.id !== batch.correctionOfId)) issues.push({ code: "CORRECTION_STALE", message: "نسخة التصحيح لم تعد هي المعتمدة حاليًا." });
  if (!lines.length) issues.push({ code: "EMPTY", message: "أدخل رصيد حساب واحد على الأقل." });
  const seen = new Set<string>();
  for (const line of lines) {
    if (seen.has(line.accountId)) issues.push({ code: "DUPLICATE", message: `الحساب ${line.accountCode} مكرر.`, accountId: line.accountId });
    seen.add(line.accountId);
    if (line.account.organizationId !== batch.organizationId || !line.account.isPostable || !line.account.isActive || line.account.deletedAt) issues.push({ code: "ACCOUNT_INVALID", message: `الحساب ${line.accountCode} غير صالح للرصيد الافتتاحي.`, accountId: line.accountId });
    if (line.account.inventoryMethod && settings?.inventoryMethod !== line.account.inventoryMethod) issues.push({ code: "INVENTORY_POLICY", message: `الحساب ${line.accountCode} لا يطابق سياسة الجرد.`, accountId: line.accountId });
    try { validateSides(line.debit.toString(), line.credit.toString(), batch.currencyPrecision); }
    catch { issues.push({ code: "AMOUNT_INVALID", message: `مبلغ الحساب ${line.accountCode} غير صالح.`, accountId: line.accountId }); }
  }
  let totals = { debit: "0", credit: "0", difference: "0", balanced: true };
  try { totals = openingTotals(lines.map(line => ({ debit: line.debit.toString(), credit: line.credit.toString() })), batch.currencyPrecision); }
  catch { issues.push({ code: "AMOUNT_INVALID", message: "إحدى القيم المالية غير صالحة." }); }
  if (!totals.balanced) issues.push({ code: "UNBALANCED", message: "إجمالي المدين لا يساوي إجمالي الدائن." });
  return { issues, totals, lineCount: lines.length };
}

export async function actOnOpeningBatch(organizationId: string, batchId: string, actor: Actor, action: "VALIDATE" | "SUBMIT" | "REVIEW" | "APPROVE" | "REJECT", revision: number, reason?: string, request?: Request) {
  return db.$transaction(async tx => {
    await lockCompany(tx, organizationId);
    const batch = await tx.openingBalanceBatch.findFirst({ where: { id: batchId, organizationId } });
    if (!batch) throw new OpeningError("دفعة الأرصدة غير موجودة.", 404);
    if (batch.revision !== revision) throw new OpeningError("تغيرت الدفعة. حدّث الصفحة قبل المتابعة.", 409);
    const validation = await validateOpeningBatch(tx, batch);
    if (action === "VALIDATE") {
      await audit(tx, organizationId, actor, "OPENING_VALIDATION_COMPLETED", batchId, { issueCodes: validation.issues.map(item => item.code), totals: validation.totals }, request);
      return { batch, validation };
    }
    if (action === "SUBMIT") {
      if (batch.status !== "DRAFT" && batch.status !== "REJECTED") throw new OpeningError("يمكن تقديم المسودة أو الدفعة المرفوضة فقط.", 409);
      if (validation.issues.length) throw new OpeningError(validation.issues.map(item => item.message).join(" "), 409);
      const updated = await tx.openingBalanceBatch.update({ where: { id: batchId }, data: { status: "SUBMITTED", submittedAt: new Date(), submittedById: actor.id, reviewedAt: null, reviewedById: null, rejectionReason: null, revision: { increment: 1 } } });
      await audit(tx, organizationId, actor, "OPENING_SUBMITTED", batchId, { totals: validation.totals, revision: updated.revision }, request);
      return { batch: updated, validation };
    }
    if (batch.status !== "SUBMITTED") throw new OpeningError("هذه الدفعة ليست بانتظار المراجعة.", 409);
    if (actor.id === batch.createdById || actor.id === batch.submittedById) throw new OpeningError("لا يمكن لمُعدّ الدفعة مراجعتها أو اعتمادها بنفسه. عيّن مراجعًا آخر.", 403);
    if (action === "REVIEW") {
      const updated = await tx.openingBalanceBatch.update({ where: { id: batchId }, data: { reviewedById: actor.id, reviewedAt: new Date(), revision: { increment: 1 } } });
      await audit(tx, organizationId, actor, "OPENING_REVIEWED", batchId, { issueCodes: validation.issues.map(item => item.code) }, request);
      return { batch: updated, validation };
    }
    if (action === "REJECT") {
      if (!reason?.trim() || reason.trim().length < 10) throw new OpeningError("اكتب سبب رفض واضحًا من 10 أحرف على الأقل.");
      const updated = await tx.openingBalanceBatch.update({ where: { id: batchId }, data: { status: "REJECTED", reviewedById: actor.id, reviewedAt: new Date(), rejectionReason: reason.trim().slice(0, 500), revision: { increment: 1 } } });
      await audit(tx, organizationId, actor, "OPENING_REJECTED", batchId, { reason: reason.trim() }, request);
      return { batch: updated, validation };
    }
    if (validation.issues.length) throw new OpeningError(validation.issues.map(item => item.message).join(" "), 409);
    if (!batch.reviewedAt) throw new OpeningError("يلزم تسجيل المراجعة قبل الاعتماد.", 409);
    if (batch.correctionOfId) {
      const previous = await tx.openingBalanceBatch.findFirst({ where: { id: batch.correctionOfId, organizationId, fiscalYearId: batch.fiscalYearId, status: "APPROVED" } });
      if (!previous) throw new OpeningError("النسخة التي يجري تصحيحها لم تعد معتمدة.", 409);
      await tx.openingBalanceBatch.update({ where: { id: previous.id }, data: { status: "SUPERSEDED" } });
      await audit(tx, organizationId, actor, "OPENING_APPROVED_SNAPSHOT_SUPERSEDED", previous.id, { replacementBatchId: batchId }, request);
    }
    const updated = await tx.openingBalanceBatch.update({ where: { id: batchId }, data: { status: "APPROVED", approvedById: actor.id, approvedAt: new Date(), revision: { increment: 1 } } });
    await audit(tx, organizationId, actor, "OPENING_APPROVED_SNAPSHOT_LOCKED", batchId, { totals: validation.totals, fiscalYearId: batch.fiscalYearId, postingState: "NOT_POSTED" }, request);
    return { batch: updated, validation };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function openingAudit(organizationId: string, batchId: string) {
  const batch = await db.openingBalanceBatch.findFirst({ where: { id: batchId, organizationId }, select: { id: true } });
  if (!batch) throw new OpeningError("دفعة الأرصدة غير موجودة.", 404);
  return db.auditEvent.findMany({ where: { organizationId, entityType: "OpeningBalanceBatch", entityId: batchId, action: { startsWith: "OPENING_" } }, orderBy: { createdAt: "desc" }, take: 200, select: { id: true, action: true, actorUserId: true, createdAt: true, metadata: true } });
}

type RowIssue = { rowNumber: number; code: string; message: string };
export function reviewImportRows(rows: StagedOpeningRow[], accounts: Array<{ id: string; code: string; isPostable: boolean; isActive: boolean; deletedAt: Date | null; inventoryMethod: string | null }>, precision: number, inventoryMethod: string | null, mapping: Record<string, string> = {}) {
  const byCode = new Map(accounts.map(account => [account.code, account]));
  const byId = new Map(accounts.map(account => [account.id, account]));
  const issues: RowIssue[] = [];
  const resolved: Array<StagedOpeningRow & { accountId: string; debit: string; credit: string }> = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const account = mapping[String(row.rowNumber)] ? byId.get(mapping[String(row.rowNumber)]) : byCode.get(row.code);
    if (!row.code && !mapping[String(row.rowNumber)]) issues.push({ rowNumber: row.rowNumber, code: "MISSING_CODE", message: "كود الحساب مطلوب." });
    if (!account) issues.push({ rowNumber: row.rowNumber, code: "UNKNOWN_ACCOUNT", message: `كود الحساب ${row.code || "—"} غير معروف؛ اربطه بحساب موجود.` });
    else {
      if (!account.isPostable || !account.isActive || account.deletedAt) issues.push({ rowNumber: row.rowNumber, code: "ACCOUNT_INELIGIBLE", message: "الحساب غير نشط أو غير قابل للترحيل." });
      if (account.inventoryMethod && account.inventoryMethod !== inventoryMethod) issues.push({ rowNumber: row.rowNumber, code: "INVENTORY_POLICY", message: "الحساب لا يطابق سياسة جرد الشركة." });
      if (seen.has(account.id)) issues.push({ rowNumber: row.rowNumber, code: "DUPLICATE_ACCOUNT", message: "الحساب مكرر في الملف." });
      seen.add(account.id);
    }
    if (row.explanation.length > 500 || row.sourceReference.length > 120 || row.code.length > 24 || row.name.length > 180) issues.push({ rowNumber: row.rowNumber, code: "TEXT_TOO_LONG", message: "أحد حقول الصف أطول من المسموح." });
    try {
      const amounts = validateSides(row.debit, row.credit, precision);
      if (account && !amounts.empty) resolved.push({ ...row, accountId: account.id, debit: amounts.debit, credit: amounts.credit });
    } catch (error) { issues.push({ rowNumber: row.rowNumber, code: "INVALID_AMOUNT", message: error instanceof Error ? error.message : "مبلغ غير صالح." }); }
  }
  return { issues, resolved, rows: rows.length };
}

export async function stageOpeningImport(organizationId: string, batchId: string, actor: Actor, input: { revision: number; sha256: string; name: string; headers: string[]; columns: ColumnMap; rows: StagedOpeningRow[] }, request?: Request) {
  return db.$transaction(async tx => {
    await lockCompany(tx, organizationId);
    const batch = await editableBatch(tx, organizationId, batchId, input.revision);
    const prior = await tx.openingImportStage.findUnique({ where: { batchId_fileSha256: { batchId, fileSha256: input.sha256 } } });
    if (prior) throw new OpeningError("سبق رفع هذا الملف لهذه الدفعة. افتح المعاينة الموجودة أو استخدم ملفًا معدّلًا.", 409);
    const [accounts, settings] = await Promise.all([
      tx.chartAccount.findMany({ where: { organizationId }, select: { id: true, code: true, isPostable: true, isActive: true, deletedAt: true, inventoryMethod: true } }),
      tx.companyAccountingSettings.findUnique({ where: { organizationId }, select: { inventoryMethod: true } }),
    ]);
    const preview = reviewImportRows(input.rows, accounts, batch.currencyPrecision, settings?.inventoryMethod ?? null);
    const stage = await tx.openingImportStage.create({ data: {
      organizationId, batchId, fileSha256: input.sha256, originalName: input.name.slice(0, 180), createdById: actor.id,
      rowCount: input.rows.length, rows: { headers: input.headers, columns: input.columns, items: input.rows } as Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    } });
    await audit(tx, organizationId, actor, "OPENING_IMPORT_STAGED", batchId, { stageId: stage.id, fileSha256: input.sha256, rowCount: input.rows.length, issueCount: preview.issues.length }, request);
    return { stageId: stage.id, status: stage.status, expiresAt: stage.expiresAt, preview };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function applyOpeningImport(organizationId: string, batchId: string, stageId: string, actor: Actor, input: { revision: number; accountMapping: Record<string, string>; overwriteExisting: boolean; action: "APPLY" | "REJECT" }, request?: Request) {
  return db.$transaction(async tx => {
    await lockCompany(tx, organizationId);
    const batch = await editableBatch(tx, organizationId, batchId, input.revision);
    const stage = await tx.openingImportStage.findFirst({ where: { id: stageId, batchId, organizationId } });
    if (!stage) throw new OpeningError("معاينة الاستيراد غير موجودة.", 404);
    if (stage.status !== "PREVIEW" || stage.expiresAt < new Date()) throw new OpeningError("معاينة الاستيراد منتهية أو استُخدمت من قبل.", 409);
    if (input.action === "REJECT") {
      await tx.openingImportStage.update({ where: { id: stage.id }, data: { status: "REJECTED" } });
      await audit(tx, organizationId, actor, "OPENING_IMPORT_REJECTED", batchId, { stageId }, request);
      return { status: "REJECTED", revision: batch.revision };
    }
    const data = stage.rows as { items?: StagedOpeningRow[] };
    if (!Array.isArray(data.items) || data.items.length !== stage.rowCount || data.items.length > 1000) throw new OpeningError("بيانات المعاينة غير صالحة.", 409);
    const [accounts, settings, existing] = await Promise.all([
      tx.chartAccount.findMany({ where: { organizationId }, select: { id: true, code: true, nameAr: true, accountClass: true, normalBalance: true, isPostable: true, isActive: true, deletedAt: true, inventoryMethod: true } }),
      tx.companyAccountingSettings.findUnique({ where: { organizationId }, select: { inventoryMethod: true } }),
      tx.openingBalanceLine.findMany({ where: { organizationId, batchId } }),
    ]);
    const preview = reviewImportRows(data.items, accounts, batch.currencyPrecision, settings?.inventoryMethod ?? null, input.accountMapping);
    if (preview.issues.length) throw new OpeningError(`صحح أخطاء المعاينة أولًا: ${preview.issues[0].message}`, 409);
    const existingByAccount = new Map(existing.map(line => [line.accountId, line]));
    const collisions = preview.resolved.filter(row => existingByAccount.has(row.accountId));
    if (collisions.length && !input.overwriteExisting) throw new OpeningError(`يوجد ${collisions.length} حساب محفوظ مسبقًا؛ يلزم تأكيد الاستبدال الصريح.`, 409);
    const accountById = new Map(accounts.map(account => [account.id, account]));
    for (const row of preview.resolved) {
      const account = accountById.get(row.accountId)!;
      const before = existingByAccount.get(account.id);
      await tx.openingBalanceLine.upsert({ where: { batchId_accountId: { batchId, accountId: account.id } }, create: {
        organizationId, batchId, accountId: account.id, accountCode: account.code, accountNameAr: account.nameAr, accountClass: account.accountClass, normalBalance: account.normalBalance,
        debit: row.debit, credit: row.credit, explanation: row.explanation || null, sourceReference: row.sourceReference || null,
      }, update: { debit: row.debit, credit: row.credit, explanation: row.explanation || null, sourceReference: row.sourceReference || null } });
      await audit(tx, organizationId, actor, before ? "OPENING_LINE_EDITED" : "OPENING_LINE_ADDED", batchId, { source: "XLSX", stageId, rowNumber: row.rowNumber, accountId: account.id, accountCode: account.code, previous: before ? { debit: before.debit.toString(), credit: before.credit.toString() } : null, next: { debit: row.debit, credit: row.credit } }, request);
    }
    await tx.openingImportStage.update({ where: { id: stage.id }, data: { status: "APPLIED", appliedAt: new Date() } });
    const updated = await tx.openingBalanceBatch.update({ where: { id: batchId }, data: { revision: { increment: 1 }, status: "DRAFT", reviewedAt: null, reviewedById: null, rejectionReason: null } });
    await audit(tx, organizationId, actor, "OPENING_EXCEL_IMPORTED", batchId, { stageId, fileSha256: stage.fileSha256, rowCount: stage.rowCount, appliedCount: preview.resolved.length, overwrittenCount: collisions.length, revision: updated.revision }, request);
    return { status: "APPLIED", revision: updated.revision, appliedCount: preview.resolved.length };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
