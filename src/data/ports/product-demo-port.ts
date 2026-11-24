import type { AgentType } from "@/domain/agents/types";
import type { DemoRole, DemoSection, DemoState, JournalLine, LanguageDisplayMode, OrganizationId, ReviewStatus } from "@/domain/demo/types";
import type { FindingStatus } from "@/domain/financial-control/types";
import type { FinancialSourceType } from "@/domain/financial-twin/types";

export type DemoOperationKey =
  | "initialize"
  | "navigate"
  | "switch-context"
  | "settings"
  | "documents"
  | "reviews"
  | "accounting"
  | "banking"
  | "financial-twin"
  | "controls"
  | "agents"
  | "forecasting";

export interface DemoOperationState {
  status: "idle" | "loading" | "success" | "error";
  key?: DemoOperationKey;
  message?: string;
  error?: string;
  retryable: boolean;
}

export type DemoExecutionResult<T> = { ok: true; data: T } | { ok: false };

export interface ProductDemoPort {
  snapshot(): DemoState;
  subscribe(listener: () => void): () => void;
  initialize(): Promise<void>;
  navigate(section: DemoSection): Promise<void>;
  switchOrganization(organizationId: OrganizationId): Promise<void>;
  switchRole(role: DemoRole): Promise<void>;
  setDisplayMode(mode: LanguageDisplayMode): Promise<void>;
  setPersistence(enabled: boolean): Promise<void>;
  reset(): Promise<void>;
  simulateUpload(input: { title: string; category: "BANK_STATEMENT" | "INVOICE" | "CONTRACT" | "TAX" | "OTHER" }): Promise<string>;
  openReview(reviewId: string): Promise<void>;
  assignReview(reviewId: string, assignee: string): Promise<void>;
  beginReview(reviewId: string): Promise<void>;
  transitionReview(reviewId: string, status: Extract<ReviewStatus, "CORRECTION_REQUESTED" | "RESUBMITTED" | "APPROVED" | "REJECTED">, comment: string): Promise<void>;
  addReviewComment(reviewId: string, body: string): Promise<void>;
  createAndPostJournal(input: { date: string; memo: string; reference: string; lines: JournalLine[] }): Promise<string>;
  createJournalDraft(input: { date: string; memo: string; reference: string; lines: JournalLine[]; source?: "MANUAL" | "CONTROL_CORRECTION"; correctionFindingId?: string }): Promise<string>;
  submitJournal(journalId: string): Promise<void>;
  approveJournal(journalId: string): Promise<void>;
  requestJournalCorrection(journalId: string, reason: string): Promise<void>;
  postJournal(journalId: string): Promise<void>;
  reverseJournal(journalId: string, reason: string): Promise<string>;
  createBankSuggestion(rowId: string, accountId: string): Promise<void>;
  createBankDraft(rowId: string): Promise<string>;
  postDraftJournal(journalId: string): Promise<void>;
  loadSyntheticImport(sourceType: FinancialSourceType): Promise<string>;
  loadSyntheticErpCorrection(findingId: string): Promise<string>;
  applyImportMappings(batchId: string, mappings: Record<string, string>): Promise<void>;
  validateImportBatch(batchId: string): Promise<void>;
  confirmImportBatch(batchId: string): Promise<string>;
  rollbackImportBatch(batchId: string, reason: string): Promise<void>;
  runControlSnapshot(snapshotId: string): Promise<string>;
  selectFinding(findingId: string): Promise<void>;
  assignFinding(findingId: string, userId: string): Promise<void>;
  transitionFinding(findingId: string, status: Extract<FindingStatus, "UNDER_INVESTIGATION" | "FALSE_POSITIVE" | "RISK_ACCEPTED" | "ESCALATED">, reason: string): Promise<void>;
  addFindingComment(findingId: string, body: string): Promise<void>;
  runMockAgent(findingId: string, agentType: AgentType): Promise<string>;
  proposeFindingCorrection(findingId: string): Promise<string>;
  revalidateFinding(findingId: string): Promise<void>;
  saveCompanyProfile(input: { tradeName: string; industry: string; currency: "EGP" | "USD" }): Promise<void>;
}
