-- Additive Phase 2A schema. Apply only after a reviewed production migration plan.
CREATE TYPE "CompanyBusinessActivity" AS ENUM ('COMMERCIAL', 'INDUSTRIAL', 'SERVICE');
CREATE TYPE "ChartAccountClass" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
CREATE TYPE "ChartReportGroup" AS ENUM ('ASSET_TOTAL', 'LIABILITY_TOTAL', 'REVENUE_TOTAL', 'EXPENSE_TOTAL', 'CURRENT_ASSET', 'NONCURRENT_ASSET', 'CURRENT_LIABILITY', 'NONCURRENT_LIABILITY', 'EQUITY', 'TRADING_REVENUE', 'CONTRA_REVENUE', 'OTHER_INCOME', 'COST_OF_SALES', 'SELLING_EXPENSE', 'ADMIN_EXPENSE', 'STAFF_EXPENSE', 'DEPRECIATION_EXPENSE', 'FINANCE_COST', 'OTHER_EXPENSE', 'INCOME_TAX_EXPENSE');
CREATE TYPE "ChartNormalBalance" AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE "ChartChangeAction" AS ENUM ('UPDATE', 'DEACTIVATE', 'DELETE');
CREATE TYPE "ChartChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "CompanyAccountingSettings" ADD COLUMN "businessActivity" "CompanyBusinessActivity";

CREATE TABLE "ChartInstallation" (
  "organizationId" UUID NOT NULL,
  "activity" "CompanyBusinessActivity" NOT NULL,
  "templateVersion" TEXT NOT NULL,
  "accountCount" INTEGER NOT NULL,
  "installedById" UUID NOT NULL,
  "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChartInstallation_pkey" PRIMARY KEY ("organizationId")
);

CREATE TABLE "ChartAccount" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "code" VARCHAR(24) NOT NULL,
  "nameAr" VARCHAR(180) NOT NULL,
  "nameEn" VARCHAR(180),
  "description" TEXT,
  "parentId" UUID,
  "accountClass" "ChartAccountClass" NOT NULL,
  "reportGroup" "ChartReportGroup" NOT NULL,
  "normalBalance" "ChartNormalBalance" NOT NULL,
  "isContra" BOOLEAN NOT NULL DEFAULT false,
  "isPostable" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "inventoryMethod" "InventoryMethod",
  "origin" TEXT NOT NULL DEFAULT 'MANUAL',
  "templateVersion" TEXT,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdById" UUID,
  "updatedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "ChartAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChartChangeRequest" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "accountId" UUID NOT NULL,
  "accountRevision" INTEGER NOT NULL,
  "action" "ChartChangeAction" NOT NULL,
  "proposed" JSONB NOT NULL DEFAULT '{}',
  "reason" TEXT NOT NULL,
  "status" "ChartChangeStatus" NOT NULL DEFAULT 'PENDING',
  "requestedById" UUID NOT NULL,
  "decidedById" UUID,
  "decisionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  CONSTRAINT "ChartChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChartAccount_id_organizationId_key" ON "ChartAccount"("id", "organizationId");
CREATE UNIQUE INDEX "ChartAccount_organizationId_code_key" ON "ChartAccount"("organizationId", "code");
CREATE INDEX "ChartAccount_organizationId_parentId_deletedAt_idx" ON "ChartAccount"("organizationId", "parentId", "deletedAt");
CREATE INDEX "ChartAccount_organizationId_accountClass_isActive_idx" ON "ChartAccount"("organizationId", "accountClass", "isActive");
CREATE INDEX "ChartChangeRequest_organizationId_status_createdAt_idx" ON "ChartChangeRequest"("organizationId", "status", "createdAt");
CREATE INDEX "ChartChangeRequest_organizationId_accountId_createdAt_idx" ON "ChartChangeRequest"("organizationId", "accountId", "createdAt");

ALTER TABLE "ChartInstallation" ADD CONSTRAINT "ChartInstallation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChartAccount" ADD CONSTRAINT "ChartAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChartAccount" ADD CONSTRAINT "ChartAccount_parentId_organizationId_fkey" FOREIGN KEY ("parentId", "organizationId") REFERENCES "ChartAccount"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "ChartChangeRequest" ADD CONSTRAINT "ChartChangeRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChartChangeRequest" ADD CONSTRAINT "ChartChangeRequest_accountId_organizationId_fkey" FOREIGN KEY ("accountId", "organizationId") REFERENCES "ChartAccount"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Financial statement and contra-account invariants are revalidated by the service.
ALTER TABLE "ChartAccount" ADD CONSTRAINT "ChartAccount_code_format" CHECK ("code" ~ '^[0-9]{4}([0-9]{2})*$');
ALTER TABLE "ChartAccount" ADD CONSTRAINT "ChartAccount_no_self_parent" CHECK ("parentId" IS NULL OR "parentId" <> "id");
ALTER TABLE "ChartAccount" ADD CONSTRAINT "ChartAccount_origin" CHECK ("origin" IN ('MANUAL', 'TEMPLATE'));
