import type { DemoState, OrganizationId } from "@/domain/demo/types";
import type { DataQualityMetrics, FinancialSnapshot, ImportBatch, NormalizedFinancialTransaction, RawFinancialRecord } from "@/domain/financial-twin/types";

export function applyMappings(transactions: NormalizedFinancialTransaction[], mappings: Record<string, string>) {
  return transactions.map(transaction => {
    const mappedAccountId = mappings[transaction.externalAccountId];
    return {
      ...transaction,
      mappedAccountId,
      validationStatus: mappedAccountId ? "PENDING" as const : "UNMAPPED" as const,
      validationErrors: mappedAccountId ? [] : ["UNMAPPED_ACCOUNT"],
    };
  });
}

export function validateImport(batch: ImportBatch, rawRecords: RawFinancialRecord[], transactions: NormalizedFinancialTransaction[], state: DemoState) {
  const organization = state.organizations.find(item => item.id === batch.organizationId);
  if (!organization) throw new Error("الشركة التجريبية غير موجودة.");
  const confirmedFingerprints = new Set(state.importBatches.filter(item => item.organizationId === batch.organizationId && item.status === "CONFIRMED" && item.id !== batch.id).flatMap(item => state.normalizedTransactions.filter(transaction => transaction.batchId === item.id).map(transaction => transaction.fingerprint)));
  const fingerprintCounts = new Map<string, number>();
  transactions.forEach(item => fingerprintCounts.set(item.fingerprint, (fingerprintCounts.get(item.fingerprint) ?? 0) + 1));
  const individuallyValidated = transactions.map(transaction => {
    const errors: string[] = [];
    if (!transaction.transactionDate || !/^\d{4}-\d{2}-\d{2}$/.test(transaction.transactionDate)) errors.push("INVALID_DATE");
    if (!transaction.reference.trim()) errors.push("MISSING_REFERENCE");
    if (!transaction.description.trim()) errors.push("MISSING_DESCRIPTION");
    if (transaction.currency !== organization.currency) errors.push("CURRENCY_MISMATCH");
    if (!Number.isSafeInteger(transaction.debitMinor) || !Number.isSafeInteger(transaction.creditMinor)) errors.push("UNSAFE_AMOUNT");
    if (transaction.debitMinor < 0 || transaction.creditMinor < 0 || (transaction.debitMinor > 0 && transaction.creditMinor > 0) || (transaction.debitMinor === 0 && transaction.creditMinor === 0)) errors.push("INVALID_DEBIT_CREDIT");
    if (!transaction.mappedAccountId || !state.accounts.some(account => account.id === transaction.mappedAccountId && account.organizationId === batch.organizationId)) errors.push("UNMAPPED_ACCOUNT");
    const duplicate = confirmedFingerprints.has(transaction.fingerprint) || (fingerprintCounts.get(transaction.fingerprint) ?? 0) > 1;
    if (duplicate) errors.push("DUPLICATE_RECORD");
    const validationStatus = duplicate ? "DUPLICATE" as const : errors.includes("UNMAPPED_ACCOUNT") ? "UNMAPPED" as const : errors.length ? "REJECTED" as const : "VALID" as const;
    return { ...transaction, validationStatus, validationErrors: [...new Set(errors)] };
  });
  const invalidGroups = new Set(individuallyValidated.filter(item => ["REJECTED", "UNMAPPED"].includes(item.validationStatus)).map(item => item.externalTransactionId));
  const validated = individuallyValidated.map(transaction => invalidGroups.has(transaction.externalTransactionId) && transaction.validationStatus === "VALID"
    ? { ...transaction, validationStatus: "REJECTED" as const, validationErrors: [...transaction.validationErrors, "GROUP_HAS_INVALID_LINE"] }
    : transaction);
  const errorReport = validated.filter(item => item.validationErrors.length).map(item => ({ recordId: item.id, errors: item.validationErrors }));
  const acceptedRows = validated.filter(item => item.validationStatus === "VALID").length;
  const duplicateRows = validated.filter(item => item.validationStatus === "DUPLICATE").length;
  const rejectedRows = validated.length - acceptedRows;
  return {
    batch: { ...batch, status: "VALIDATED" as const, acceptedRows, rejectedRows, duplicateRows, errorReport },
    transactions: validated,
    rawRecords,
  };
}

