import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { documentHash } from "@/lib/document-gateway";
import { assertOrganizationObjectKey, getStorageAdapter, StorageOperationError } from "@/lib/storage";
import { writeAudit } from "@/lib/audit";

const scanResponse = z.object({ verdict: z.enum(["CLEAN", "INFECTED"]), sha256: z.string().regex(/^[a-f0-9]{64}$/), engine: z.string().min(1).max(100), signatureVersion: z.string().min(1).max(100), signaturesUpdatedAt: z.string().datetime(), engineReady: z.literal(true) }).strict();
export type ScanVerdict = z.infer<typeof scanResponse>;
export interface DocumentScanner { scan(bytes: Buffer, sha256: string): Promise<ScanVerdict>; }
export class ScannerUnavailableError extends Error {}

function scannerConfig() {
  const url = process.env.DOCUMENT_SCANNER_URL;
  const secret = process.env.DOCUMENT_SCANNER_SHARED_SECRET;
  if (!url || !secret || secret.length < 32 || process.env.DOCUMENT_SCANNER_PRIVATE_NETWORK_VERIFIED !== "true") throw new ScannerUnavailableError("scanner-not-configured");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) throw new ScannerUnavailableError("scanner-invalid-url");
  return { url: parsed.toString(), secret };
}

export function documentScannerConfigured() {
  if (process.env.NODE_ENV === "test" && process.env.STORAGE_TEST_MODE === "1") return true;
  try { scannerConfig(); return true; } catch { return false; }
}

