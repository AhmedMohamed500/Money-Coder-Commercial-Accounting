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

export interface ProductBackendV1 {
  listDocuments(organizationId: ApiId, cursor?: string): Promise<PageV1<DocumentV1>>;
  transitionReview(reviewId: ApiId, command: ReviewTransitionCommandV1, idempotencyKey: string): Promise<DocumentV1>;
  createJournal(organizationId: ApiId, input: Omit<JournalEntryV1, "id" | "status" | "revision" | "createdAt">, idempotencyKey: string): Promise<JournalEntryV1>;
  postJournal(journalId: ApiId, expectedRevision: number, idempotencyKey: string): Promise<JournalEntryV1>;
}
