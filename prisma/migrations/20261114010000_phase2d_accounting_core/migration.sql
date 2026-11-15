CREATE TYPE "AccountingPeriodStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'REJECTED', 'REVERSED');
CREATE TYPE "JournalEntryType" AS ENUM ('GENERAL', 'OPENING', 'REVERSAL', 'CORRECTION');
CREATE TYPE "JournalSourceType" AS ENUM ('MANUAL', 'OPENING_BALANCE', 'BANK_STATEMENT', 'DOCUMENT');

CREATE TABLE "AccountingPeriod" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "fiscalYearId" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "startsAt" DATE NOT NULL,
  "endsAt" DATE NOT NULL,
  "status" "AccountingPeriodStatus" NOT NULL DEFAULT 'OPEN',
  "closedById" UUID,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountingPeriod_dates_check" CHECK ("startsAt" <= "endsAt"),
  CONSTRAINT "AccountingPeriod_sequence_check" CHECK ("sequence" > 0),
  CONSTRAINT "AccountingPeriod_close_metadata_check" CHECK (("status" = 'OPEN' AND "closedAt" IS NULL AND "closedById" IS NULL) OR ("status" = 'CLOSED' AND "closedAt" IS NOT NULL AND "closedById" IS NOT NULL))
);

CREATE TABLE "JournalEntry" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "fiscalYearId" UUID NOT NULL,
  "periodId" UUID NOT NULL,
  "entryNumber" INTEGER,
  "reference" VARCHAR(80) NOT NULL,
  "description" VARCHAR(500) NOT NULL,
  "transactionDate" DATE NOT NULL,
  "postingDate" DATE NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "currencyPrecision" INTEGER NOT NULL,
  "entryType" "JournalEntryType" NOT NULL DEFAULT 'GENERAL',
  "sourceType" "JournalSourceType" NOT NULL DEFAULT 'MANUAL',
  "sourceReference" VARCHAR(160),
  "sourceRevision" VARCHAR(80),
  "evidenceTimestamp" TIMESTAMP(3),
  "idempotencyKey" VARCHAR(120) NOT NULL,
  "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "totalDebit" DECIMAL(20,3) NOT NULL DEFAULT 0,
  "totalCredit" DECIMAL(20,3) NOT NULL DEFAULT 0,
  "createdById" UUID NOT NULL,
  "submittedById" UUID,
  "approvedById" UUID,
  "postedById" UUID,
  "rejectedById" UUID,
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "postedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "rejectionReason" VARCHAR(500),
  "openingBalanceBatchId" UUID,
  "reversalOfId" UUID,
  "correctionOfId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JournalEntry_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "JournalEntry_precision_check" CHECK ("currencyPrecision" BETWEEN 0 AND 3),
  CONSTRAINT "JournalEntry_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "JournalEntry_number_check" CHECK ("entryNumber" IS NULL OR "entryNumber" > 0),
  CONSTRAINT "JournalEntry_total_check" CHECK ("totalDebit" >= 0 AND "totalCredit" >= 0)
);

CREATE TABLE "JournalLine" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "entryId" UUID NOT NULL,
  "accountId" UUID NOT NULL,
  "lineNumber" INTEGER NOT NULL,
  "description" VARCHAR(500),
  "debit" DECIMAL(20,3) NOT NULL DEFAULT 0,
  "credit" DECIMAL(20,3) NOT NULL DEFAULT 0,
  "sourceReference" VARCHAR(160),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JournalLine_line_number_check" CHECK ("lineNumber" > 0),
  CONSTRAINT "JournalLine_amount_check" CHECK ("debit" >= 0 AND "credit" >= 0 AND (("debit" > 0 AND "credit" = 0) OR ("credit" > 0 AND "debit" = 0)))
);

