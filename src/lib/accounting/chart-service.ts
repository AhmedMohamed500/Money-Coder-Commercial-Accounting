import { randomUUID } from "node:crypto";
import { Prisma, type ChartAccount, type ChartAccountClass, type ChartReportGroup } from "@prisma/client";
import { db } from "@/lib/db";
import { COMMERCIAL_TEMPLATE_VERSION, commercialChartTemplate, validateCommercialTemplate } from "@/lib/accounting/chart-template";

export class ChartError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

export type ChartActor = { id: string; displayName: string };
type Client = Prisma.TransactionClient;

const reportClasses: Record<ChartReportGroup, ChartAccountClass> = {
  ASSET_TOTAL: "ASSET", CURRENT_ASSET: "ASSET", NONCURRENT_ASSET: "ASSET",
  LIABILITY_TOTAL: "LIABILITY", CURRENT_LIABILITY: "LIABILITY", NONCURRENT_LIABILITY: "LIABILITY",
  EQUITY: "EQUITY", REVENUE_TOTAL: "REVENUE", TRADING_REVENUE: "REVENUE", CONTRA_REVENUE: "REVENUE", OTHER_INCOME: "REVENUE",
  EXPENSE_TOTAL: "EXPENSE", COST_OF_SALES: "EXPENSE", SELLING_EXPENSE: "EXPENSE", ADMIN_EXPENSE: "EXPENSE", STAFF_EXPENSE: "EXPENSE", DEPRECIATION_EXPENSE: "EXPENSE", FINANCE_COST: "EXPENSE", OTHER_EXPENSE: "EXPENSE", INCOME_TAX_EXPENSE: "EXPENSE",
};

async function lockCompany(tx: Client, organizationId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string; type: string; deletedAt: Date | null }>>`SELECT "id", "type", "deletedAt" FROM "Organization" WHERE "id" = ${organizationId}::uuid FOR UPDATE`;
  if (rows.length !== 1 || rows[0].deletedAt || rows[0].type !== "COMMERCIAL_COMPANY") throw new ChartError("الشركة غير موجودة.", 404);
}

async function audit(tx: Client, input: { organizationId: string; actor: ChartActor; action: string; accountId?: string; accountCode?: string; previous?: unknown; next?: unknown; reason?: string; requestId?: string; request?: Request }) {
  const previous = input.previous === undefined ? null : JSON.parse(JSON.stringify(input.previous));
  const next = input.next === undefined ? null : JSON.parse(JSON.stringify(input.next));
  const before = previous && typeof previous === "object" ? previous as Record<string, unknown> : {};
  const after = next && typeof next === "object" ? next as Record<string, unknown> : {};
  const changedFields = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  await tx.auditEvent.create({ data: {
    organizationId: input.organizationId, actorUserId: input.actor.id, action: input.action,
    entityType: "ChartAccount", entityId: input.accountId,
    metadata: { accountCode: input.accountCode ?? null, actorName: input.actor.displayName, previous, next, changedFields, reason: input.reason ?? null, requestId: input.requestId ?? null } as Prisma.InputJsonValue,
    ipAddress: input.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: input.request?.headers.get("user-agent") ?? null,
  } });
}

