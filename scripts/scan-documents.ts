import { db } from "../src/lib/db";
import { expireUploadIntents, retryStorageDeletions } from "../src/lib/document-gateway";
import { scanPendingDocument } from "../src/lib/document-scanner";

async function main() {
  if (process.env.DOCUMENT_SCANNER_WORKER_ENABLED !== "true") throw new Error("Scanner worker is disabled");
  if (!process.env.DOCUMENT_SCANNER_URL || !process.env.DOCUMENT_SCANNER_SHARED_SECRET) throw new Error("Scanner service is not configured");
  await expireUploadIntents();
  const pending = await db.fileAsset.findMany({ where: { deletedAt: null, OR: [{ scanStatus: "PENDING_SCAN" }, { scanStatus: "SCAN_FAILED", scanAttempts: { lt: 3 } }, { scanStatus: "SCANNING", scanLeaseUntil: { lt: new Date() } }, { scanStatus: "CLEAN", scanValidUntil: { lt: new Date() } }] }, select: { id: true }, orderBy: { createdAt: "asc" }, take: 20 });
  const counts: Record<string, number> = {};
  for (const asset of pending) {
    const result = await scanPendingDocument(asset.id);
    counts[result.status] = (counts[result.status] ?? 0) + 1;
  }
  const deleted = await retryStorageDeletions();
  await db.documentRateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 24 * 60 * 60_000) } } });
  console.info(JSON.stringify({ scanned: pending.length, counts, deletionTasks: deleted }));
}

main().catch(cause => { console.error("document worker failed", cause instanceof Error ? cause.name : "unknown"); process.exitCode = 1; }).finally(async () => { await db.$disconnect(); });
