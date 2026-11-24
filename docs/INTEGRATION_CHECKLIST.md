# Backend Integration Checklist

## Contract and adapter

- [ ] Implement `/api/v1` exactly or publish a reviewed contract migration.
- [ ] Map provider/database entities to contract DTOs; never return ORM records directly.
- [x] Implement the inert async `HttpProductAdapter` boundary with injected transport.
- [ ] Implement the real authenticated `HttpTransport`; do not add it to `/demo`.
- [ ] Select the HTTP adapter only from trusted route/server configuration.
- [ ] Keep `/demo` pinned to `InMemoryDemoAdapter`.
- [ ] Validate every request and response against versioned schemas.
- [ ] Preserve loading/success/error/retry semantics and cancellation on adapter replacement.
- [ ] Reuse one idempotency key across retries of the same command.
- [ ] Map `ApiErrorV1` codes to field, conflict, authorization and retryable failure states.

## Identity, tenants and permissions

- [ ] Derive user and tenant from the authenticated server session; never trust organization IDs as authorization.
- [ ] Authorize every resource through its owning organization.
- [ ] Enforce delegated office access and assignment scope server-side.
- [ ] Apply specific permissions such as `documents:review`, `journals:post`, `reports:view`, and `members:view`.
- [ ] Return 404 for tenant-owned resources that the caller cannot see.
- [ ] Add cross-tenant negative integration tests for every endpoint group.

## Money and accounting

- [ ] Use exact decimals in persistence/calculation and decimal strings in JSON.
- [ ] Reject entries whose debit and credit totals differ.
- [ ] Lock closed periods and enforce posting authorization.
- [ ] Require approval where policy demands separation of duties.
- [ ] Make posted entries immutable; correct with reversal/adjustment entries.
- [ ] Reconcile ledger, trial balance and financial statements in automated tests.

## Financial Twin ingestion and snapshots

- [ ] Implement versioned import batches, immutable raw rows and reviewed mapping versions.
- [ ] Apply the same stable validation codes documented by the demo adapter.
- [ ] Reject an entire source transaction group when one of its lines is invalid.
- [ ] Detect duplicates inside the batch and against tenant-scoped persisted fingerprints.
- [ ] Create immutable, tenant-scoped snapshots only from confirmed valid rows.
- [ ] Make rollback an auditable state transition; never delete source evidence.
- [ ] Add contract tests for concurrent mapping, validation and confirmation attempts.

## Guardian controls and findings

- [ ] Persist the control registry and rule version used by every run.
- [ ] Execute controls against one immutable snapshot and retain evidence references.
- [ ] Keep stable finding fingerprints so reruns update or reopen rather than duplicate exposure.
- [ ] Enforce the documented finding state machine and optimistic concurrency.
- [ ] Require reason, actor and timestamp for assignment, acceptance, rejection and resolution.
- [ ] Revalidate corrected evidence before marking a finding resolved.
- [ ] Return `INSUFFICIENT_DATA` honestly when a rule cannot be evaluated.

## Governed agents

- [ ] Implement `AiProvider` behind a server-only adapter; never expose provider credentials to the browser.
- [ ] Enforce tool allowlists, tenant scope, timeouts, retry limits and immutable run traces.
- [ ] Treat agent output as advisory evidence or a draft proposal only.
- [ ] Prevent agents from approving, posting, changing permissions or bypassing accounting validation.
- [ ] Require a different authorized human actor for approval and posting where policy requires it.
- [ ] Record token/cost metrics without logging prompts or financial payloads containing sensitive data.

## Documents and reviews

- [ ] Store immutable document versions and content hashes.
- [ ] Quarantine and malware-scan files before reviewer access.
- [ ] Keep provider storage keys and signed credentials out of public DTOs.
- [ ] Enforce the documented review state machine transactionally.
- [ ] Use optimistic concurrency (`expectedRevision`/ETag) for transitions.
- [ ] Use idempotency keys for upload finalization, transitions and posting.
- [ ] Emit audit and outbox records in the same transaction.

## Operations

- [ ] Separate Development, Preview, Staging and Production credentials.
- [ ] Configure distributed rate limiting and abuse monitoring.
- [ ] Add structured logs, request IDs, error monitoring and alerts.
- [ ] Define backup retention, RPO/RTO and complete a restore drill.
- [ ] Run accessibility, mobile, security and performance checks.
- [ ] Do not enable payments until webhook, reconciliation and refund paths are tested.

## Cutover sequence

1. Run the HTTP adapter against a contract-test server.
2. Enable it only in a secret-free Preview environment.
3. Run the complete demo workflow and cross-tenant negative suite.
4. Pilot with fictional/staging data.
5. Obtain security and accounting review.
6. Request explicit production approval.

## Demo-only deployment gate

- [ ] Create a separate Vercel project; never attach the production project or domains.
- [ ] Set only `DEMO_ONLY_DEPLOYMENT=1`; do not copy Production environment variables.
- [ ] Run `npm run build:demo` so the secret denylist and route isolation checks execute.
- [ ] Verify `/demo` works and production pages/APIs return 404 in the preview.
- [ ] Confirm browser network traffic contains no production hosts.
- [ ] Share the protected preview for visual review; obtain explicit approval before public access.
