CREATE TYPE "DocumentScanStatus" AS ENUM ('PENDING_SCAN', 'SCANNING', 'CLEAN', 'REJECTED', 'SCAN_FAILED');

ALTER TABLE "FileAsset"
    ADD COLUMN "scanStatus" "DocumentScanStatus",
    ADD COLUMN "scanRevision" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "scanAttemptCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "scanNextAttemptAt" TIMESTAMP(3),
    ADD COLUMN "scanLeaseToken" UUID,
    ADD COLUMN "scanLeaseExpiresAt" TIMESTAMP(3),
    ADD COLUMN "scanStartedAt" TIMESTAMP(3),
    ADD COLUMN "scanCompletedAt" TIMESTAMP(3),
    ADD COLUMN "scanProvider" TEXT,
    ADD COLUMN "scanEngineVersion" TEXT,
    ADD COLUMN "scanDefinitionsVersion" TEXT,
    ADD COLUMN "scanResultSha256" TEXT,
    ADD COLUMN "scanErrorCode" TEXT,
    ADD COLUMN "scanUpdatedAt" TIMESTAMP(3);

CREATE TABLE "DocumentScanAttempt" (
    "id" UUID NOT NULL,
    "fileAssetId" UUID,
    "fileAssetIdentity" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "leaseToken" UUID NOT NULL,
    "status" "DocumentScanStatus" NOT NULL,
    "expectedSha256" TEXT NOT NULL,
    "resultSha256" TEXT,
    "provider" TEXT,
    "engineVersion" TEXT,
    "definitionsVersion" TEXT,
    "errorCode" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentScanAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FileAsset_scanStatus_scanNextAttemptAt_idx" ON "FileAsset"("scanStatus", "scanNextAttemptAt");
CREATE INDEX "FileAsset_scanStatus_scanLeaseExpiresAt_idx" ON "FileAsset"("scanStatus", "scanLeaseExpiresAt");
CREATE UNIQUE INDEX "DocumentScanAttempt_leaseToken_key" ON "DocumentScanAttempt"("leaseToken");
CREATE UNIQUE INDEX "DocumentScanAttempt_fileAssetIdentity_revision_attemptNumber_key" ON "DocumentScanAttempt"("fileAssetIdentity", "revision", "attemptNumber");
CREATE INDEX "DocumentScanAttempt_fileAssetId_createdAt_idx" ON "DocumentScanAttempt"("fileAssetId", "createdAt");

ALTER TABLE "DocumentScanAttempt"
    ADD CONSTRAINT "DocumentScanAttempt_fileAssetId_fkey"
    FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
