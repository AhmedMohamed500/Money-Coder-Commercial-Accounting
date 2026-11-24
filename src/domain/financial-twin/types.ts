export type FinancialSourceType = "EXCEL" | "CSV" | "BANK_STATEMENT" | "DAFTRA" | "ODOO" | "QUICKBOOKS" | "OTHER_ERP" | "MONEY_CODER";
export type ImportBatchStatus = "LOADED" | "MAPPED" | "VALIDATED" | "CONFIRMED" | "ROLLED_BACK";
export type RecordValidationStatus = "PENDING" | "VALID" | "REJECTED" | "DUPLICATE" | "UNMAPPED";
export type SnapshotValidationStatus = "VALID" | "PARTIAL" | "INVALID";

export interface RawFinancialRecord {
  id: string;
  organizationId: string;
  batchId: string;
  rowNumber: number;
  sourceRecordId: string;
  values: Record<string, string>;
  fingerprint: string;
}

export interface NormalizedFinancialTransaction {
  id: string;
  organizationId: string;
  batchId: string;
  sourceRecordId: string;
  externalTransactionId: string;
  transactionDate: string;
  reference: string;
  description: string;
  externalAccountId: string;
  mappedAccountId?: string;
  debitMinor: number;
  creditMinor: number;
  currency: "EGP" | "USD";
  sourceDocument?: string;
  externalPostingReference?: string;
  dataOrigin: FinancialSourceType;
  validationStatus: RecordValidationStatus;
  validationErrors: string[];
  fingerprint: string;
}

export interface ImportBatch {
  id: string;
  organizationId: string;
  sourceType: FinancialSourceType;
  sourceLabel: string;
  status: ImportBatchStatus;
  createdAt: string;
  mappingVersion: number;
  accountMappings: Record<string, string>;
  rawRecordIds: string[];
  normalizedRecordIds: string[];
  acceptedRows: number;
  rejectedRows: number;
  duplicateRows: number;
  freshnessDate: string;
  errorReport: Array<{ recordId: string; errors: string[] }>;
  rollbackReason?: string;
  correctionOfFindingId?: string;
}

export function isExternalErpSource(source: FinancialSourceType) {
  return ["DAFTRA", "ODOO", "QUICKBOOKS", "OTHER_ERP"].includes(source);
}

export interface FinancialSnapshot {
  id: string;
  organizationId: string;
  batchId: string;
  financialPeriodId: string;
  version: number;
  sourceVersions: string[];
  dataCoverage: { accepted: number; rejected: number; total: number };
  validationStatus: SnapshotValidationStatus;
  createdAt: string;
  currency: "EGP" | "USD";
  mappingVersion: number;
  totals: { debitMinor: number; creditMinor: number; records: number };
  recordIds: string[];
  supersedesSnapshotId?: string;
}

export interface DataQualityMetrics {
  completenessPercent: number;
  validityPercent: number;
  mappingCoveragePercent: number;
  freshnessPercent: number;
  scorePercent: number;
  duplicateRecords: number;
  unmappedAccounts: number;
  rejectedRecords: number;
  missingReferences: number;
  reconciliationDifferenceMinor: number;
}