export async function initializeCommercialChart(organizationId: string, actor: ChartActor, request?: Request) {
  validateCommercialTemplate();
  return db.$transaction(async tx => {
    await lockCompany(tx, organizationId);
    const prior = await tx.chartInstallation.findUnique({ where: { organizationId } });
    if (prior) {
      if (prior.activity !== "COMMERCIAL") throw new ChartError("نشاط الشركة مسجل بنوع مختلف؛ يلزم مسار تغيير إداري.", 409);
      return { created: false, accountCount: prior.accountCount, version: prior.templateVersion };
    }
    if (await tx.chartAccount.count({ where: { organizationId } })) throw new ChartError("يوجد دليل حسابات سابق؛ لن تُستبدل الحسابات اليدوية.", 409);
    const settings = await tx.companyAccountingSettings.findUnique({ where: { organizationId }, select: { inventoryMethod: true, businessActivity: true } });
    if (settings?.businessActivity && settings.businessActivity !== "COMMERCIAL") throw new ChartError("النشاط المحاسبي المحدد للشركة غير تجاري؛ لا يمكن استبداله تلقائيًا بالقالب التجاري.", 409);
    const inventoryMethod = settings?.inventoryMethod ?? "PERIODIC";
    const ids = new Map(commercialChartTemplate.map(account => [account.code, randomUUID()]));
    await tx.chartAccount.createMany({ data: commercialChartTemplate.map(account => ({
      id: ids.get(account.code)!, organizationId, code: account.code, nameAr: account.nameAr, nameEn: account.nameEn,
      parentId: account.parentCode ? ids.get(account.parentCode)! : null, accountClass: account.accountClass,
      reportGroup: account.reportGroup, normalBalance: account.normalBalance, isContra: account.isContra,
      isPostable: account.isPostable, isActive: account.isActive && (!account.inventoryMethod || account.inventoryMethod === inventoryMethod), inventoryMethod: account.inventoryMethod, description: account.description,
      origin: "TEMPLATE", templateVersion: COMMERCIAL_TEMPLATE_VERSION, createdById: actor.id, updatedById: actor.id,
    })) });
    await tx.companyAccountingSettings.upsert({ where: { organizationId }, create: { organizationId, businessActivity: "COMMERCIAL" }, update: { businessActivity: "COMMERCIAL" } });
    await tx.chartInstallation.create({ data: { organizationId, activity: "COMMERCIAL", templateVersion: COMMERCIAL_TEMPLATE_VERSION, accountCount: commercialChartTemplate.length, installedById: actor.id } });
    await audit(tx, { organizationId, actor, action: "CHART_TEMPLATE_SELECTED", next: { activity: "COMMERCIAL" }, request });
    await audit(tx, { organizationId, actor, action: "CHART_TEMPLATE_APPLIED", next: { version: COMMERCIAL_TEMPLATE_VERSION, accountCount: commercialChartTemplate.length }, request });
    await audit(tx, { organizationId, actor, action: "CHART_INITIALIZED", next: { activity: "COMMERCIAL", version: COMMERCIAL_TEMPLATE_VERSION, accountCount: commercialChartTemplate.length }, request });
    return { created: true, accountCount: commercialChartTemplate.length, version: COMMERCIAL_TEMPLATE_VERSION };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 });
}

export async function listChart(organizationId: string) {
  const [installation, settings, accounts] = await Promise.all([
    db.chartInstallation.findUnique({ where: { organizationId } }),
    db.companyAccountingSettings.findUnique({ where: { organizationId }, select: { businessActivity: true, inventoryMethod: true, baseCurrency: true } }),
    db.chartAccount.findMany({ where: { organizationId, deletedAt: null }, orderBy: { code: "asc" } }),
  ]);
  return { installation, settings, accounts };
}

export async function suggestAccountCode(organizationId: string, parentId: string) {
  const parent = await db.chartAccount.findFirst({ where: { id: parentId, organizationId, deletedAt: null } });
  if (!parent || parent.isPostable || !parent.isActive) throw new ChartError("الحساب الأب غير صالح لإضافة فرع.");
  const children = await db.chartAccount.findMany({ where: { organizationId, parentId }, select: { code: true } });
  const used = new Set(children.map(child => child.code));
  for (let index = 1; index <= 99; index++) {
    const candidate = `${parent.code}${String(index).padStart(2, "0")}`;
    if (!used.has(candidate)) return { code: candidate, parent };
  }
  throw new ChartError("لا توجد أكواد متاحة في هذا الفرع.", 409);
}

