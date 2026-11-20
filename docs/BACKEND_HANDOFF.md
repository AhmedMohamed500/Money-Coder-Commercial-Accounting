# Money Coder Backend Handoff

## 1. Objective

The frontend is split into replaceable boundaries so a backend team can choose a database, object store, email provider, workflow engine and payment provider without redesigning product screens.

This does **not** promise a database change requires zero backend work. The backend must implement the versioned contract and migrate its own data. The UI remains stable because provider-specific changes stay in adapters.

## 2. Current architecture

```text
app/demo
  -> components/product
    -> application/demo use cases and validation
      -> ProductDemoPort
        -> InMemoryDemoAdapter (current public demo)
        -> HTTP adapter (future production implementation)

domain/demo       backend-neutral entities and exact minor-unit rules
contracts/v1.ts   public DTO conventions
contracts/openapi.yaml authoritative HTTP contract
demo/fixtures     deterministic fictional dataset
demo/state        isolated React provider and reset/persistence behavior
```

The existing real application remains separate. Its Prisma/auth/storage routes were not replaced, migrated, or invoked by the demo.

## 3. Existing UI inventory and coupling audit

| Existing area | Reusable value | Current coupling |
| --- | --- | --- |
| Landing page | Branding, RTL identity, product narratives | Server checks the real session to vary CTAs |
| `company-workspace.tsx` | Onboarding fields, bank/document presentation | Direct `fetch('/api/organizations/...')`, upload XHR and router refresh |
| `office-workspace.tsx` | Team, engagement and activity concepts | Direct production endpoints and database-shaped props |
| Dashboard | Membership cards and organization routing | Direct server authentication and Prisma-derived session shape |
| Permission library | Useful vocabulary for future backend | Coupled to current real membership/engagement persistence |

The new product components do not import these coupled modules. Their behavior is driven by the port and contract types.

## 4. API conventions

- Base path: `/api/v1`.
- Content type: `application/json`; file transfer uses a separate upload handshake.
- IDs: opaque strings. Clients must not infer provider or table semantics.
- Time: ISO 8601 UTC timestamps.
- Dates: `YYYY-MM-DD` where no time zone is intended.
- Money: decimal strings plus ISO 4217 currency, never binary JSON numbers.
- Pagination: opaque cursor with `limit` (default 25, maximum 100).
- Sorting: allowlisted `sort` fields and `order=asc|desc`.
- Errors: stable code, safe Arabic/localizable message, request ID and optional field details.
- Concurrency: mutable aggregate DTOs expose `revision`; commands carry `expectedRevision` or `If-Match`.
- Idempotency: `Idempotency-Key` is required for create, transition, posting, finalization and payment commands.
- Audit: actor, tenant, request ID, before/after state and time are recorded server-side.

### Standard success page

```json
{
  "data": [],
  "page": { "cursor": null, "nextCursor": "opaque", "limit": 25, "total": 3 }
}
```

### Standard error

```json
{
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "تم تعديل السجل بواسطة مستخدم آخر.",
    "requestId": "req_demo_01",
    "details": { "expectedRevision": 3, "actualRevision": 4 }
  }
}
```

## 5. Endpoint catalog

