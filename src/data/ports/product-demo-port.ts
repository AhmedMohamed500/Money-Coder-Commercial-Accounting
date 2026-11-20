import type { DemoReport, DemoRole, DemoSection, DemoState, JournalLine, OrganizationId, ReviewStatus } from "@/domain/demo/types";

export interface ProductDemoPort {
  snapshot(): DemoState;
  subscribe(listener: () => void): () => void;
  navigate(section: DemoSection): void;
  switchOrganization(organizationId: OrganizationId): void;
  switchRole(role: DemoRole): void;
  setPersistence(enabled: boolean): void;
  reset(): void;
  simulateUpload(input: { title: string; category: "BANK_STATEMENT" | "INVOICE" | "CONTRACT" | "TAX" | "OTHER" }): void;
  assignReview(reviewId: string, assignee: string): void;
  transitionReview(reviewId: string, status: Extract<ReviewStatus, "CORRECTION_REQUESTED" | "RESUBMITTED" | "APPROVED" | "REJECTED">, comment: string): void;
  addReviewComment(reviewId: string, body: string): void;
  createAndPostJournal(input: { date: string; memo: string; reference: string; lines: JournalLine[] }): string;
  createBankSuggestion(rowId: string, accountId: string): void;
  saveCompanyProfile(input: { tradeName: string; industry: string; currency: "EGP" | "USD" }): void;
  report(organizationId?: OrganizationId): DemoReport;
}
