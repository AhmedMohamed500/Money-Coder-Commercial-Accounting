import { BANK_CONTRACT_VERSION } from "./bank-contract";

const credits = [10000, 8500, 7200, 6000, 9000, 8000, 8000];
const debits = [4000, 3200, 5100, 3800, 2200, 4300, 5000, 5410];

/** Synthetic sample only. No PDF, customer information, or banking connection. */
export function horizonFixture(jobId: string) {
  let balance = 42500;
  const transactions = Array.from({ length: 15 }, (_, index) => {
    const credit = index < credits.length ? credits[index] : 0;
    const debit = index >= credits.length ? debits[index - credits.length] : 0;
    balance += credit - debit;
    return {
      transactionId: `HORIZON-DEMO-${String(index + 1).padStart(3, "0")}`,
      date: `2026-01-${String(index + 1).padStart(2, "0")}`,
      reference: `DEMO-${String(index + 1).padStart(3, "0")}`,
      originalDescription: `حركة تجريبية رقم ${index + 1} — بيانات اصطناعية`,
      debit: String(debit), credit: String(credit), runningBalance: String(balance),
    };
  });
  return {
    contractVersion: BANK_CONTRACT_VERSION, jobId, processingStatus: "completed" as const,
    reviewStatus: "pending_review" as const, transactionCount: 15, currency: "EGP",
    bankFromPdf: "Horizon — مثال اصطناعي", periodStart: "2026-01-01", periodEnd: "2026-01-15",
    openingBalance: "42500", totalCredits: "56700", totalDebits: "33010", closingBalance: "66190",
    arithmeticStatus: "matched" as const, difference: "0", issues: [], parserVersion: "synthetic-v1", transactions,
  };
}
