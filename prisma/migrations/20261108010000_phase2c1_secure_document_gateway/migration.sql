CREATE TYPE "DocumentScanStatus" AS ENUM ('LEGACY_UNSCANNED', 'PENDING_SCAN', 'SCANNING', 'CLEAN', 'INFECTED', 'SCAN_FAILED', 'EXPIRED');
CREATE TYPE "DocumentUploadStatus" AS ENUM ('PENDING_UPLOAD', 'FINALIZING', 'PENDING_SCAN', 'FAILED', 'EXPIRED');

ALTER TABLE "FileAsset" ADD COLUMN "scanStatus" "DocumentScanStatus" NOT NULL DEFAULT 'LEGACY_UNSCANNED',
ADD COLUMN "releaseKey" TEXT,
ADD COLUMN "scannedSha256" VARCHAR(64),
ADD COLUMN "scannerEngine" VARCHAR(100),
ADD COLUMN "signatureVersion" VARCHAR(100),
ADD COLUMN "scannedAt" TIMESTAMP(3),
ADD COLUMN "scanValidUntil" TIMESTAMP(3),
ADD COLUMN "scanLeaseToken" UUID,
ADD COLUMN "scanLeaseUntil" TIMESTAMP(3),
ADD COLUMN "scanAttempts" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "FileAsset_releaseKey_key" ON "FileAsset"("releaseKey");
CREATE UNIQUE INDEX "FileAsset_id_organizationId_key" ON "FileAsset"("id", "organizationId");
CREATE INDEX "FileAsset_scanStatus_scanLeaseUntil_idx" ON "FileAsset"("scanStatus", "scanLeaseUntil");

CREATE TABLE "DocumentUploadIntent" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "pendingKey" TEXT NOT NULL,
  "releaseKey" TEXT NOT NULL,
  "status" "DocumentUploadStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "claimToken" UUID,
  "claimExpiresAt" TIMESTAMP(3),
  "fileAssetId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentUploadIntent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DocumentUploadIntent_pendingKey_key" ON "DocumentUploadIntent"("pendingKey");
CREATE UNIQUE INDEX "DocumentUploadIntent_releaseKey_key" ON "DocumentUploadIntent"("releaseKey");
CREATE UNIQUE INDEX "DocumentUploadIntent_fileAssetId_key" ON "DocumentUploadIntent"("fileAssetId");
CREATE INDEX "DocumentUploadIntent_organizationId_status_expiresAt_idx" ON "DocumentUploadIntent"("organizationId", "status", "expiresAt");
ALTER TABLE "DocumentUploadIntent" ADD CONSTRAINT "DocumentUploadIntent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentUploadIntent" ADD CONSTRAINT "DocumentUploadIntent_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "StorageDeletionTask" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "storageKey" TEXT NOT NULL,
  "storageProvider" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StorageDeletionTask_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StorageDeletionTask_storageKey_key" ON "StorageDeletionTask"("storageKey");
CREATE INDEX "StorageDeletionTask_nextAttemptAt_idx" ON "StorageDeletionTask"("nextAttemptAt");
ALTER TABLE "StorageDeletionTask" ADD CONSTRAINT "StorageDeletionTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "CompanyDocument_id_organizationId_key" ON "CompanyDocument"("id", "organizationId");
ALTER TABLE "AutomationJob" ADD COLUMN "sourceFileAssetId" UUID, ADD COLUMN "sourceDocumentId" UUID, ADD COLUMN "sourceSha256" VARCHAR(64);
ALTER TABLE "AutomationJob" ADD CONSTRAINT "AutomationJob_sourceFileAssetId_organizationId_fkey" FOREIGN KEY ("sourceFileAssetId", "organizationId") REFERENCES "FileAsset"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AutomationJob" ADD CONSTRAINT "AutomationJob_sourceDocumentId_organizationId_fkey" FOREIGN KEY ("sourceDocumentId", "organizationId") REFERENCES "CompanyDocument"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "DocumentRateLimitBucket" (
  "keyHash" VARCHAR(64) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentRateLimitBucket_pkey" PRIMARY KEY ("keyHash")
);
CREATE INDEX "DocumentRateLimitBucket_resetAt_idx" ON "DocumentRateLimitBucket"("resetAt");