export function createSnapshot(state: DemoState, batch: ImportBatch, transactions: NormalizedFinancialTransaction[]): FinancialSnapshot {
  if (batch.status !== "VALIDATED") throw new Error("يجب التحقق من الدفعة قبل إنشاء Snapshot.");
  if (!batch.acceptedRows) throw new Error("لا توجد سجلات صالحة لإنشاء Snapshot.");
  const organization = state.organizations.find(item => item.id === batch.organizationId);
  if (!organization) throw new Error("الشركة التجريبية غير موجودة.");
  const period = state.financialPeriods.find(item => item.organizationId === batch.organizationId && batch.freshnessDate >= item.startsAt && batch.freshnessDate <= item.endsAt);
  if (!period) throw new Error("لا توجد فترة مالية تغطي بيانات المصدر.");
  const accepted = transactions.filter(item => item.validationStatus === "VALID");
  const previous = state.financialSnapshots.filter(item => item.organizationId === batch.organizationId).sort((a, b) => b.version - a.version)[0];
  const debitMinor = accepted.reduce((sum, item) => safeAdd(sum, item.debitMinor), 0);
  const creditMinor = accepted.reduce((sum, item) => safeAdd(sum, item.creditMinor), 0);
  return {
    id: `snapshot-${batch.organizationId}-${(previous?.version ?? 0) + 1}`,
    organizationId: batch.organizationId,
    batchId: batch.id,
    financialPeriodId: period.id,
    version: (previous?.version ?? 0) + 1,
    sourceVersions: [`${batch.sourceType}:${batch.id}:v${batch.mappingVersion}`],
    dataCoverage: { accepted: batch.acceptedRows, rejected: batch.rejectedRows, total: transactions.length },
    validationStatus: batch.rejectedRows ? "PARTIAL" : "VALID",
    createdAt: "2026-11-24T10:30:00.000Z",
    currency: organization.currency,
    mappingVersion: batch.mappingVersion,
    totals: { debitMinor, creditMinor, records: accepted.length },
    recordIds: accepted.map(item => item.id),
    supersedesSnapshotId: previous?.id,
  };
}

export function calculateDataQuality(batch: ImportBatch | undefined, rawRecords: RawFinancialRecord[], transactions: NormalizedFinancialTransaction[], today = "2026-11-24"): DataQualityMetrics {
  if (!batch || !transactions.length) return { completenessPercent: 0, validityPercent: 0, mappingCoveragePercent: 0, freshnessPercent: 0, scorePercent: 0, duplicateRecords: 0, unmappedAccounts: 0, rejectedRecords: 0, missingReferences: 0, reconciliationDifferenceMinor: 0 };
  const requiredKeys = ["date", "reference", "description", "account", "currency"];
  const totalRequired = rawRecords.length * requiredKeys.length;
  const completeRequired = rawRecords.reduce((sum, record) => sum + requiredKeys.filter(key => Boolean(record.values[key]?.trim())).length, 0);
  const completenessPercent = percent(completeRequired, totalRequired);
  const validityPercent = percent(transactions.filter(item => item.validationStatus === "VALID").length, transactions.length);
  const mappingCoveragePercent = percent(transactions.filter(item => Boolean(item.mappedAccountId)).length, transactions.length);
  const ageDays = Math.max(0, Math.round((Date.parse(`${today}T00:00:00.000Z`) - Date.parse(`${batch.freshnessDate}T00:00:00.000Z`)) / 86_400_000));
  const freshnessPercent = ageDays <= 7 ? 100 : ageDays <= 30 ? 75 : ageDays <= 90 ? 40 : 0;
  const scorePercent = Math.round((completenessPercent + validityPercent + mappingCoveragePercent + freshnessPercent) / 4);
  const valid = transactions.filter(item => item.validationStatus === "VALID");
  const debit = valid.reduce((sum, item) => safeAdd(sum, item.debitMinor), 0);
  const credit = valid.reduce((sum, item) => safeAdd(sum, item.creditMinor), 0);
  return {
    completenessPercent,
    validityPercent,
    mappingCoveragePercent,
    freshnessPercent,
    scorePercent,
    duplicateRecords: transactions.filter(item => item.validationStatus === "DUPLICATE").length,
    unmappedAccounts: new Set(transactions.filter(item => item.validationErrors.includes("UNMAPPED_ACCOUNT")).map(item => item.externalAccountId)).size,
    rejectedRecords: transactions.filter(item => ["REJECTED", "DUPLICATE", "UNMAPPED"].includes(item.validationStatus)).length,
    missingReferences: transactions.filter(item => item.validationErrors.includes("MISSING_REFERENCE")).length,
    reconciliationDifferenceMinor: Math.abs(debit - credit),
  };
}

export function latestOrganizationBatch(state: DemoState, organizationId: OrganizationId) {
  return state.importBatches.filter(item => item.organizationId === organizationId && item.status !== "ROLLED_BACK").at(0);
}

export function latestOrganizationSnapshot(state: DemoState, organizationId: OrganizationId) {
  return state.financialSnapshots.filter(item => item.organizationId === organizationId).sort((a, b) => b.version - a.version)[0];
}

function percent(numerator: number, denominator: number) {
  return denominator ? Math.round(numerator / denominator * 100) : 0;
}

function safeAdd(left: number, right: number) {
  const result = left + right;
  if (!Number.isSafeInteger(result)) throw new Error("إجمالي البيانات المستوردة تجاوز حدود الدقة الآمنة للعرض.");
  return result;
}

