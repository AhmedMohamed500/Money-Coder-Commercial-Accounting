/** Backend-neutral public API contract types for /api/v1. */
export type ApiId = string;
export type IsoDateTime = string;
export type CurrencyCode = string;
export type DecimalMoney = string;

export interface ApiErrorV1 {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
}

export interface PageV1<T> {
  data: T[];
  page: { cursor: string | null; nextCursor: string | null; limit: number; total?: number };
}

export interface MoneyV1 {
  amount: DecimalMoney;
  currency: CurrencyCode;
}

export interface OrganizationV1 {
  id: ApiId;
  legalName: string;
  tradeName: string;
  type: "COMPANY" | "ACCOUNTING_OFFICE";
  industry?: string;
  baseCurrency: CurrencyCode;
  fiscalYearStart?: string;
  fiscalYearEnd?: string;
  revision: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DocumentV1 {
  id: ApiId;
  organizationId: ApiId;
  title: string;
  category: string;
  status: string;
  currentVersion: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  revision: number;
}

export interface ReviewTransitionCommandV1 {
  toStatus: "IN_REVIEW" | "CORRECTION_REQUESTED" | "RESUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";
  reason: string;
  expectedRevision: number;
}

export interface ReviewCaseV1 {
  id: ApiId;
  organizationId: ApiId;
  documentId: ApiId;
  documentVersionId: ApiId;
  status: "READY_FOR_REVIEW" | "IN_REVIEW" | "CORRECTION_REQUESTED" | "RESUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";
  assignedMembershipId: ApiId | null;
  revision: number;
  timeline: Array<{ id: ApiId; fromStatus: string | null; toStatus: string; actorId: ApiId; reason?: string; at: IsoDateTime }>;
}

export interface JournalLineV1 {
  accountId: ApiId;
  description?: string;
  debit: DecimalMoney;
  credit: DecimalMoney;
  currency: CurrencyCode;
}

export interface JournalEntryV1 {
  id: ApiId;
  organizationId: ApiId;
  reference: string;
  entryDate: string;
  memo: string;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "POSTED" | "REVERSED";
  lines: JournalLineV1[];
  revision: number;
  createdAt: IsoDateTime;
  postedAt?: IsoDateTime;
}

export interface FinancialReportV1 {
  organizationId: ApiId;
  currency: CurrencyCode;
  from: string | null;
  to: string;
  rows: Array<{ code: string; label: string; amount: DecimalMoney }>;
  generatedAt: IsoDateTime;
}

export interface BankStatementRowV1 {
  id: ApiId;
  importId: ApiId;
  date: string;
  description: string;
  amount: DecimalMoney;
  direction: "IN" | "OUT";
  mappedAccountId: ApiId | null;
  revision: number;
}

export interface ProductBackendV1 {
  listOrganizations(cursor?: string, signal?: AbortSignal): Promise<PageV1<OrganizationV1>>;
  listDocuments(organizationId: ApiId, cursor?: string): Promise<PageV1<DocumentV1>>;
  getReview(reviewId: ApiId, signal?: AbortSignal): Promise<ReviewCaseV1>;
  transitionReview(reviewId: ApiId, command: ReviewTransitionCommandV1, idempotencyKey: string): Promise<ReviewCaseV1>;
  createJournal(organizationId: ApiId, input: Omit<JournalEntryV1, "id" | "status" | "revision" | "createdAt">, idempotencyKey: string): Promise<JournalEntryV1>;
  postJournal(journalId: ApiId, expectedRevision: number, idempotencyKey: string): Promise<JournalEntryV1>;
  getFinancialReport(organizationId: ApiId, type: "income-statement" | "financial-position", period: { from?: string; to: string }, signal?: AbortSignal): Promise<FinancialReportV1>;
  listBankRows(importId: ApiId, cursor?: string, signal?: AbortSignal): Promise<PageV1<BankStatementRowV1>>;
  mapBankRow(importId: ApiId, rowId: ApiId, input: { accountId: ApiId; expectedRevision: number }, idempotencyKey: string): Promise<BankStatementRowV1>;
}
