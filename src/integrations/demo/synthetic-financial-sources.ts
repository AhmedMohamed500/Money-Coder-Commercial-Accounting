import type { DemoOrganization } from "@/domain/demo/types";
import type { FinancialSourceType, ImportBatch, NormalizedFinancialTransaction, RawFinancialRecord } from "@/domain/financial-twin/types";

interface SyntheticLine {
  sourceRecordId: string;
  transactionId: string;
  date: string;
  reference: string;
  description: string;
  externalAccountId: string;
  debitMinor: number;
  creditMinor: number;
  document?: string;
}

export function createSyntheticImport(organization: DemoOrganization, sourceType: FinancialSourceType, sequence: number) {
  const batchId = `import-${organization.id}-${sequence}`;
  const sourceLabel = `${sourceLabelFor(sourceType)} — Synthetic ${sequence}`;
  const scale = organization.currency === "USD" ? 1 : 10;
  const lines: SyntheticLine[] = [
    line("r-001", "BANK-MISSING-001", "2026-11-03", "EXT-BNK-9001", "تحصيل بنكي خارجي غير مسجل", "EXT-BANK", 45_000 * scale, 0, "bank-sample-2026-11.csv"),
    line("r-002", "BANK-MISSING-001", "2026-11-03", "EXT-BNK-9001", "تحصيل بنكي خارجي غير مسجل", "EXT-REVENUE", 0, 45_000 * scale, "bank-sample-2026-11.csv"),
    line("r-003", "INV-VALID-100", "2026-11-06", "EXT-INV-100", "فاتورة خدمة خارجية", "EXT-AR", 120_000 * scale, 0, "invoice-100.pdf"),
    line("r-004", "INV-VALID-100", "2026-11-06", "EXT-INV-100", "فاتورة خدمة خارجية", "EXT-REVENUE", 0, 120_000 * scale, "invoice-100.pdf"),
    line("r-005", "EXP-UNBAL-200", "2026-11-09", "EXT-EXP-200", "مصروف خارجي يحتاج مراجعة", "EXT-EXPENSE", 30_000 * scale, 0, "expense-200.pdf"),
    line("r-006", "EXP-UNBAL-200", "2026-11-09", "EXT-EXP-200", "مصروف خارجي يحتاج مراجعة", "EXT-BANK", 0, 25_000 * scale, "expense-200.pdf"),
    line("r-007", "CLOSED-300", "2026-03-15", "EXT-CLOSED-300", "حركة واردة في فترة مقفلة", "EXT-EXPENSE", 18_000 * scale, 0, "closed-period.xlsx"),
    line("r-008", "CLOSED-300", "2026-03-15", "EXT-CLOSED-300", "حركة واردة في فترة مقفلة", "EXT-BANK", 0, 18_000 * scale, "closed-period.xlsx"),
    line("r-009", "DUP-400-A", "2026-11-11", "EXT-DUP-400", "فاتورة مورد مكررة محتملة", "EXT-EXPENSE", 22_000 * scale, 0, "supplier-400.pdf"),
    line("r-010", "DUP-400-A", "2026-11-11", "EXT-DUP-400", "فاتورة مورد مكررة محتملة", "EXT-BANK", 0, 22_000 * scale, "supplier-400.pdf"),
    line("r-011", "DUP-400-B", "2026-11-11", "EXT-DUP-400", "فاتورة مورد مكررة محتملة", "EXT-EXPENSE", 22_000 * scale, 0, "supplier-400-copy.pdf"),
    line("r-012", "DUP-400-B", "2026-11-11", "EXT-DUP-400", "فاتورة مورد مكررة محتملة", "EXT-BANK", 0, 22_000 * scale, "supplier-400-copy.pdf"),
    line("r-013", "UNMAPPED-500", "2026-11-14", "EXT-UNMAPPED-500", "حساب خارجي غير مربوط", "EXT-SUSPENSE", 8_000 * scale, 0),
    line("r-014", "UNMAPPED-500", "2026-11-14", "EXT-UNMAPPED-500", "حساب خارجي غير مربوط", "EXT-BANK", 0, 8_000 * scale),
    line("r-015", "MISSING-REF-600", "2026-11-17", "", "سجل يفتقد المرجع الإلزامي", "EXT-EXPENSE", 6_000 * scale, 0),
    line("r-016", "MISSING-REF-600", "2026-11-17", "", "سجل يفتقد المرجع الإلزامي", "EXT-BANK", 0, 6_000 * scale),
  ];
  const rawRecords: RawFinancialRecord[] = lines.map((item, index) => ({
    id: `${batchId}-raw-${index + 1}`,
    organizationId: organization.id,
    batchId,
    rowNumber: index + 2,
    sourceRecordId: item.sourceRecordId,
    values: {
      transaction_id: item.transactionId,
      date: item.date,
      reference: item.reference,
      description: item.description,
      account: item.externalAccountId,
      debit: minorToDecimal(item.debitMinor),
      credit: minorToDecimal(item.creditMinor),
      currency: organization.currency,
      document: item.document ?? "",
    },
    fingerprint: fingerprintFor(item),
  }));
  const normalizedTransactions: NormalizedFinancialTransaction[] = lines.map((item, index) => ({
    id: `${batchId}-normalized-${index + 1}`,
    organizationId: organization.id,
    batchId,
    sourceRecordId: item.sourceRecordId,
    externalTransactionId: item.transactionId,
    transactionDate: item.date,
    reference: item.reference,
    description: item.description,
    externalAccountId: item.externalAccountId,
    debitMinor: item.debitMinor,
    creditMinor: item.creditMinor,
    currency: organization.currency,
    sourceDocument: item.document,
    dataOrigin: sourceType,
    validationStatus: "PENDING",
    validationErrors: [],
    fingerprint: fingerprintFor(item),
  }));
  const batch: ImportBatch = {
    id: batchId,
    organizationId: organization.id,
    sourceType,
    sourceLabel,
    status: "LOADED",
    createdAt: "2026-11-24T10:00:00.000Z",
    mappingVersion: 1,
    accountMappings: {},
    rawRecordIds: rawRecords.map(item => item.id),
    normalizedRecordIds: normalizedTransactions.map(item => item.id),
    acceptedRows: 0,
    rejectedRows: 0,
    duplicateRows: 0,
    freshnessDate: "2026-11-17",
    errorReport: [],
  };
  return { batch, rawRecords, normalizedTransactions };
}

