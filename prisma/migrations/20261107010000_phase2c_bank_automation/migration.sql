CREATE TYPE "AutomationJobStatus" AS ENUM ('CREATED', 'QUEUED', 'PROCESSING', 'NEEDS_REVIEW', 'REVIEWED', 'REVIEW_REJECTED', 'PROCESSING_FAILED', 'TIMED_OUT', 'CANCELLED');
CREATE TYPE "BankReviewStatus" AS ENUM ('PENDING_REVIEW', 'CORRECTION_REQUESTED', 'REVIEWED', 'REJECTED');
CREATE TYPE "BankMathStatus" AS ENUM ('MATCHED', 'MISMATCHED');

ALTER TABLE "CompanyBankAccount" ADD CONSTRAINT "CompanyBankAccount_id_organizationId_key" UNIQUE ("id", "organizationId");

CREATE TABLE "AutomationJob" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "requestedById" UUID NOT NULL,
  "bankAccountId" UUID,
  "processingType" TEXT NOT NULL DEFAULT 'BANK_STATEMENT',
  "sourceReference" VARCHAR(160) NOT NULL,
  "idempotencyKey" VARCHAR(120) NOT NULL,
  "provider" VARCHAR(40) NOT NULL,
  "status" "AutomationJobStatus" NOT NULL DEFAULT 'CREATED',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "resultHash" VARCHAR(64),
  "failureCategory" VARCHAR(40),
  "failureMessage" VARCHAR(240),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AutomationJob_attemptCount_check" CHECK ("attemptCount" BETWEEN 0 AND 10)
);
CREATE UNIQUE INDEX "AutomationJob_id_organizationId_key" ON "AutomationJob"("id", "organizationId");
CREATE UNIQUE INDEX "AutomationJob_organizationId_idempotencyKey_key" ON "AutomationJob"("organizationId", "idempotencyKey");
CREATE INDEX "AutomationJob_organizationId_status_createdAt_idx" ON "AutomationJob"("organizationId", "status", "createdAt");

CREATE TABLE "AutomationEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "jobId" UUID NOT NULL,
  "actorUserId" UUID,
  "action" VARCHAR(80) NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AutomationEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AutomationEvent_organizationId_jobId_createdAt_idx" ON "AutomationEvent"("organizationId", "jobId", "createdAt");

CREATE TABLE "AutomationCallbackNonce" (
  "nonceHash" VARCHAR(64) NOT NULL,
  "organizationId" UUID NOT NULL,
  "jobId" UUID NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AutomationCallbackNonce_pkey" PRIMARY KEY ("nonceHash")
);
CREATE INDEX "AutomationCallbackNonce_expiresAt_idx" ON "AutomationCallbackNonce"("expiresAt");

CREATE TABLE "BankStatement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "jobId" UUID NOT NULL,
  "bankAccountId" UUID NOT NULL,
  "bankFromPdf" VARCHAR(160) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "periodStart" DATE,
  "periodEnd" DATE,
  "openingBalance" DECIMAL(20,3) NOT NULL,
  "totalCredits" DECIMAL(20,3) NOT NULL,
  "totalDebits" DECIMAL(20,3) NOT NULL,
  "closingBalance" DECIMAL(20,3) NOT NULL,
  "difference" DECIMAL(20,3) NOT NULL,
  "mathStatus" "BankMathStatus" NOT NULL,
  "reviewStatus" "BankReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "parserVersion" VARCHAR(80),
  "issues" JSONB NOT NULL DEFAULT '[]',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "reviewedById" UUID,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BankStatement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BankStatement_nonnegative_totals" CHECK ("totalCredits" >= 0 AND "totalDebits" >= 0),
  CONSTRAINT "BankStatement_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$')
);
CREATE UNIQUE INDEX "BankStatement_jobId_key" ON "BankStatement"("jobId");
CREATE UNIQUE INDEX "BankStatement_id_organizationId_key" ON "BankStatement"("id", "organizationId");
CREATE UNIQUE INDEX "BankStatement_jobId_organizationId_key" ON "BankStatement"("jobId", "organizationId");
CREATE INDEX "BankStatement_organizationId_reviewStatus_createdAt_idx" ON "BankStatement"("organizationId", "reviewStatus", "createdAt");