export async function createChartAccount(organizationId: string, actor: ChartActor, input: { parentId: string; code?: string; nameAr: string; nameEn?: string | null; description?: string | null; isPostable: boolean }, request?: Request) {
  return db.$transaction(async tx => {
    await lockCompany(tx, organizationId);
    if (!await tx.chartInstallation.findUnique({ where: { organizationId } })) throw new ChartError("هيئ دليل الحسابات أولًا.", 409);
    const parent = await tx.chartAccount.findFirst({ where: { id: input.parentId, organizationId, deletedAt: null } });
    if (!parent || !parent.isActive || parent.isPostable) throw new ChartError("الحساب الأب غير صالح.");
    const siblings = await tx.chartAccount.findMany({ where: { organizationId, parentId: parent.id }, select: { code: true } });
    const used = new Set(siblings.map(sibling => sibling.code));
    let nextCode = input.code;
    if (!nextCode) {
      for (let index = 1; index <= 99; index++) {
        const candidate = `${parent.code}${String(index).padStart(2, "0")}`;
        if (!used.has(candidate)) { nextCode = candidate; break; }
      }
    }
    if (!nextCode || !new RegExp(`^${parent.code}[0-9]{2}$`).test(nextCode)) throw new ChartError("الكود يجب أن يتبع ترقيم الحساب الأب بخانتين.");
    if (used.has(nextCode)) throw new ChartError("الكود مستخدم بالفعل.", 409);
    const account = await tx.chartAccount.create({ data: {
      organizationId, parentId: parent.id, code: nextCode, nameAr: input.nameAr.trim(), nameEn: input.nameEn?.trim() || null,
      description: input.description?.trim() || null, accountClass: parent.accountClass, reportGroup: parent.reportGroup,
      normalBalance: parent.normalBalance, isContra: parent.isContra, isPostable: input.isPostable, inventoryMethod: parent.inventoryMethod,
      origin: "MANUAL", createdById: actor.id, updatedById: actor.id,
    } });
    await audit(tx, { organizationId, actor, action: input.isPostable ? "CHART_ACCOUNT_CREATED" : "CHART_GROUP_CREATED", accountId: account.id, accountCode: account.code, next: account, request });
    return account;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function editChartAccount(organizationId: string, accountId: string, actor: ChartActor, input: { nameAr?: string; nameEn?: string | null; description?: string | null; reason: string }, request?: Request) {
  return db.$transaction(async tx => {
    await lockCompany(tx, organizationId);
    const before = await tx.chartAccount.findFirst({ where: { id: accountId, organizationId, deletedAt: null } });
    if (!before) throw new ChartError("الحساب غير موجود.", 404);
    const changes = { ...(input.nameAr !== undefined ? { nameAr: input.nameAr.trim() } : {}), ...(input.nameEn !== undefined ? { nameEn: input.nameEn?.trim() || null } : {}), ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}) };
    if (!Object.keys(changes).length) throw new ChartError("لم تُرسل تغييرات.");
    const after = await tx.chartAccount.update({ where: { id: accountId }, data: { ...changes, revision: { increment: 1 }, updatedById: actor.id } });
    await audit(tx, { organizationId, actor, action: before.nameAr !== after.nameAr ? "CHART_ACCOUNT_RENAMED" : "CHART_ACCOUNT_EDITED", accountId, accountCode: after.code, previous: before, next: after, reason: input.reason, request });
    return after;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export type SensitiveChange = { action: "UPDATE" | "DEACTIVATE" | "DELETE"; accountId: string; reason: string; proposed?: { code?: string; parentId?: string; accountClass?: ChartAccountClass; reportGroup?: ChartReportGroup; normalBalance?: "DEBIT" | "CREDIT"; isPostable?: boolean; isActive?: boolean } };

export async function requestChartChange(organizationId: string, actor: ChartActor, input: SensitiveChange, request?: Request) {
  return db.$transaction(async tx => {
    await lockCompany(tx, organizationId);
    const account = await tx.chartAccount.findFirst({ where: { id: input.accountId, organizationId, deletedAt: null } });
    if (!account) throw new ChartError("الحساب غير موجود.", 404);
    if (input.action === "UPDATE" && !input.proposed) throw new ChartError("التعديل المطلوب فارغ.");
    if (input.action === "UPDATE") await validateSensitiveUpdate(tx, organizationId, account, input.proposed);
    if (input.action === "DEACTIVATE" && await tx.chartAccount.count({ where: { organizationId, parentId: account.id, deletedAt: null } })) throw new ChartError("لا يمكن تعطيل حساب له فروع.", 409);
    if (input.action === "DELETE" && (account.origin !== "MANUAL" || await tx.chartAccount.count({ where: { organizationId, parentId: account.id, deletedAt: null } }))) {
      const reason = "لا يمكن حذف حساب القالب أو حساب له فروع.";
      await audit(tx, { organizationId, actor, action: "CHART_DELETION_DENIED", accountId: account.id, accountCode: account.code, previous: account, reason: `${input.reason.trim()} — ${reason}`, request });
      return { denied: true as const, reason };
    }
    const change = await tx.chartChangeRequest.create({ data: { organizationId, accountId: account.id, accountRevision: account.revision, action: input.action, proposed: (input.proposed ?? {}) as Prisma.InputJsonValue, reason: input.reason.trim(), requestedById: actor.id } });
    await audit(tx, { organizationId, actor, action: "CHART_CHANGE_SUBMITTED", accountId: account.id, accountCode: account.code, previous: account, next: input.proposed, reason: input.reason, requestId: change.id, request });
    return change;
  });
}

async function validateSensitiveUpdate(tx: Client, organizationId: string, before: ChartAccount, proposed: SensitiveChange["proposed"]) {
  if (!proposed || Object.keys(proposed).length === 0) throw new ChartError("التعديل المطلوب فارغ.");
  const next = { ...before, ...proposed };
  if (reportClasses[next.reportGroup] !== next.accountClass) throw new ChartError("تصنيف القوائم لا يطابق نوع الحساب.");
  if (proposed.code !== undefined || proposed.parentId !== undefined) {
    if (before.origin === "TEMPLATE") throw new ChartError("نقل أو إعادة ترقيم حساب القالب يحتاج ترحيلًا محاسبيًا مستقلًا.", 409);
  }
  if (proposed.code && !/^\d{4}(\d{2})*$/.test(proposed.code)) throw new ChartError("صيغة الكود غير صالحة.");
  if (next.parentId) {
    const parent = await tx.chartAccount.findFirst({ where: { id: next.parentId, organizationId, deletedAt: null } });
    if (!parent || parent.isPostable || !parent.isActive || parent.accountClass !== next.accountClass) throw new ChartError("الحساب الأب غير صالح.");
    if ((proposed.code !== undefined || proposed.parentId !== undefined) && !new RegExp(`^${parent.code}[0-9]{2}$`).test(next.code)) throw new ChartError("الكود الجديد لا يتبع فرعه.");
    let ancestor: typeof parent | null = parent;
    while (ancestor) {
      if (ancestor.id === before.id) throw new ChartError("لا يمكن إنشاء دورة في شجرة الحسابات.");
      ancestor = ancestor.parentId ? await tx.chartAccount.findFirst({ where: { id: ancestor.parentId, organizationId, deletedAt: null } }) : null;
    }
  }
  const children = await tx.chartAccount.count({ where: { organizationId, parentId: before.id, deletedAt: null } });
  if (children && (next.isPostable || next.accountClass !== before.accountClass || next.isActive === false || proposed.parentId !== undefined || proposed.code !== undefined)) throw new ChartError("الحساب لديه فروع تابعة ولا يقبل هذا التغيير.", 409);
  if (next.isActive && next.inventoryMethod) {
    const settings = await tx.companyAccountingSettings.findUnique({ where: { organizationId }, select: { inventoryMethod: true } });
    if (settings?.inventoryMethod !== next.inventoryMethod) throw new ChartError("الحساب غير متوافق مع سياسة الجرد الحالية.", 409);
  }
  const ordinary = next.accountClass === "ASSET" || next.accountClass === "EXPENSE" ? "DEBIT" : "CREDIT";
  if ((next.normalBalance !== ordinary) !== next.isContra) throw new ChartError("طبيعة الحساب المقابل غير صحيحة.");
  return proposed;
}

export async function decideChartChange(organizationId: string, changeId: string, actor: ChartActor, decision: "APPROVE" | "REJECT", decisionReason: string, request?: Request) {
  return db.$transaction(async tx => {
    await lockCompany(tx, organizationId);
    const change = await tx.chartChangeRequest.findFirst({ where: { id: changeId, organizationId, status: "PENDING" } });
    if (!change) throw new ChartError("الطلب غير موجود أو سبق حسمه.", 404);
    if (change.requestedById === actor.id) throw new ChartError("لا يمكن اعتماد طلبك بنفسك.", 403);
    const before = await tx.chartAccount.findFirst({ where: { id: change.accountId, organizationId, deletedAt: null } });
    if (!before) throw new ChartError("الحساب غير موجود.", 404);
    if (decision === "REJECT") {
      const rejected = await tx.chartChangeRequest.update({ where: { id: change.id }, data: { status: "REJECTED", decidedById: actor.id, decisionReason, decidedAt: new Date() } });
      await audit(tx, { organizationId, actor, action: "CHART_CHANGE_REJECTED", accountId: before.id, accountCode: before.code, reason: decisionReason, requestId: change.id, request });
      return { change: rejected, account: before };
    }
    if (before.revision !== change.accountRevision) throw new ChartError("تغير الحساب بعد تقديم الطلب. قدم طلبًا جديدًا.", 409);
    let update: Prisma.ChartAccountUpdateInput;
    if (change.action === "DELETE") {
      if (before.origin !== "MANUAL" || await tx.chartAccount.count({ where: { organizationId, parentId: before.id, deletedAt: null } })) throw new ChartError("لا يمكن حذف حساب القالب أو حساب له فروع.", 409);
      update = { deletedAt: new Date(), isActive: false };
    } else if (change.action === "DEACTIVATE") {
      if (await tx.chartAccount.count({ where: { organizationId, parentId: before.id, deletedAt: null } })) throw new ChartError("لا يمكن تعطيل حساب له فروع.", 409);
      update = { isActive: false };
    } else {
      const proposed = await validateSensitiveUpdate(tx, organizationId, before, change.proposed as SensitiveChange["proposed"]);
      update = { ...proposed };
    }
    const after = await tx.chartAccount.update({ where: { id: before.id }, data: { ...update, revision: { increment: 1 }, updatedById: actor.id } });
    const approved = await tx.chartChangeRequest.update({ where: { id: change.id }, data: { status: "APPROVED", decidedById: actor.id, decisionReason, decidedAt: new Date() } });
    await audit(tx, { organizationId, actor, action: "CHART_CHANGE_APPROVED", accountId: before.id, accountCode: before.code, reason: decisionReason, requestId: change.id, request });
    await audit(tx, { organizationId, actor, action: change.action === "DELETE" ? "CHART_ACCOUNT_SOFT_DELETED" : change.action === "DEACTIVATE" ? "CHART_ACCOUNT_DEACTIVATED" : "CHART_ACCOUNT_SENSITIVE_EDITED", accountId: before.id, accountCode: after.code, previous: before, next: after, reason: change.reason, requestId: change.id, request });
    return { change: approved, account: after };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function chartHistory(organizationId: string, filters: { accountId?: string; code?: string; action?: string; actorUserId?: string; accountClass?: ChartAccountClass; approvalStatus?: "PENDING" | "APPROVED" | "REJECTED"; from?: Date; to?: Date; take?: number }) {
  const where: Prisma.AuditEventWhereInput = { organizationId, entityType: "ChartAccount", ...(filters.accountId ? { entityId: filters.accountId } : {}), ...(filters.action ? { action: filters.action } : {}), ...(filters.actorUserId ? { actorUserId: filters.actorUserId } : {}), ...((filters.from || filters.to) ? { createdAt: { gte: filters.from, lt: filters.to } } : {}), ...(filters.code ? { metadata: { path: ["accountCode"], equals: filters.code } } : {}) };
  if (filters.accountClass) where.AND = [{ OR: [{ metadata: { path: ["previous", "accountClass"], equals: filters.accountClass } }, { metadata: { path: ["next", "accountClass"], equals: filters.accountClass } }] }];
  if (filters.approvalStatus) where.action = { in: { PENDING: ["CHART_CHANGE_SUBMITTED"], APPROVED: ["CHART_CHANGE_APPROVED"], REJECTED: ["CHART_CHANGE_REJECTED"] }[filters.approvalStatus] };
  return db.auditEvent.findMany({ where, orderBy: { createdAt: "desc" }, take: Math.min(filters.take ?? 100, 200), include: { actor: { select: { displayName: true } } } });
}

export function toChartResponseError(error: unknown) {
  if (error instanceof ChartError) return { status: error.status, message: error.message };
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { status: 409, message: "الكود أو السجل موجود مسبقًا." };
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return { status: 409, message: "تعارضت العملية مع تعديل آخر. أعد المحاولة." };
  return null;
}
