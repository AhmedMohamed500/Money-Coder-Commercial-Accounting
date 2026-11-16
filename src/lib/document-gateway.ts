import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { assertOrganizationObjectKey, getStorageAdapter } from "@/lib/storage";

export function documentHash(bytes: Buffer) { return createHash("sha256").update(bytes).digest("hex"); }

export function documentIsClean(asset: { scanStatus: string; sha256: string; scannedSha256: string | null; releaseKey: string | null; scanValidUntil: Date | null; deletedAt?: Date | null }, now = new Date()) {
  return asset.scanStatus === "CLEAN" && asset.deletedAt == null && Boolean(asset.releaseKey) && asset.scannedSha256 === asset.sha256 && Boolean(asset.scanValidUntil && asset.scanValidUntil > now);
}

export async function queueStorageDeletion(organizationId: string, storageKey: string, storageProvider: string) {
  assertOrganizationObjectKey(storageKey, organizationId);
  const active = await db.fileAsset.findFirst({ where: { organizationId, deletedAt: null, OR: [{ storageKey }, { releaseKey: storageKey }] }, select: { id: true } });
  if (active) return false;
  await db.storageDeletionTask.upsert({ where: { storageKey }, create: { organizationId, storageKey, storageProvider }, update: {} });
  try {
    await getStorageAdapter(storageProvider).deleteObject(storageKey);
    await db.storageDeletionTask.deleteMany({ where: { storageKey } });
    return true;
  } catch {
    return false;
  }
}

export async function retryStorageDeletions(limit = 50) {
  const tasks = await db.storageDeletionTask.findMany({ where: { nextAttemptAt: { lte: new Date() } }, orderBy: { createdAt: "asc" }, take: Math.min(Math.max(limit, 1), 100) });
  let deleted = 0;
  for (const task of tasks) {
    try {
      assertOrganizationObjectKey(task.storageKey, task.organizationId);
      const asset = await db.fileAsset.findFirst({ where: { OR: [{ storageKey: task.storageKey }, { releaseKey: task.storageKey }], deletedAt: null }, select: { id: true } });
      if (asset) continue;
      await getStorageAdapter(task.storageProvider).deleteObject(task.storageKey);
      await db.storageDeletionTask.deleteMany({ where: { id: task.id } });
      deleted++;
    } catch {
      const attempts = task.attempts + 1;
      await db.storageDeletionTask.updateMany({ where: { id: task.id, attempts: task.attempts }, data: { attempts, nextAttemptAt: new Date(Date.now() + Math.min(24 * 60 * 60_000, 60_000 * 2 ** Math.min(attempts, 10))) } });
    }
  }
  return { examined: tasks.length, deleted };
}

export async function expireUploadIntents(limit = 50) {
  const now = new Date();
  const intents = await db.documentUploadIntent.findMany({ where: { OR: [{ status: "PENDING_UPLOAD", expiresAt: { lt: now } }, { status: "FINALIZING", claimExpiresAt: { lt: now } }] }, take: Math.min(Math.max(limit, 1), 100) });
  for (const intent of intents) {
    const changed = await db.documentUploadIntent.updateMany({ where: { id: intent.id, status: intent.status, ...(intent.status === "FINALIZING" ? { claimExpiresAt: { lt: now } } : { expiresAt: { lt: now } }) }, data: { status: "EXPIRED", claimToken: null, claimExpiresAt: null } });
    if (changed.count) await queueStorageDeletion(intent.organizationId, intent.pendingKey, getStorageAdapter().provider);
  }
  return intents.length;
}

export async function checkDocumentRateLimit(key: string, limit: number, windowMs: number) {
  const keyHash = documentHash(Buffer.from(key));
  const resetAt = new Date(Date.now() + windowMs);
  const rows = await db.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "DocumentRateLimitBucket" ("keyHash", "count", "resetAt") VALUES (${keyHash}, 1, ${resetAt})
    ON CONFLICT ("keyHash") DO UPDATE SET
      "count" = CASE WHEN "DocumentRateLimitBucket"."resetAt" <= CURRENT_TIMESTAMP THEN 1 ELSE "DocumentRateLimitBucket"."count" + 1 END,
      "resetAt" = CASE WHEN "DocumentRateLimitBucket"."resetAt" <= CURRENT_TIMESTAMP THEN ${resetAt} ELSE "DocumentRateLimitBucket"."resetAt" END
    RETURNING "count"`;
  return rows[0]?.count !== undefined && rows[0].count <= limit;
}

export async function cleanSourceDocument(organizationId: string, fileAssetId: string) {
  const asset = await db.fileAsset.findFirst({ where: { id: fileAssetId, organizationId, deletedAt: null, scanStatus: "CLEAN", scannedSha256: { not: null }, releaseKey: { not: null }, scanValidUntil: { gt: new Date() } }, select: { id: true, releaseKey: true, scannedSha256: true, sha256: true, sizeBytes: true, storageProvider: true, scanStatus: true, scanValidUntil: true } });
  if (!asset || !documentIsClean(asset) || !asset.releaseKey) return null;
  assertOrganizationObjectKey(asset.releaseKey, organizationId);
  const adapter = getStorageAdapter(asset.storageProvider);
  const head = await adapter.headObject(asset.releaseKey);
  if (!head || head.sizeBytes !== asset.sizeBytes) return null;
  const stored = await adapter.readObject(asset.releaseKey);
  return stored.bytes.length === asset.sizeBytes && documentHash(stored.bytes) === asset.sha256 ? asset : null;
}

/** Internal preparation only. Callers must authorize the organization before using it. REMOTE dispatch remains disabled. */
export async function attachCleanDocumentToAutomationJob(organizationId: string, jobId: string, documentId: string) {
  const document = await db.companyDocument.findFirst({ where: { id: documentId, organizationId, deletedAt: null }, select: { fileAssetId: true } });
  if (!document) return false;
  const asset = await cleanSourceDocument(organizationId, document.fileAssetId);
  if (!asset) return false;
  const result = await db.automationJob.updateMany({ where: { id: jobId, organizationId, sourceFileAssetId: null, status: { in: ["CREATED", "QUEUED"] } }, data: { sourceFileAssetId: asset.id, sourceDocumentId: documentId, sourceSha256: asset.sha256 } });
  return result.count === 1;
}

export async function cleanAutomationJobSource(organizationId: string, jobId: string) {
  const job = await db.automationJob.findFirst({ where: { id: jobId, organizationId, sourceFileAssetId: { not: null }, sourceDocumentId: { not: null }, sourceSha256: { not: null } }, select: { sourceFileAssetId: true, sourceDocumentId: true, sourceSha256: true } });
  if (!job?.sourceFileAssetId || !job.sourceDocumentId) return null;
  const document = await db.companyDocument.findFirst({ where: { id: job.sourceDocumentId, organizationId, fileAssetId: job.sourceFileAssetId, deletedAt: null }, select: { id: true } });
  if (!document) return null;
  const asset = await cleanSourceDocument(organizationId, job.sourceFileAssetId);
  return asset?.sha256 === job.sourceSha256 ? asset : null;
}