CREATE TABLE "BankStatementTransaction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "statementId" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "sourceTransactionId" VARCHAR(120) NOT NULL,
  "transactionDate" DATE NOT NULL,
  "reference" VARCHAR(160),
  "sourcePage" INTEGER,
  "originalDescription" VARCHAR(1000) NOT NULL,
  "originalDebit" DECIMAL(20,3) NOT NULL,
  "originalCredit" DECIMAL(20,3) NOT NULL,
  "runningBalance" DECIMAL(20,3) NOT NULL,
  "mathStatus" "BankMathStatus" NOT NULL,
  "reviewStatus" "BankReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "correctedDescription" VARCHAR(1000),
  "correctedDebit" DECIMAL(20,3),
  "correctedCredit" DECIMAL(20,3),
  "correctionReason" VARCHAR(500),
  "reviewedById" UUID,
  "reviewedAt" TIMESTAMP(3),
  "revision" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "BankStatementTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BankStatementTransaction_amounts_check" CHECK ("originalDebit" >= 0 AND "originalCredit" >= 0 AND NOT ("originalDebit" > 0 AND "originalCredit" > 0)),
  CONSTRAINT "BankStatementTransaction_sequence_check" CHECK ("sequence" > 0)
);
CREATE UNIQUE INDEX "BankStatementTransaction_statementId_sequence_key" ON "BankStatementTransaction"("statementId", "sequence");
CREATE UNIQUE INDEX "BankStatementTransaction_statementId_sourceTransactionId_key" ON "BankStatementTransaction"("statementId", "sourceTransactionId");
CREATE UNIQUE INDEX "BankStatementTransaction_id_statementId_organizationId_key" ON "BankStatementTransaction"("id", "statementId", "organizationId");
CREATE INDEX "BankStatementTransaction_organizationId_statementId_reviewStatus_idx" ON "BankStatementTransaction"("organizationId", "statementId", "reviewStatus");

CREATE TABLE "BankReviewDecision" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "statementId" UUID NOT NULL,
  "transactionId" UUID,
  "actorUserId" UUID NOT NULL,
  "action" VARCHAR(40) NOT NULL,
  "previous" JSONB NOT NULL DEFAULT '{}',
  "next" JSONB NOT NULL DEFAULT '{}',
  "reason" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BankReviewDecision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BankReviewDecision_organizationId_statementId_createdAt_idx" ON "BankReviewDecision"("organizationId", "statementId", "createdAt");

ALTER TABLE "AutomationJob" ADD CONSTRAINT "AutomationJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AutomationJob" ADD CONSTRAINT "AutomationJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AutomationJob" ADD CONSTRAINT "AutomationJob_bankAccountId_organizationId_fkey" FOREIGN KEY ("bankAccountId", "organizationId") REFERENCES "CompanyBankAccount"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AutomationEvent" ADD CONSTRAINT "AutomationEvent_jobId_organizationId_fkey" FOREIGN KEY ("jobId", "organizationId") REFERENCES "AutomationJob"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AutomationCallbackNonce" ADD CONSTRAINT "AutomationCallbackNonce_jobId_organizationId_fkey" FOREIGN KEY ("jobId", "organizationId") REFERENCES "AutomationJob"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_jobId_organizationId_fkey" FOREIGN KEY ("jobId", "organizationId") REFERENCES "AutomationJob"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_bankAccountId_organizationId_fkey" FOREIGN KEY ("bankAccountId", "organizationId") REFERENCES "CompanyBankAccount"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "BankStatementTransaction" ADD CONSTRAINT "BankStatementTransaction_statementId_organizationId_fkey" FOREIGN KEY ("statementId", "organizationId") REFERENCES "BankStatement"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "BankReviewDecision" ADD CONSTRAINT "BankReviewDecision_statementId_organizationId_fkey" FOREIGN KEY ("statementId", "organizationId") REFERENCES "BankStatement"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "BankReviewDecision" ADD CONSTRAINT "BankReviewDecision_transactionId_statementId_organizationId_fkey" FOREIGN KEY ("transactionId", "statementId", "organizationId") REFERENCES "BankStatementTransaction"("id", "statementId", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "BankReviewDecision" ADD CONSTRAINT "BankReviewDecision_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
