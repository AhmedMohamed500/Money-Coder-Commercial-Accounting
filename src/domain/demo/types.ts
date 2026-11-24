import type { AccountClass, FinancialPeriod, FinancialStatementGroup, JournalSource, JournalWorkflowStatus, NormalBalance } from "@/domain/accounting/types";
import type { AgentRun } from "@/domain/agents/types";
import type { ControlFinding, ControlRule, FinancialControlRun } from "@/domain/financial-control/types";
import type { ForecastScenario } from "@/domain/forecasting/types";
import type { FinancialSnapshot, ImportBatch, NormalizedFinancialTransaction, RawFinancialRecord } from "@/domain/financial-twin/types";
import type { DemoIntegration, UsageMeteringPreview } from "@/domain/integrations/types";

export type DemoRole =
  | "COMPANY_OWNER"
  | "COMPANY_ACCOUNTANT"
  | "SENIOR_ACCOUNTANT"
  | "OFFICE_OWNER"
  | "OFFICE_ACCOUNTANT"
  | "REVIEWER"
  | "FINANCE_MANAGER";

export type DemoSection =
  | "overview"
  | "company"
  | "office"
  | "documents"
  | "reviews"
  | "accounting"
  | "banking"
  | "reports"
  | "financial-close"
  | "financial-twin"
  | "data-quality"
  | "guardian"
  | "agents"
  | "forecasting"
  | "integrations"
  | "roi"
  | "plans"
  | "settings";

export type LanguageDisplayMode = "BILINGUAL" | "AR" | "EN";

export type OrganizationId = string;
export type MoneyMinor = number;
export type DebitCredit = "DEBIT" | "CREDIT";
export type ReviewStatus = "READY_FOR_REVIEW" | "IN_REVIEW" | "CORRECTION_REQUESTED" | "RESUBMITTED" | "APPROVED" | "REJECTED";
export type JournalStatus = JournalWorkflowStatus;

export interface DemoUser {
  id: string;
  name: string;
  role: DemoRole;
  title: string;
}

export interface DemoOrganization {
  id: OrganizationId;
  legalName: string;
  tradeName: string;
  industry: string;
  size: "SMALL" | "MEDIUM" | "LARGE";
  currency: "EGP" | "USD";
  fiscalYearStart: string;
  fiscalYearEnd: string;
  commercialRegister: string;
  taxNumber: string;
  bankProfiles: Array<{ id: string; bankName: string; accountLabel: string; currency: string }>;
  staff: Array<{ id: string; name: string; role: string; permissions: string[] }>;
}

export interface DemoOffice {
  id: string;
  name: string;
  staff: Array<{ id: string; name: string; role: string; assignedOrganizationIds: OrganizationId[] }>;
  engagements: Array<{ organizationId: OrganizationId; status: "ACTIVE" | "PENDING"; permissions: string[] }>;
}

export interface DocumentVersion {
  id: string;
  version: number;
  createdAt: string;
  createdBy: string;
  note: string;
  fileLabel: string;
}

export interface DemoDocument {
  id: string;
  organizationId: OrganizationId;
  title: string;
  category: "BANK_STATEMENT" | "INVOICE" | "CONTRACT" | "TAX" | "OTHER";
  status: ReviewStatus;
  amountMinor?: MoneyMinor;
  versions: DocumentVersion[];
  assignedTo?: string;
  updatedAt: string;
}

export interface ReviewComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  kind: "COMMENT" | "CORRECTION" | "DECISION";
}

export interface ReviewCase {
  id: string;
  organizationId: OrganizationId;
  documentId: string;
  status: ReviewStatus;
  assignedTo: string;
  comments: ReviewComment[];
  timeline: Array<{ id: string; label: string; at: string; actor: string }>;
}