CREATE TABLE "JournalEntryEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "entryId" UUID NOT NULL,
  "actorUserId" UUID NOT NULL,
  "action" VARCHAR(60) NOT NULL,
  "fromStatus" "JournalEntryStatus",
  "toStatus" "JournalEntryStatus",
  "reason" VARCHAR(500),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JournalEntryEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JournalEvidenceLink" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "entryId" UUID NOT NULL,
  "lineId" UUID,
  "documentId" UUID,
  "statementId" UUID,
  "bankTransactionId" UUID,
  "auditEventId" UUID,
  "sourceType" VARCHAR(40) NOT NULL,
  "sourceId" VARCHAR(160) NOT NULL,
  "sourceRevision" VARCHAR(80),
  "evidenceAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "JournalEvidenceLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JournalEvidenceLink_bank_pair_check" CHECK (("bankTransactionId" IS NULL AND "statementId" IS NULL) OR ("bankTransactionId" IS NOT NULL AND "statementId" IS NOT NULL))
);

CREATE UNIQUE INDEX "AccountingPeriod_id_organizationId_fiscalYearId_key" ON "AccountingPeriod"("id", "organizationId", "fiscalYearId");
CREATE UNIQUE INDEX "AccountingPeriod_organizationId_fiscalYearId_sequence_key" ON "AccountingPeriod"("organizationId", "fiscalYearId", "sequence");
CREATE UNIQUE INDEX "AccountingPeriod_organizationId_startsAt_endsAt_key" ON "AccountingPeriod"("organizationId", "startsAt", "endsAt");
CREATE INDEX "AccountingPeriod_organizationId_status_startsAt_idx" ON "AccountingPeriod"("organizationId", "status", "startsAt");

CREATE UNIQUE INDEX "JournalEntry_id_organizationId_key" ON "JournalEntry"("id", "organizationId");
CREATE UNIQUE INDEX "JournalEntry_organizationId_reference_key" ON "JournalEntry"("organizationId", "reference");
CREATE UNIQUE INDEX "JournalEntry_organizationId_idempotencyKey_key" ON "JournalEntry"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "JournalEntry_organizationId_entryNumber_key" ON "JournalEntry"("organizationId", "entryNumber");
CREATE UNIQUE INDEX "JournalEntry_openingBalanceBatchId_organizationId_key" ON "JournalEntry"("openingBalanceBatchId", "organizationId");
CREATE UNIQUE INDEX "JournalEntry_reversalOfId_organizationId_key" ON "JournalEntry"("reversalOfId", "organizationId");
CREATE UNIQUE INDEX "JournalEntry_correctionOfId_organizationId_key" ON "JournalEntry"("correctionOfId", "organizationId");
CREATE INDEX "JournalEntry_organizationId_fiscalYearId_postingDate_idx" ON "JournalEntry"("organizationId", "fiscalYearId", "postingDate");
CREATE INDEX "JournalEntry_organizationId_status_createdAt_idx" ON "JournalEntry"("organizationId", "status", "createdAt");

