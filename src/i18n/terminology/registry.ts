import type { LanguageDisplayMode } from "@/domain/demo/types";

export interface FinancialTermDefinition {
  key: string;
  ar: string;
  en: string;
  abbreviation?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  context: "NAVIGATION" | "ACCOUNTING" | "CONTROL" | "DATA" | "AGENT" | "GENERAL";
  sourceReference?: string;
  reviewStatus: "INTERNAL_REVIEWED" | "PROVISIONAL";
  lastReviewedDate?: string;
}

export const financialTerminology = {
  overview: term("overview", "نظرة عامة", "Overview", "GENERAL"),
  companySetup: term("companySetup", "إعداد الشركة", "Company Setup", "GENERAL"),
  accountingOffice: term("accountingOffice", "مركز مكتب المحاسبة", "Accounting Office", "GENERAL"),
  documents: term("documents", "مركز المستندات", "Document Center", "GENERAL"),
  reviews: term("reviews", "المراجعة والاعتماد", "Review & Approval", "CONTROL"),
  accounting: term("accounting", "المحاسبة التجريبية", "Demo Accounting", "ACCOUNTING"),
  chartOfAccounts: term("chartOfAccounts", "دليل الحسابات", "Chart of Accounts", "ACCOUNTING", "COA"),
  journalEntry: term("journalEntry", "قيد اليومية", "Journal Entry", "ACCOUNTING"),
  journalApproval: term("journalApproval", "اعتماد القيد", "Journal Approval", "ACCOUNTING"),
  journalPosting: term("journalPosting", "ترحيل القيد", "Journal Posting", "ACCOUNTING"),
  generalLedger: term("generalLedger", "الأستاذ العام", "General Ledger", "ACCOUNTING", "GL"),
  trialBalance: term("trialBalance", "ميزان المراجعة", "Trial Balance", "ACCOUNTING", "TB"),
  financialReports: term("financialReports", "التقارير المالية", "Financial Reports", "ACCOUNTING"),
  financialPosition: term("financialPosition", "قائمة المركز المالي", "Statement of Financial Position", "ACCOUNTING"),
  profitOrLoss: term("profitOrLoss", "قائمة الربح أو الخسارة", "Statement of Profit or Loss", "ACCOUNTING"),
  financialClose: term("financialClose", "مركز الإقفال المالي", "Financial Close", "ACCOUNTING"),
  banking: term("banking", "التسوية البنكية", "Bank Reconciliation", "ACCOUNTING"),
  financialTwin: term("financialTwin", "التوأم المالي", "Financial Twin", "DATA"),
  dataQuality: term("dataQuality", "جودة البيانات", "Data Quality", "DATA"),
  guardian: term("guardian", "المراقب المالي الذكي", "Guardian Control Center", "CONTROL"),
  findings: term("findings", "الملاحظات الرقابية", "Control Findings", "CONTROL"),
  internalControls: term("internalControls", "الرقابة الداخلية", "Internal Controls", "CONTROL"),
  audit: term("audit", "التدقيق", "Audit", "CONTROL"),
  review: term("review", "المراجعة", "Review", "CONTROL"),
  aiAgents: term("aiAgents", "وكلاء الذكاء الاصطناعي", "AI Agents", "AGENT"),
  forecasting: term("forecasting", "التخطيط والتوقعات المالية", "Financial Forecasting", "GENERAL"),
  integrations: term("integrations", "مركز التكاملات", "Integration Hub", "DATA"),
  commercialValue: term("commercialValue", "القيمة المالية", "Financial Value", "CONTROL"),
  plans: term("plans", "الخطط والفوترة", "Plans & Billing", "GENERAL"),
  settings: term("settings", "الإعدادات والمساعدة", "Settings & Help", "GENERAL"),
  accumulatedDepreciation: term("accumulatedDepreciation", "مجمع الإهلاك", "Accumulated Depreciation", "ACCOUNTING"),
  provisions: term("provisions", "المخصصات", "Provisions", "ACCOUNTING"),
  accountsReceivable: term("accountsReceivable", "العملاء", "Accounts Receivable", "ACCOUNTING", "AR"),
  revenue: term("revenue", "الإيرادات", "Revenue", "ACCOUNTING"),
} satisfies Record<string, FinancialTermDefinition>;

export type FinancialTermKey = keyof typeof financialTerminology;

export function formatFinancialTerm(key: FinancialTermKey, mode: LanguageDisplayMode, compact = false) {
  const value = financialTerminology[key];
  if (mode === "AR") return value.ar;
  if (mode === "EN") return value.abbreviation && compact ? `${value.en} (${value.abbreviation})` : value.en;
  if (compact) return `${value.ar} — ${value.abbreviation ?? value.en}`;
  return `${value.ar} — ${value.en}${value.abbreviation ? ` (${value.abbreviation})` : ""}`;
}

function term(key: string, ar: string, en: string, context: FinancialTermDefinition["context"], abbreviation?: string): FinancialTermDefinition {
  return { key, ar, en, abbreviation, context, reviewStatus: "INTERNAL_REVIEWED", lastReviewedDate: "2026-11-24" };
}

