export type DemoTransaction = {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  review: "مطابق" | "للمراجعة" | "تحقق من التكرار";
};

export const openingBankBalance = 20_000;

export const demoTransactions: readonly DemoTransaction[] = [
  { date: "01/06", description: "تحصيل من عميل", debit: 0, credit: 10_000, balance: 30_000, review: "مطابق" },
  { date: "02/06", description: "إيجار المكتب", debit: 2_500, credit: 0, balance: 27_500, review: "مطابق" },
  { date: "03/06", description: "مصروفات تشغيل", debit: 1_500, credit: 0, balance: 26_000, review: "للمراجعة" },
  { date: "04/06", description: "إيراد خدمة", debit: 0, credit: 6_000, balance: 32_000, review: "تحقق من التكرار" },
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

export function money(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