export function suggestedAccountMappings(organizationId: string) {
  return {
    "EXT-BANK": `${organizationId}-1110`,
    "EXT-AR": `${organizationId}-1120`,
    "EXT-REVENUE": `${organizationId}-4110`,
    "EXT-EXPENSE": `${organizationId}-6110`,
  };
}

function line(sourceRecordId: string, transactionId: string, date: string, reference: string, description: string, externalAccountId: string, debitMinor: number, creditMinor: number, document?: string): SyntheticLine {
  return { sourceRecordId, transactionId, date, reference, description, externalAccountId, debitMinor, creditMinor, document };
}

function fingerprintFor(lineItem: SyntheticLine) {
  return [lineItem.date, lineItem.reference, lineItem.externalAccountId, lineItem.debitMinor, lineItem.creditMinor].join("|").toLocaleLowerCase();
}

function minorToDecimal(value: number) {
  return (value / 100).toFixed(2);
}

function sourceLabelFor(sourceType: FinancialSourceType) {
  return ({ EXCEL: "Microsoft Excel", CSV: "CSV", BANK_STATEMENT: "Bank Statement", DAFTRA: "Daftra", ODOO: "Odoo", QUICKBOOKS: "QuickBooks", OTHER_ERP: "Other ERP", MONEY_CODER: "Money Coder Accounting" } as const)[sourceType];
}

