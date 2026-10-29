export type DemoTransaction = {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  review: "مطابق" | "للمراجعة" | "تحقق من التكرار";
  reference: string;
  reviewReason: string;
};

export const demoBankName = "بنك المثال الافتراضي";
export const demoStatementPeriod = "01–04 يونيو 2026";
export const demoAccountNumber = "•••• 2048";
export const openingBankBalance = 20_000;

export const demoTransactions: readonly DemoTransaction[] = [
  { date: "01/06", description: "تحصيل من عميل", debit: 0, credit: 10_000, balance: 30_000, review: "مطابق", reference: "TX-0601", reviewReason: "مطابق لكشف الحساب؛ يُراجع المستند قبل الاعتماد." },
  { date: "02/06", description: "إيجار المكتب", debit: 2_500, credit: 0, balance: 27_500, review: "مطابق", reference: "TX-0602", reviewReason: "مطابق للبيان والمبلغ الواردين في الكشف." },
  { date: "03/06", description: "مصروفات تشغيل", debit: 1_500, credit: 0, balance: 26_000, review: "للمراجعة", reference: "TX-0603", reviewReason: "وصف الحركة لا يحدد نوع المصروف؛ يلزم فحص المستند المرتبط." },
  { date: "04/06", description: "إيراد خدمة", debit: 0, credit: 6_000, balance: 32_000, review: "تحقق من التكرار", reference: "TX-0604", reviewReason: "قد يتكرر مرجع التحصيل في المسودة؛ يلزم التحقق يدويًا." },
];

export const totalCredits = demoTransactions.reduce((total, item) => total + item.credit, 0);
export const totalDebits = demoTransactions.reduce((total, item) => total + item.debit, 0);
export const closingBankBalance = openingBankBalance + totalCredits - totalDebits;

export const trialBalance = [
  { code: "1010", account: "البنك", debit: 32_000, credit: 0 },
  { code: "1110", account: "العملاء", debit: 15_000, credit: 0 },
  { code: "1210", account: "المخزون", debit: 15_000, credit: 0 },
  { code: "5100", account: "مصروف الإيجار", debit: 2_500, credit: 0 },
  { code: "5200", account: "مصروفات تشغيل", debit: 1_500, credit: 0 },
  { code: "2010", account: "الموردون", debit: 0, credit: 10_000 },
  { code: "3010", account: "رأس المال", debit: 0, credit: 50_000 },
  { code: "4100", account: "إيراد الخدمات", debit: 0, credit: 6_000 },
] as const;

export const trialDebitTotal = trialBalance.reduce((total, account) => total + account.debit, 0);
export const trialCreditTotal = trialBalance.reduce((total, account) => total + account.credit, 0);

export const incomeStatement = { revenue: 6_000, expenses: totalDebits, profit: 6_000 - totalDebits } as const;
export const financialPosition = {
  assets: closingBankBalance + 15_000 + 15_000,
  liabilities: 10_000,
  equity: 50_000 + incomeStatement.profit,
} as const;
export const factoryExample = {
  materials: 120_000,
  labor: 60_000,
  overhead: 40_000,
  sales: 300_000,
  administration: 20_000,
  selling: 10_000,
} as const;
export const factoryProductionCost = factoryExample.materials + factoryExample.labor + factoryExample.overhead;
export const factoryGrossProfit = factoryExample.sales - factoryProductionCost;
export const factoryOperatingProfit = factoryGrossProfit - factoryExample.administration - factoryExample.selling;

export const customerCollectionEntry = {
  reference: "JV-2026-014",
  date: "01/06/2026",
  bankDebit: demoTransactions[0].credit,
  receivablesCredit: demoTransactions[0].credit,
} as const;

export function money(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