function hmac(secret: string, message: string) { return createHmac("sha256", secret).update(message).digest("hex"); }
function safeEqualHex(a: string, b: string) {
  if (!/^[a-f0-9]{64}$/.test(a)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/** HTTPS scanner service contract. The service must run ClamAV outside Vercel and authenticate both directions. */
export class HttpDocumentScanner implements DocumentScanner {
  async scan(bytes: Buffer, sha256: string): Promise<ScanVerdict> {
    const { url, secret } = scannerConfig();
    if (bytes.length < 1 || bytes.length > 10 * 1024 * 1024 || documentHash(bytes) !== sha256) throw new ScannerUnavailableError("invalid-scan-input");
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = randomUUID();
    const requestSignature = hmac(secret, `v1\n${timestamp}\n${nonce}\n${sha256}\n${bytes.length}`);
    let response: Response;
    try {
      response = await fetch(url, { method: "POST", headers: { "content-type": "application/octet-stream", "x-mc-timestamp": timestamp, "x-mc-nonce": nonce, "x-mc-sha256": sha256, "x-mc-signature": requestSignature }, body: new Uint8Array(bytes), signal: AbortSignal.timeout(15_000), cache: "no-store" });
    } catch { throw new ScannerUnavailableError("scanner-unavailable"); }
    if (!response.ok) throw new ScannerUnavailableError("scanner-unavailable");
    const raw = await response.text();
    if (raw.length > 2048) throw new ScannerUnavailableError("scanner-invalid-result");
    const responseSignature = response.headers.get("x-mc-signature") ?? "";
    if (!safeEqualHex(responseSignature, hmac(secret, `v1\n${nonce}\n${raw}`))) throw new ScannerUnavailableError("scanner-unauthenticated-result");
    let parsed: ScanVerdict;
    try { parsed = scanResponse.parse(JSON.parse(raw)); } catch { throw new ScannerUnavailableError("scanner-invalid-result"); }
    if (parsed.sha256 !== sha256 || Date.now() - Date.parse(parsed.signaturesUpdatedAt) > 72 * 60 * 60_000 || Date.parse(parsed.signaturesUpdatedAt) > Date.now() + 5 * 60_000) throw new ScannerUnavailableError("scanner-stale-or-mismatched");
    return parsed;
  }
}

/** Called only by a separately deployed, trusted worker. No public state-transition route exists. */
export async function scanPendingDocument(fileAssetId: string, scanner: DocumentScanner = new HttpDocumentScanner()) {
  const now = new Date();
  const leaseToken = randomUUID();
  const claimed = await db.fileAsset.updateMany({ where: { id: fileAssetId, deletedAt: null, OR: [{ scanStatus: "PENDING_SCAN" }, { scanStatus: "SCAN_FAILED", scanAttempts: { lt: 3 } }, { scanStatus: "SCANNING", scanLeaseUntil: { lt: now } }, { scanStatus: "CLEAN", scanValidUntil: { lt: now } }] }, data: { scanStatus: "SCANNING", scanLeaseToken: leaseToken, scanLeaseUntil: new Date(now.getTime() + 90_000), scanAttempts: { increment: 1 }, scannedSha256: null, scanValidUntil: null } });
  if (claimed.count !== 1) return { status: "not-claimable" as const };
  const asset = await db.fileAsset.findUniqueOrThrow({ where: { id: fileAssetId } });
  try {
    if (!asset.releaseKey) throw new ScannerUnavailableError("missing-release-key");
    assertOrganizationObjectKey(asset.storageKey, asset.organizationId);
    assertOrganizationObjectKey(asset.releaseKey, asset.organizationId);
    const adapter = getStorageAdapter(asset.storageProvider);
    const head = await adapter.headObject(asset.storageKey);
    if (!head || head.sizeBytes !== asset.sizeBytes || head.contentType !== asset.mimeType) throw new ScannerUnavailableError("quarantine-object-changed");
    const pending = await adapter.readObject(asset.storageKey);
    if (pending.bytes.length !== asset.sizeBytes || pending.contentType !== asset.mimeType || documentHash(pending.bytes) !== asset.sha256) throw new ScannerUnavailableError("quarantine-object-changed");
    const verdict = scanResponse.parse(await scanner.scan(pending.bytes, asset.sha256));
    if (verdict.sha256 !== asset.sha256 || Date.now() - Date.parse(verdict.signaturesUpdatedAt) > 72 * 60 * 60_000 || Date.parse(verdict.signaturesUpdatedAt) > Date.now() + 5 * 60_000) throw new ScannerUnavailableError("scanner-stale-or-mismatched");
    if (verdict.verdict === "INFECTED") {
      const changed = await db.$transaction(async tx => {
        const result = await tx.fileAsset.updateMany({ where: { id: asset.id, scanStatus: "SCANNING", scanLeaseToken: leaseToken, scanLeaseUntil: { gt: new Date() } }, data: { scanStatus: "INFECTED", scannerEngine: verdict.engine, signatureVersion: verdict.signatureVersion, scannedAt: new Date(), scanLeaseToken: null, scanLeaseUntil: null } });
        if (result.count) await writeAudit({ organizationId: asset.organizationId, action: "DOCUMENT_SCAN_INFECTED", entityType: "FileAsset", entityId: asset.id, metadata: { engine: verdict.engine, signatureVersion: verdict.signatureVersion }, client: tx });
        return result;
      });
      return { status: changed.count ? "infected" as const : "stale" as const };
    }
    const currentHead = await adapter.headObject(asset.storageKey);
    if (!currentHead || currentHead.sizeBytes !== asset.sizeBytes) throw new ScannerUnavailableError("quarantine-object-changed");
    const current = await adapter.readObject(asset.storageKey);
    if (documentHash(current.bytes) !== asset.sha256 || current.bytes.length !== asset.sizeBytes) throw new ScannerUnavailableError("quarantine-object-changed");
    const lease = await db.fileAsset.findFirst({ where: { id: asset.id, scanStatus: "SCANNING", scanLeaseToken: leaseToken, scanLeaseUntil: { gt: new Date() }, deletedAt: null }, select: { id: true } });
    if (!lease) return { status: "stale" as const };
    try {
      await adapter.promoteObject(asset.storageKey, asset.releaseKey, asset.mimeType, current.metadata);
    } catch (cause) {
      if (!(cause instanceof StorageOperationError && cause.code === "conflict")) throw cause;
    }
    const releaseHead = await adapter.headObject(asset.releaseKey);
    if (!releaseHead || releaseHead.sizeBytes !== asset.sizeBytes) throw new ScannerUnavailableError("release-object-mismatch");
    const released = await adapter.readObject(asset.releaseKey);
    if (released.bytes.length !== asset.sizeBytes || released.contentType !== asset.mimeType || documentHash(released.bytes) !== asset.sha256) throw new ScannerUnavailableError("release-object-mismatch");
    const completedAt = new Date();
    const changed = await db.$transaction(async tx => {
      const result = await tx.fileAsset.updateMany({ where: { id: asset.id, scanStatus: "SCANNING", scanLeaseToken: leaseToken, scanLeaseUntil: { gt: completedAt }, deletedAt: null }, data: { scanStatus: "CLEAN", scannedSha256: asset.sha256, scannerEngine: verdict.engine, signatureVersion: verdict.signatureVersion, scannedAt: completedAt, scanValidUntil: new Date(completedAt.getTime() + 30 * 24 * 60 * 60_000), scanLeaseToken: null, scanLeaseUntil: null, scanAttempts: 0 } });
      if (result.count && asset.kind === "LOGO") await tx.organizationProfile.upsert({ where: { organizationId: asset.organizationId }, create: { organizationId: asset.organizationId, logoFileId: asset.id }, update: { logoFileId: asset.id } });
      if (result.count) await writeAudit({ organizationId: asset.organizationId, action: "DOCUMENT_SCAN_CLEAN", entityType: "FileAsset", entityId: asset.id, metadata: { engine: verdict.engine, signatureVersion: verdict.signatureVersion, sha256: asset.sha256 }, client: tx });
      return result;
    });
    return { status: changed.count ? "clean" as const : "stale" as const };
  } catch {
    const changed = await db.$transaction(async tx => {
      const result = await tx.fileAsset.updateMany({ where: { id: asset.id, scanStatus: "SCANNING", scanLeaseToken: leaseToken }, data: { scanStatus: "SCAN_FAILED", scanLeaseToken: null, scanLeaseUntil: null } });
      if (result.count) await writeAudit({ organizationId: asset.organizationId, action: "DOCUMENT_SCAN_FAILED", entityType: "FileAsset", entityId: asset.id, metadata: { attempt: asset.scanAttempts }, client: tx });
      return result;
    });
    return { status: changed.count ? "scan-failed" as const : "stale" as const };
  }
}
