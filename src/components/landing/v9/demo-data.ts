export type Persona = "owner" | "accountant" | "finance" | "office";
export type Sector = "commercial" | "factory" | "accountingOffice";

export const personas: { id: Persona; label: string; question: string }[] = [
  { id: "owner", label: "صاحب شركة", question: "إيه اللي محتاج قرارك اليوم؟" },
  { id: "accountant", label: "محاسب", question: "أي حركة تحتاج مستندًا ومراجعة؟" },
  { id: "finance", label: "مدير مالي", question: "كيف تتغير السيولة لو تأخر التحصيل؟" },
  { id: "office", label: "مدير مكتب محاسبة", question: "أي عميل ينتظر تفويضًا أو اعتمادًا؟" },
];

export const sectors: Record<Sector, {
  label: string;
  company: string;
  image: string;
  imageAlt: string;
  focus: string;
  current: string;
  future: string;
}> = {
  commercial: {
    label: "شركة تجارية",
    company: "شركة الأفق التجارية",
    image: "/landing/commercial-warehouse-v5.webp",
    imageAlt: "فريق عمل داخل مخزن شركة تجارية",
    focus: "التحصيلات والموردون ومسؤولية كل فرد",
    current: "ملف الشركة، الحسابات المسجلة، أعضاء الفريق، والتفويضات.",
    future: "تصور لمتابعة التحصيلات والمدفوعات بعد ربط محاسبي آمن.",
  },
  factory: {
    label: "مصنع",
    company: "مصنع النيل للصناعات",
    image: "/landing/factory-cutaway-v2.webp",
    imageAlt: "مشهد توضيحي لخطوط الإنتاج والتخزين في مصنع",
    focus: "تكلفة الإنتاج وما وراء هامش الربح",
    current: "ملف المنشأة، حساباتها المسجلة، وفريقها بصلاحياته.",
    future: "مثال تعليمي لتكلفة الإنتاج؛ وحدة التكاليف غير متاحة حاليًا.",
  },
  accountingOffice: {
    label: "مكتب محاسبة",
    company: "مكتب الصفوة للمحاسبة",
    image: "/landing/finance-team-review-v4.webp",
    imageAlt: "فريق محاسبة يناقش بيانات مالية في مكتب",
    focus: "تفويضات العملاء ومسؤوليات المراجعة",
    current: "ملف المكتب وطلب التفويض؛ الوصول يبدأ بموافقة الشركة.",
    future: "تصور لمساحة مراجعة مالية متعددة العملاء بعد اكتمال الربط.",
  },
};

export type BankTransaction = {
  date: string;
  reference: string;
  description: string;
  credit: number;
  debit: number;
  flag?: "document" | "duplicate" | "counterparty";
};

export const horizonOpening = 42_500;
export const horizonTransactions: readonly BankTransaction[] = [
  { date: "01/02", reference: "HTB-260201", description: "تحصيل ذمة عميل", credit: 15_000, debit: 0, flag: "document" },
  { date: "02/02", reference: "HTB-260202", description: "دفعة مورد", credit: 0, debit: 5_500 },
  { date: "03/02", reference: "HTB-260203", description: "تحصيل مبيعات", credit: 8_000, debit: 0 },
  { date: "04/02", reference: "HTB-260204", description: "إيجار مقر", credit: 0, debit: 2_300 },
  { date: "05/02", reference: "HTB-260205", description: "تحصيل تعاقد", credit: 12_200, debit: 0 },
  { date: "06/02", reference: "HTB-260206", description: "مدفوعات تشغيل", credit: 0, debit: 7_200, flag: "counterparty" },
  { date: "07/02", reference: "HTB-260207", description: "تحصيل خدمة", credit: 6_500, debit: 0 },
  { date: "08/02", reference: "HTB-260208", description: "مصاريف اتصالات", credit: 0, debit: 1_800 },
  { date: "09/02", reference: "HTB-260209", description: "تحصيل عميل", credit: 9_000, debit: 0, flag: "duplicate" },
  { date: "10/02", reference: "HTB-260210", description: "دفعة مورد", credit: 0, debit: 4_200 },
  { date: "11/02", reference: "HTB-260211", description: "خدمة بنكية", credit: 0, debit: 1_200 },
  { date: "12/02", reference: "HTB-260212", description: "تحصيل مستحق", credit: 6_000, debit: 0 },
  { date: "13/02", reference: "HTB-260213", description: "نقل وتوزيع", credit: 0, debit: 3_500 },
  { date: "14/02", reference: "HTB-260214", description: "مصاريف تشغيل", credit: 0, debit: 4_100 },
  { date: "15/02", reference: "HTB-260215", description: "مستلزمات", credit: 0, debit: 3_210 },
];

export const horizonCredits = horizonTransactions.reduce((sum, row) => sum + row.credit, 0);
export const horizonDebits = horizonTransactions.reduce((sum, row) => sum + row.debit, 0);
export const horizonClosing = horizonOpening + horizonCredits - horizonDebits;

export const trailCollection = horizonTransactions[0];
export const trailJournal = {
  debitBank: trailCollection.credit,
  creditReceivables: trailCollection.credit,
};

export const trailSamples = [
  { transactionIndex: 0, label: "تحصيل عميل", debitAccount: "البنك", creditAccount: "العملاء", amount: 15_000, meaning: "تحصيل ذمة قائمة؛ لا يُسجل إيرادًا جديدًا.", review: "فاتورة العميل ومطابقة الذمة", impact: "البنك يزيد 15,000 ج.م، والذمم المدينة تقل بالمبلغ نفسه." },
  { transactionIndex: 1, label: "سداد مورد", debitAccount: "الموردون", creditAccount: "البنك", amount: 5_500, meaning: "تسوية جزء من التزام قائم، وليست مصروفًا جديدًا تلقائيًا.", review: "كشف المورد وإثبات السداد", impact: "البنك والموردون ينخفضان كل منهما 5,500 ج.م." },
  { transactionIndex: 3, label: "إيجار مقر", debitAccount: "مصروف الإيجار", creditAccount: "البنك", amount: 2_300, meaning: "معالجة تعليمية تفترض أن الإيجار يخص الفترة الحالية.", review: "عقد الإيجار والفترة المستحقة", impact: "البنك ينخفض 2,300 ج.م؛ ومصروف الفترة يزيد بالقيمة نفسها." },
] as const;

export type Scenario = {
  opening: number;
  collections: number;
  payments: number;
  extraExpenses: number;
  delayedCollections: number;
};

export const baselineScenario: Scenario = {
  opening: 50_000,
  collections: 30_000,
  payments: 20_000,
  extraExpenses: 0,
  delayedCollections: 0,
};

export function projectedCash(scenario: Scenario): number {
  const delayed = Math.min(Math.max(0, scenario.delayedCollections), Math.max(0, scenario.collections));
  return scenario.opening + scenario.collections - delayed - scenario.payments - scenario.extraExpenses;
}

export function runningBalance(index: number): number {
  return horizonTransactions.slice(0, index + 1).reduce((balance, transaction) => balance + transaction.credit - transaction.debit, horizonOpening);
}

export function formatEgp(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}
