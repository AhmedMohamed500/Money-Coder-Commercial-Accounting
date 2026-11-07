-- Additive local Phase 2B migration. Never apply to Production without a separate migration review.
CREATE TYPE "OpeningBalanceStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REJECTED', 'APPROVED', 'SUPERSEDED');
CREATE TYPE "OpeningImportStatus" AS ENUM ('PREVIEW', 'APPLIED', 'REJECTED');

CREATE UNIQUE INDEX "CompanyFiscalYear_id_organizationId_key" ON "CompanyFiscalYear"("id", "organizationId");

CREATE TABLE "OpeningBalanceBatch" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "fiscalYearId" UUID NOT NULL,
  "openingDate" DATE NOT NULL,
  "baseCurrency" VARCHAR(3) NOT NULL,
  "currencyPrecision" INTEGER NOT NULL,
  "status" "OpeningBalanceStatus" NOT NULL DEFAULT 'DRAFT',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdById" UUID NOT NULL,
  "submittedById" UUID,
  "reviewedById" UUID,
  "approvedById" UUID,
  "submittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "correctionOfId" UUID,
  "correctionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpeningBalanceBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OpeningBalanceBatch_precision_check" CHECK ("currencyPrecision" BETWEEN 0 AND 3),
  CONSTRAINT "OpeningBalanceBatch_currency_check" CHECK ("baseCurrency" ~ '^[A-Z]{3}$')
);

CREATE TABLE "OpeningBalanceLine" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "batchId" UUID NOT NULL,
  "accountId" UUID NOT NULL,
  "accountCode" VARCHAR(24) NOT NULL,
  "accountNameAr" VARCHAR(180) NOT NULL,
  "accountClass" "ChartAccountClass" NOT NULL,
  "normalBalance" "ChartNormalBalance" NOT NULL,
  "debit" DECIMAL(20,3) NOT NULL DEFAULT 0,
  "credit" DECIMAL(20,3) NOT NULL DEFAULT 0,
  "explanation" TEXT,
  "sourceReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpeningBalanceLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OpeningBalanceLine_amount_check" CHECK ("debit" >= 0 AND "credit" >= 0 AND NOT ("debit" > 0 AND "credit" > 0))
);

CREATE TABLE "OpeningImportStage" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "batchId" UUID NOT NULL,
  "fileSha256" VARCHAR(64) NOT NULL,
  "originalName" VARCHAR(180) NOT NULL,
  "rows" JSONB NOT NULL,
  "rowCount" INTEGER NOT NULL,
  "status" "OpeningImportStatus" NOT NULL DEFAULT 'PREVIEW',
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "appliedAt" TIMESTAMP(3),
  CONSTRAINT "OpeningImportStage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OpeningImportStage_row_count_check" CHECK ("rowCount" BETWEEN 0 AND 1000)
);

CREATE UNIQUE INDEX "OpeningBalanceBatch_id_organizationId_key" ON "OpeningBalanceBatch"("id", "organizationId");
CREATE INDEX "OpeningBalanceBatch_organizationId_fiscalYearId_status_idx" ON "OpeningBalanceBatch"("organizationId", "fiscalYearId", "status");
CREATE INDEX "OpeningBalanceBatch_organizationId_createdAt_idx" ON "OpeningBalanceBatch"("organizationId", "createdAt");
CREATE UNIQUE INDEX "OpeningBalanceBatch_one_approved_per_year" ON "OpeningBalanceBatch"("organizationId", "fiscalYearId") WHERE "status" = 'APPROVED';
CREATE UNIQUE INDEX "OpeningBalanceLine_batchId_accountId_key" ON "OpeningBalanceLine"("batchId", "accountId");
CREATE INDEX "OpeningBalanceLine_organizationId_accountId_idx" ON "OpeningBalanceLine"("organizationId", "accountId");
CREATE UNIQUE INDEX "OpeningImportStage_batchId_fileSha256_key" ON "OpeningImportStage"("batchId", "fileSha256");
CREATE INDEX "OpeningImportStage_organizationId_expiresAt_idx" ON "OpeningImportStage"("organizationId", "expiresAt");

ALTER TABLE "OpeningBalanceBatch" ADD CONSTRAINT "OpeningBalanceBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpeningBalanceBatch" ADD CONSTRAINT "OpeningBalanceBatch_fiscalYearId_organizationId_fkey" FOREIGN KEY ("fiscalYearId", "organizationId") REFERENCES "CompanyFiscalYear"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "OpeningBalanceLine" ADD CONSTRAINT "OpeningBalanceLine_batchId_organizationId_fkey" FOREIGN KEY ("batchId", "organizationId") REFERENCES "OpeningBalanceBatch"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "OpeningBalanceLine" ADD CONSTRAINT "OpeningBalanceLine_accountId_organizationId_fkey" FOREIGN KEY ("accountId", "organizationId") REFERENCES "ChartAccount"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "OpeningImportStage" ADD CONSTRAINT "OpeningImportStage_batchId_organizationId_fkey" FOREIGN KEY ("batchId", "organizationId") REFERENCES "OpeningBalanceBatch"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE FUNCTION reject_locked_opening_line_mutation() RETURNS trigger AS $$
DECLARE target_batch UUID;
BEGIN
  target_batch := CASE WHEN TG_OP = 'INSERT' THEN NEW."batchId" ELSE OLD."batchId" END;
  IF EXISTS (SELECT 1 FROM "OpeningBalanceBatch" WHERE "id" = target_batch AND "status" IN ('APPROVED', 'SUPERSEDED')) THEN
    RAISE EXCEPTION 'Approved opening balance lines are locked';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "OpeningBalanceLine_locked_guard"
  BEFORE INSERT OR UPDATE OR DELETE ON "OpeningBalanceLine"
  FOR EACH ROW EXECUTE FUNCTION reject_locked_opening_line_mutation();

CREATE FUNCTION reject_locked_opening_batch_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" IN ('APPROVED', 'SUPERSEDED') THEN RAISE EXCEPTION 'Approved opening balance batches are locked'; END IF;
    RETURN OLD;
  END IF;
  IF OLD."status" IN ('APPROVED', 'SUPERSEDED') AND NOT (
    OLD."status" = 'APPROVED' AND NEW."status" = 'SUPERSEDED'
    AND (to_jsonb(NEW) - 'status' - 'updatedAt') = (to_jsonb(OLD) - 'status' - 'updatedAt')
  ) THEN
    RAISE EXCEPTION 'Approved opening balance batches are locked';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "OpeningBalanceBatch_locked_guard"
  BEFORE UPDATE OR DELETE ON "OpeningBalanceBatch"
  FOR EACH ROW EXECUTE FUNCTION reject_locked_opening_batch_mutation();