CREATE UNIQUE INDEX "JournalLine_id_entryId_organizationId_key" ON "JournalLine"("id", "entryId", "organizationId");
CREATE UNIQUE INDEX "JournalLine_entryId_lineNumber_key" ON "JournalLine"("entryId", "lineNumber");
CREATE INDEX "JournalLine_organizationId_accountId_entryId_idx" ON "JournalLine"("organizationId", "accountId", "entryId");
CREATE INDEX "JournalEntryEvent_organizationId_entryId_createdAt_idx" ON "JournalEntryEvent"("organizationId", "entryId", "createdAt");
CREATE INDEX "JournalEvidenceLink_organizationId_entryId_evidenceAt_idx" ON "JournalEvidenceLink"("organizationId", "entryId", "evidenceAt");
CREATE INDEX "JournalEvidenceLink_organizationId_sourceType_sourceId_idx" ON "JournalEvidenceLink"("organizationId", "sourceType", "sourceId");

ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_fiscalYearId_organizationId_fkey" FOREIGN KEY ("fiscalYearId", "organizationId") REFERENCES "CompanyFiscalYear"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AccountingPeriod" ADD CONSTRAINT "AccountingPeriod_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_fiscalYearId_organizationId_fkey" FOREIGN KEY ("fiscalYearId", "organizationId") REFERENCES "CompanyFiscalYear"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_periodId_organizationId_fiscalYearId_fkey" FOREIGN KEY ("periodId", "organizationId", "fiscalYearId") REFERENCES "AccountingPeriod"("id", "organizationId", "fiscalYearId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_openingBalanceBatchId_organizationId_fkey" FOREIGN KEY ("openingBalanceBatchId", "organizationId") REFERENCES "OpeningBalanceBatch"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_reversalOfId_organizationId_fkey" FOREIGN KEY ("reversalOfId", "organizationId") REFERENCES "JournalEntry"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_correctionOfId_organizationId_fkey" FOREIGN KEY ("correctionOfId", "organizationId") REFERENCES "JournalEntry"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_entryId_organizationId_fkey" FOREIGN KEY ("entryId", "organizationId") REFERENCES "JournalEntry"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_accountId_organizationId_fkey" FOREIGN KEY ("accountId", "organizationId") REFERENCES "ChartAccount"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE "JournalEntryEvent" ADD CONSTRAINT "JournalEntryEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalEntryEvent" ADD CONSTRAINT "JournalEntryEvent_entryId_organizationId_fkey" FOREIGN KEY ("entryId", "organizationId") REFERENCES "JournalEntry"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "JournalEntryEvent" ADD CONSTRAINT "JournalEntryEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "JournalEvidenceLink" ADD CONSTRAINT "JournalEvidenceLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JournalEvidenceLink" ADD CONSTRAINT "JournalEvidenceLink_entryId_organizationId_fkey" FOREIGN KEY ("entryId", "organizationId") REFERENCES "JournalEntry"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "JournalEvidenceLink" ADD CONSTRAINT "JournalEvidenceLink_lineId_entryId_organizationId_fkey" FOREIGN KEY ("lineId", "entryId", "organizationId") REFERENCES "JournalLine"("id", "entryId", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "JournalEvidenceLink" ADD CONSTRAINT "JournalEvidenceLink_documentId_organizationId_fkey" FOREIGN KEY ("documentId", "organizationId") REFERENCES "CompanyDocument"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "JournalEvidenceLink" ADD CONSTRAINT "JournalEvidenceLink_bankTransactionId_statementId_organizationId_fkey" FOREIGN KEY ("bankTransactionId", "statementId", "organizationId") REFERENCES "BankStatementTransaction"("id", "statementId", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "JournalEvidenceLink" ADD CONSTRAINT "JournalEvidenceLink_auditEventId_fkey" FOREIGN KEY ("auditEventId") REFERENCES "AuditEvent"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE FUNCTION reject_overlapping_accounting_periods() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "AccountingPeriod" p
    WHERE p."organizationId" = NEW."organizationId"
      AND p."fiscalYearId" = NEW."fiscalYearId"
      AND p."id" <> NEW."id"
      AND daterange(p."startsAt", p."endsAt", '[]') && daterange(NEW."startsAt", NEW."endsAt", '[]')
  ) THEN RAISE EXCEPTION 'Accounting periods cannot overlap'; END IF;
  IF TG_OP = 'UPDATE' AND OLD."status" = 'CLOSED' AND NEW."status" <> 'CLOSED' THEN
    RAISE EXCEPTION 'Closed accounting periods cannot be reopened by direct mutation';
  END IF;
  IF NEW."status" = 'CLOSED' AND EXISTS (
    SELECT 1 FROM "JournalEntry" j WHERE j."periodId" = NEW."id" AND j."status" IN ('SUBMITTED', 'APPROVED')
  ) THEN RAISE EXCEPTION 'Accounting period has entries awaiting completion'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AccountingPeriod_integrity_guard"
  BEFORE INSERT OR UPDATE ON "AccountingPeriod"
  FOR EACH ROW EXECUTE FUNCTION reject_overlapping_accounting_periods();

CREATE FUNCTION validate_journal_posting() RETURNS trigger AS $$
DECLARE
  line_count INTEGER;
  debit_total DECIMAL(20,3);
  credit_total DECIMAL(20,3);
  invalid_accounts INTEGER;
  target_period "AccountingPeriod"%ROWTYPE;
BEGIN
  IF NEW."status" = 'POSTED' AND OLD."status" <> 'POSTED' THEN
    SELECT * INTO target_period FROM "AccountingPeriod" WHERE "id" = NEW."periodId" FOR UPDATE;
    IF target_period."status" <> 'OPEN' OR NEW."postingDate" < target_period."startsAt" OR NEW."postingDate" > target_period."endsAt" THEN
      RAISE EXCEPTION 'Journal posting period is closed or does not contain posting date';
    END IF;
    SELECT COUNT(*), COALESCE(SUM("debit"), 0), COALESCE(SUM("credit"), 0)
      INTO line_count, debit_total, credit_total FROM "JournalLine" WHERE "entryId" = NEW."id";
    IF line_count < 2 OR debit_total <= 0 OR debit_total <> credit_total THEN
      RAISE EXCEPTION 'Journal entry is not balanced';
    END IF;
    SELECT COUNT(*) INTO invalid_accounts
      FROM "JournalLine" l JOIN "ChartAccount" a ON a."id" = l."accountId" AND a."organizationId" = l."organizationId"
      WHERE l."entryId" = NEW."id" AND (NOT a."isPostable" OR NOT a."isActive" OR a."deletedAt" IS NOT NULL);
    IF invalid_accounts > 0 THEN RAISE EXCEPTION 'Journal entry contains a non-postable account'; END IF;
    IF NEW."totalDebit" <> debit_total OR NEW."totalCredit" <> credit_total THEN
      RAISE EXCEPTION 'Journal header totals do not match lines';
    END IF;
    IF NEW."postedAt" IS NULL OR NEW."postedById" IS NULL OR NEW."entryNumber" IS NULL THEN
      RAISE EXCEPTION 'Posted journal metadata is incomplete';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "JournalEntry_posting_guard"
  BEFORE UPDATE OF "status" ON "JournalEntry"
  FOR EACH ROW EXECUTE FUNCTION validate_journal_posting();

CREATE FUNCTION reject_posted_journal_entry_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD."status" IN ('POSTED', 'REVERSED') THEN
    RAISE EXCEPTION 'Posted journal entries are immutable';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD."status" = 'REVERSED' THEN
    RAISE EXCEPTION 'Reversed journal entries are immutable';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD."status" = 'POSTED' THEN
    IF NOT (
      NEW."status" = 'REVERSED'
      AND NEW."revision" = OLD."revision" + 1
      AND (to_jsonb(NEW) - 'status' - 'revision' - 'updatedAt') = (to_jsonb(OLD) - 'status' - 'revision' - 'updatedAt')
    ) THEN RAISE EXCEPTION 'Posted journal entries are immutable'; END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "JournalEntry_immutable_guard"
  BEFORE UPDATE OR DELETE ON "JournalEntry"
  FOR EACH ROW EXECUTE FUNCTION reject_posted_journal_entry_mutation();

CREATE FUNCTION reject_posted_journal_line_mutation() RETURNS trigger AS $$
DECLARE target_entry UUID;
BEGIN
  target_entry := CASE WHEN TG_OP = 'INSERT' THEN NEW."entryId" ELSE OLD."entryId" END;
  IF EXISTS (SELECT 1 FROM "JournalEntry" WHERE "id" = target_entry AND "status" IN ('POSTED', 'REVERSED')) THEN
    RAISE EXCEPTION 'Posted journal lines are immutable';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "JournalLine_immutable_guard"
  BEFORE INSERT OR UPDATE OR DELETE ON "JournalLine"
  FOR EACH ROW EXECUTE FUNCTION reject_posted_journal_line_mutation();

CREATE FUNCTION reject_journal_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Journal history is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "JournalEntryEvent_append_only"
  BEFORE UPDATE OR DELETE ON "JournalEntryEvent"
  FOR EACH ROW EXECUTE FUNCTION reject_journal_history_mutation();

CREATE TRIGGER "JournalEvidenceLink_append_only"
  BEFORE UPDATE OR DELETE ON "JournalEvidenceLink"
  FOR EACH ROW EXECUTE FUNCTION reject_journal_history_mutation();