| Area | Endpoints | Scope and permission |
| --- | --- | --- |
| Sessions | `POST /sessions`, `DELETE /sessions/current`, `GET /users/me` | Auth service; rate-limited; no demo identity |
| Organizations | `GET/POST /organizations`, `GET/PATCH /organizations/{id}` | Tenant membership; view/edit permissions |
| Offices | `GET /offices/{id}/portfolio` | Active office membership and engagement intersection |
| Memberships | `GET/POST /organizations/{id}/memberships`, `PATCH /memberships/{id}` | `members:view/manage` with role hierarchy |
| Engagements | `GET/POST /offices/{id}/engagements`, `PATCH /engagements/{id}` | Office/company owners or managers |
| Documents | `GET/POST /organizations/{id}/documents`, `GET /documents/{id}` | `documents:view/manage`; tenant-owned only |
| Versions | `POST /documents/{id}/versions`, `GET /documents/{id}/versions` | Immutable versions; idempotent finalize |
| Reviews | `GET/POST /organizations/{id}/reviews`, `GET /reviews/{id}` | `documents:review` and assignment scope |
| Review actions | `/reviews/{id}/assignments`, `/comments`, `/transitions` | Assignee/manage permission; revision and idempotency |
| Accounts | `GET/POST /organizations/{id}/accounts` | `accounting:view/manage` |
| Opening balances | `PUT /organizations/{id}/opening-balances` | accounting admin; balanced and revision-protected |
| Journals | `GET/POST /organizations/{id}/journal-entries`, `GET/PATCH /journal-entries/{id}` | draft management; exact decimals |
| Posting | `POST /journal-entries/{id}/submit`, `/approve`, `/post`, `/reverse` | separation of duties and closed-period checks |
| Ledger | `GET /organizations/{id}/general-ledger` | `reports:view`; cursor/filter/date/account |
| Trial balance | `GET /organizations/{id}/trial-balance` | `reports:view`; period/as-of filters |
| Reports | `GET /organizations/{id}/financial-reports/{type}` | `reports:view`; policy and comparative periods |
| Bank imports | `POST/GET /organizations/{id}/bank-statement-imports` | `bank:import`; quarantine before extraction |
| Bank rows | `GET /bank-statement-imports/{id}/rows`, `PATCH /rows/{rowId}/mapping` | import tenant and reviewer assignment |
| Bank suggestion | `POST /bank-statement-imports/{id}/journal-suggestion` | creates DRAFT only; never auto-posts |
| Billing future | `/plans`, `/subscriptions`, `/usage`, `/invoices` | explicit future scope; provider webhooks server-only |

## 6. Review workflow

```text
UPLOADING -> QUARANTINED -> READY_FOR_REVIEW -> IN_REVIEW
IN_REVIEW -> CORRECTION_REQUESTED | APPROVED | REJECTED
CORRECTION_REQUESTED -> RESUBMITTED -> IN_REVIEW
READY_FOR_REVIEW | IN_REVIEW | CORRECTION_REQUESTED -> CANCELLED
```

Rules:

1. Every resubmission creates an immutable document version.
2. A correction request requires a reason.
3. Approval records the exact reviewed version.
4. A new version after approval creates a new review cycle; it does not rewrite the approval.
5. The transition, audit event and notification outbox entry are one transaction.
6. Tenant, engagement and assignment checks happen on the server.

## 7. Journal and posting workflow

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTED -> REVERSED
```

- Debit must equal credit in the same functional currency before submission and posting.
- Use exact decimal arithmetic; JSON values remain strings such as `"1250.00"`.
- Posted entries and lines are immutable.
- Correction uses a linked reversal and optional replacement entry.
- Posting must lock the aggregate/period and recheck revision, balance, permissions and period status.
- The creator cannot approve when separation-of-duties policy is enabled.
- Ledger and reports are derived only from posted entries.

## 8. HTTP adapter implementation

The backend team should implement focused ports rather than one monolithic client, for example:

```text
OrganizationPort
DocumentPort
ReviewPort
AccountingPort
ReportingPort
BankImportPort
BillingPort
```

The adapter is responsible for:

- sending session credentials using the selected secure mechanism;
- adding request IDs and idempotency keys;
- validating responses;
- mapping HTTP errors to application errors;
- handling cursor pagination and revision conflicts;
- never leaking storage/provider fields into components.

The adapter is not responsible for deciding authorization. Authorization is always enforced by the backend.

## 9. Example review transition

```http
POST /api/v1/reviews/rev_demo_01/transitions
Idempotency-Key: 8939fb8b-4f14-4d56-a910-4c571e1fb7a1
Content-Type: application/json

{
  "toStatus": "CORRECTION_REQUESTED",
  "reason": "يرجى إرفاق الصفحة الأخيرة.",
  "expectedRevision": 3
}
```

## 10. Example journal command

```json
{
  "reference": "JV-2026-0045",
  "entryDate": "2026-11-20",
  "memo": "تحصيل من عميل",
  "lines": [
    { "accountId": "acc_bank", "description": "تحصيل", "debit": "4500.00", "credit": "0.00", "currency": "EGP" },
    { "accountId": "acc_receivable", "description": "تسوية العميل", "debit": "0.00", "credit": "4500.00", "currency": "EGP" }
  ]
}
```

## 11. Security acceptance before real mode

- Fix existing organization overfetching and enforce field-level permissions.
- Use distributed rate limiting.
- Complete reset-token invalidation.
- Verify private storage, CORS, quarantine and malware scanning.
- Complete backup/restore testing and environment isolation.
- Test every endpoint for cross-tenant access, object enumeration and stale revisions.
- Keep the demo deployment secret-free if it is published separately.
