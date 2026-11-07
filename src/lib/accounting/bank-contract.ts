import { z } from "zod";
import { currencyPrecision, formatMinor } from "./opening-money";

export const BANK_CONTRACT_VERSION = "moneycoder.bank-statement.v1";
// MC-04's demonstrated integers are accepted; fractional money must be a decimal string.
const amount = z.union([z.string(), z.number().int().safe()]).transform(value => String(value));
const date = z.iso.date();
const transactionSchema = z.object({
  transactionId: z.string().trim().min(1).max(120),
  date,
  reference: z.string().trim().max(160).nullable().optional(),
  originalDescription: z.string().trim().min(1).max(1000),
  debit: amount,
  credit: amount,
  runningBalance: amount,
  sourcePage: z.number().int().positive().max(10000).optional(),
}).strict();

export const bankResultSchema = z.object({
  contractVersion: z.literal(BANK_CONTRACT_VERSION),
  jobId: z.uuid(),
  processingStatus: z.literal("completed"),
  reviewStatus: z.literal("pending_review"),
  transactionCount: z.number().int().min(1).max(1000),
  currency: z.string().regex(/^[A-Z]{3}$/),
  bankFromPdf: z.string().trim().min(1).max(160),
  periodStart: date.optional(),
  periodEnd: date.optional(),
  openingBalance: amount,
  totalCredits: amount,
  totalDebits: amount,
  closingBalance: amount,
  arithmeticStatus: z.enum(["matched", "mismatched"]).optional(),
  difference: amount.optional(),
  issues: z.array(z.string().trim().min(1).max(240)).max(30).default([]),
  parserVersion: z.string().trim().max(80).optional(),
  transactions: z.array(transactionSchema).min(1).max(1000),
}).strict();

export class BankContractError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}

export function bankMinor(value: string, precision: number): bigint {
  if (!/^-?\d{1,16}(?:\.\d{1,3})?$/.test(value)) throw new BankContractError("قيمة مالية غير صالحة أو تتجاوز الحد.");
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = (negative ? value.slice(1) : value).split(".");
  if (fraction.length > precision) throw new BankContractError("دقة المبلغ لا تطابق العملة.");
  const minor = BigInt(whole) * BigInt(10) ** BigInt(precision) + BigInt(fraction.padEnd(precision, "0") || "0");
  return negative ? -minor : minor;
}

export function validateBankResult(input: unknown) {
  const parsed = bankResultSchema.safeParse(input);
  if (!parsed.success) throw new BankContractError("نتيجة المعالجة لا تطابق العقد المالي المعتمد.");
  const data = parsed.data;
  if (data.transactionCount !== data.transactions.length) throw new BankContractError("عدد الحركات لا يطابق البيانات.");
  if (data.periodStart && data.periodEnd && data.periodStart > data.periodEnd) throw new BankContractError("فترة الكشف غير صالحة.");
  const precision = currencyPrecision(data.currency);
  if (precision > 3) throw new BankContractError("دقة العملة غير مدعومة.");
  const opening = bankMinor(data.openingBalance, precision);
  const claimedCredits = bankMinor(data.totalCredits, precision);
  const claimedDebits = bankMinor(data.totalDebits, precision);
  const closing = bankMinor(data.closingBalance, precision);
  if (claimedCredits < BigInt(0) || claimedDebits < BigInt(0)) throw new BankContractError("إجماليات الكشف لا تقبل القيم السالبة.");
  let running = opening;
  let credits = BigInt(0);
  let debits = BigInt(0);
  const seen = new Set<string>();
  const rows = data.transactions.map((transaction, index) => {
    if (seen.has(transaction.transactionId)) throw new BankContractError("معرّف حركة مكرر.");
    seen.add(transaction.transactionId);
    const debit = bankMinor(transaction.debit, precision);
    const credit = bankMinor(transaction.credit, precision);
    if (debit < BigInt(0) || credit < BigInt(0) || (debit > BigInt(0) && credit > BigInt(0))) throw new BankContractError("جانب الحركة المدين أو الدائن غير صالح.");
    debits += debit; credits += credit; running += credit - debit;
    const claimedRunning = bankMinor(transaction.runningBalance, precision);
    return {
      sequence: index + 1, sourceTransactionId: transaction.transactionId,
      transactionDate: new Date(`${transaction.date}T00:00:00.000Z`),
      reference: transaction.reference ?? null, sourcePage: transaction.sourcePage ?? null,
      originalDescription: transaction.originalDescription,
      originalDebit: formatMinor(debit, precision), originalCredit: formatMinor(credit, precision),
      runningBalance: formatMinor(claimedRunning, precision),
      mathStatus: claimedRunning === running ? "MATCHED" as const : "MISMATCHED" as const,
    };
  });
  const difference = opening + credits - debits - closing;
  const mathStatus = difference === BigInt(0) && credits === claimedCredits && debits === claimedDebits && rows.every(row => row.mathStatus === "MATCHED") ? "MATCHED" as const : "MISMATCHED" as const;
  return {
    jobId: data.jobId, bankFromPdf: data.bankFromPdf, currency: data.currency,
    periodStart: data.periodStart ? new Date(`${data.periodStart}T00:00:00.000Z`) : null,
    periodEnd: data.periodEnd ? new Date(`${data.periodEnd}T00:00:00.000Z`) : null,
    openingBalance: formatMinor(opening, precision), totalCredits: formatMinor(claimedCredits, precision),
    totalDebits: formatMinor(claimedDebits, precision), closingBalance: formatMinor(closing, precision),
    difference: formatMinor(difference, precision), mathStatus, rows,
    parserVersion: data.parserVersion ?? null,
    issues: data.issues, issueCount: data.issues.length,
  };
}