export interface Account {
  id: string;
  organizationId: OrganizationId;
  code: string;
  name: string;
  type: AccountClass;
  parentId?: string;
  level: number;
  normalBalance: NormalBalance;
  contra: boolean;
  statementGroup: FinancialStatementGroup;
  statementSign: 1 | -1;
  postingAllowed: boolean;
  active: boolean;
  openingBalanceMinor: MoneyMinor;
}

export interface JournalLine {
  id: string;
  accountId: string;
  description: string;
  debitMinor: MoneyMinor;
  creditMinor: MoneyMinor;
}

export interface JournalEntry {
  id: string;
  organizationId: OrganizationId;
  reference: string;
  date: string;
  memo: string;
  status: JournalStatus;
  source: JournalSource;
  lines: JournalLine[];
  periodId: string;
  revision: number;
  createdAt: string;
  createdByRole: DemoRole | "SYSTEM" | "AI_SIMULATION";
  submittedAt?: string;
  approvedAt?: string;
  approvedByRole?: DemoRole;
  postedAt?: string;
  reversedAt?: string;
  reversalOfId?: string;
  reversedById?: string;
  sourceDocumentId?: string;
  correctionFindingId?: string;
}

export interface BankStatementRow {
  id: string;
  organizationId: OrganizationId;
  date: string;
  description: string;
  amountMinor: MoneyMinor;
  direction: "IN" | "OUT";
  mappedAccountId?: string;
  state: "EXTRACTED" | "MAPPED" | "SUGGESTED";
}

export interface DemoNotification {
  id: string;
  organizationId?: OrganizationId;
  text: string;
  read: boolean;
  createdAt: string;
}

export interface DemoState {
  version: 2;
  currentRole: DemoRole;
  currentOrganizationId: OrganizationId;
  currentSection: DemoSection;
  selectedReviewId?: string;
  selectedFindingId?: string;
  displayMode: LanguageDisplayMode;
  persistenceEnabled: boolean;
  organizations: DemoOrganization[];
  office: DemoOffice;
  users: DemoUser[];
  documents: DemoDocument[];
  reviews: ReviewCase[];
  accounts: Account[];
  financialPeriods: FinancialPeriod[];
  journals: JournalEntry[];
  bankRows: BankStatementRow[];
  importBatches: ImportBatch[];
  rawFinancialRecords: RawFinancialRecord[];
  normalizedTransactions: NormalizedFinancialTransaction[];
  financialSnapshots: FinancialSnapshot[];
  controlRules: ControlRule[];
  controlRuns: FinancialControlRun[];
  findings: ControlFinding[];
  agentRuns: AgentRun[];
  forecastScenarios: ForecastScenario[];
  integrations: DemoIntegration[];
  usagePreview: UsageMeteringPreview;
  notifications: DemoNotification[];
  audit: Array<{ id: string; organizationId?: OrganizationId; action: string; actor: string; at: string }>;
}

export interface TrialBalanceRow {
  account: Account;
  debitMinor: MoneyMinor;
  creditMinor: MoneyMinor;
}

export interface DemoReport {
  revenueMinor: MoneyMinor;
  expenseMinor: MoneyMinor;
  profitMinor: MoneyMinor;
  assetsMinor: MoneyMinor;
  liabilitiesMinor: MoneyMinor;
  equityMinor: MoneyMinor;
  trialBalance: TrialBalanceRow[];
}

export function assertMinorUnits(value: number): MoneyMinor {
  if (!Number.isSafeInteger(value)) throw new Error("القيمة المالية يجب أن تكون عددًا صحيحًا بوحدة القرش.");
  return value;
}

export function sumJournalSide(lines: JournalLine[], side: DebitCredit): MoneyMinor {
  return lines.reduce((total, line) => total + (side === "DEBIT" ? line.debitMinor : line.creditMinor), 0);
}

export function isBalanced(lines: JournalLine[]): boolean {
  return lines.length >= 2 && sumJournalSide(lines, "DEBIT") === sumJournalSide(lines, "CREDIT") && sumJournalSide(lines, "DEBIT") > 0;
}
