import type {
  ApiErrorV1,
  ApiId,
  BankStatementRowV1,
  DocumentV1,
  FinancialReportV1,
  JournalEntryV1,
  OrganizationV1,
  PageV1,
  ProductBackendV1,
  ReviewCaseV1,
  ReviewTransitionCommandV1,
} from "@/contracts/v1";

export const API_V1_BASE = "/api/v1";

export interface HttpTransportRequest {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Injected by the future real application. No default fetch transport is
 * provided, so importing this adapter can never contact production by itself.
 */
export interface HttpTransport {
  request<T>(request: HttpTransportRequest): Promise<T>;
}

export class ProductApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly requestId?: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ProductApiError";
  }

  static fromContract(payload: ApiErrorV1) {
    return new ProductApiError(payload.error.code, payload.error.message, payload.error.requestId, payload.error.details);
  }
}

export class HttpProductAdapter implements ProductBackendV1 {
  constructor(private readonly transport: HttpTransport) {}

  listOrganizations(cursor?: string, signal?: AbortSignal) {
    return this.transport.request<PageV1<OrganizationV1>>({ method: "GET", path: withQuery("/organizations", { cursor }), signal });
  }

  listDocuments(organizationId: ApiId, cursor?: string) {
    return this.transport.request<PageV1<DocumentV1>>({ method: "GET", path: withQuery(`/organizations/${encodeURIComponent(organizationId)}/documents`, { cursor }) });
  }

  getReview(reviewId: ApiId, signal?: AbortSignal) {
    return this.transport.request<ReviewCaseV1>({ method: "GET", path: `${API_V1_BASE}/reviews/${encodeURIComponent(reviewId)}`, signal });
  }

  transitionReview(reviewId: ApiId, command: ReviewTransitionCommandV1, idempotencyKey: string) {
    return this.transport.request<ReviewCaseV1>({ method: "POST", path: `${API_V1_BASE}/reviews/${encodeURIComponent(reviewId)}/transitions`, body: command, headers: { "Idempotency-Key": idempotencyKey } });
  }

  createJournal(organizationId: ApiId, input: Omit<JournalEntryV1, "id" | "status" | "revision" | "createdAt">, idempotencyKey: string) {
    return this.transport.request<JournalEntryV1>({ method: "POST", path: `${API_V1_BASE}/organizations/${encodeURIComponent(organizationId)}/journal-entries`, body: input, headers: { "Idempotency-Key": idempotencyKey } });
  }

  postJournal(journalId: ApiId, expectedRevision: number, idempotencyKey: string) {
    return this.transport.request<JournalEntryV1>({ method: "POST", path: `${API_V1_BASE}/journal-entries/${encodeURIComponent(journalId)}/post`, body: { expectedRevision }, headers: { "Idempotency-Key": idempotencyKey } });
  }

  getFinancialReport(organizationId: ApiId, type: "income-statement" | "financial-position", period: { from?: string; to: string }, signal?: AbortSignal) {
    return this.transport.request<FinancialReportV1>({ method: "GET", path: withQuery(`/organizations/${encodeURIComponent(organizationId)}/financial-reports/${type}`, period), signal });
  }

  listBankRows(importId: ApiId, cursor?: string, signal?: AbortSignal) {
    return this.transport.request<PageV1<BankStatementRowV1>>({ method: "GET", path: withQuery(`/bank-statement-imports/${encodeURIComponent(importId)}/rows`, { cursor }), signal });
  }

  mapBankRow(importId: ApiId, rowId: ApiId, input: { accountId: ApiId; expectedRevision: number }, idempotencyKey: string) {
    return this.transport.request<BankStatementRowV1>({
      method: "PATCH",
      path: `${API_V1_BASE}/bank-statement-imports/${encodeURIComponent(importId)}/rows/${encodeURIComponent(rowId)}/mapping`,
      body: { accountId: input.accountId },
      headers: { "Idempotency-Key": idempotencyKey, "If-Match": String(input.expectedRevision) },
    });
  }
}

function withQuery(path: string, values: Record<string, string | undefined>) {
  const query = new URLSearchParams(Object.entries(values).filter((entry): entry is [string, string] => Boolean(entry[1])));
  const serialized = query.toString();
  return `${API_V1_BASE}${path}${serialized ? `?${serialized}` : ""}`;
}
