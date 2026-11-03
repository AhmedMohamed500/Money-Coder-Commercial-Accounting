import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

describe.skipIf(process.env.RUN_DB_TESTS !== "1")("document scan schema foundation", () => {
  const marker = randomUUID();
  let userId: string;
  let organizationId: string;

  beforeAll(async () => {
    await db.$connect();
    const user = await db.user.create({ data: { email: `scan-${marker}@test.local`, displayName: "Scan Test", passwordHash: "test-only" } });
    userId = user.id;
    const organization = await db.organization.create({ data: { type: "COMMERCIAL_COMPANY", legalName: "Scan Test Organization", createdById: userId } });
    organizationId = organization.id;
  });

  afterAll(async () => {
    if (organizationId) await db.organization.delete({ where: { id: organizationId } });
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  });

  it("keeps a synthetic legacy file unverified without changing business data", async () => {
    const file = await db.fileAsset.create({ data: { organizationId, uploadedById: userId, kind: "LEGAL_DOCUMENT", originalName: "legacy.pdf", storageKey: `organizations/${organizationId}/${randomUUID()}`, mimeType: "application/pdf", sizeBytes: 15, sha256: "a".repeat(64), storageProvider: "test-memory" } });
    const document = await db.companyDocument.create({ data: { organizationId, fileAssetId: file.id, category: "LEGAL_DOCUMENT", title: "Legacy document" } });
    const reloaded = await db.companyDocument.findUniqueOrThrow({ where: { id: document.id }, include: { fileAsset: true } });
    expect(reloaded.title).toBe("Legacy document");
    expect(reloaded.fileAsset.scanStatus).toBeNull();
    expect(reloaded.fileAsset.scanRevision).toBe(0);
    expect(reloaded.fileAsset.scanAttemptCount).toBe(0);
    expect(reloaded.fileAsset.kind).toBe("LEGAL_DOCUMENT");
  });

  it("records distinct attempts and preserves history when the file is removed", async () => {
    const file = await db.fileAsset.create({ data: { organizationId, uploadedById: userId, kind: "OTHER", originalName: "future.pdf", storageKey: `organizations/${organizationId}/${randomUUID()}`, mimeType: "application/pdf", sizeBytes: 10, sha256: "b".repeat(64), storageProvider: "test-memory", scanStatus: "PENDING_SCAN" } });
    const attemptData = { fileAssetId: file.id, fileAssetIdentity: file.id, revision: 1, attemptNumber: 1, leaseToken: randomUUID(), status: "SCANNING" as const, expectedSha256: file.sha256, startedAt: new Date() };
    const attempt = await db.documentScanAttempt.create({ data: attemptData });
    expect((await db.fileAsset.findUniqueOrThrow({ where: { id: file.id }, include: { scanAttempts: true } })).scanAttempts.map(item => item.id)).toEqual([attempt.id]);
    await expect(db.documentScanAttempt.create({ data: { ...attemptData, leaseToken: randomUUID() } })).rejects.toMatchObject({ code: "P2002" });
    await db.fileAsset.delete({ where: { id: file.id } });
    const retained = await db.documentScanAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
    expect(retained.fileAssetId).toBeNull();
    expect(retained.fileAssetIdentity).toBe(file.id);
    await db.documentScanAttempt.delete({ where: { id: attempt.id } });
  });
});
