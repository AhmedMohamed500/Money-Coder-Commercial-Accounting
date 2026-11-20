import type { DemoRole, DemoSection, DemoState, JournalLine, OrganizationId, ReviewStatus } from "@/domain/demo/types";

export type DemoOperationKey =
  | "initialize"
  | "navigate"
  | "switch-context"
  | "settings"
  | "documents"
  | "reviews"
  | "accounting"
  | "banking";

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
  setPersistence(enabled: boolean): Promise<void>;
  reset(): Promise<void>;
  simulateUpload(input: { title: string; category: "BANK_STATEMENT" | "INVOICE" | "CONTRACT" | "TAX" | "OTHER" }): Promise<string>;
  assignReview(reviewId: string, assignee: string): Promise<void>;
  transitionReview(reviewId: string, status: Extract<ReviewStatus, "CORRECTION_REQUESTED" | "RESUBMITTED" | "APPROVED" | "REJECTED">, comment: string): Promise<void>;
  addReviewComment(reviewId: string, body: string): Promise<void>;
  createAndPostJournal(input: { date: string; memo: string; reference: string; lines: JournalLine[] }): Promise<string>;
  createBankSuggestion(rowId: string, accountId: string): Promise<void>;
  createBankDraft(rowId: string): Promise<string>;
  postDraftJournal(journalId: string): Promise<void>;
  saveCompanyProfile(input: { tradeName: string; industry: string; currency: "EGP" | "USD" }): Promise<void>;
}
