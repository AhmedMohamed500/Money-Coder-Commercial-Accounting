# Feature Matrix

| Capability | Demo adapter | `/api/v1` contract | Existing real application | Backend work remaining |
| --- | --- | --- | --- | --- |
| Role/company switcher | Working, explicitly simulated | Organizations, sessions, memberships | Existing authenticated memberships preserved | Server-derived identity and tenant context |
| Company profile | Working in memory | Organizations | Existing onboarding preserved | Implement v1 DTO mapping and revision checks |
| Office portfolio | Working with three companies | Offices, engagements, assignments | Existing office authorization preserved | Implement cursor paging and delegated scopes |
| Documents | Metadata/version simulation | Documents and versions | Existing storage path preserved but not used by demo | Secure upload service, malware quarantine, immutable versions |
| Review workflow | Enforced assignment → start → correction/decision → resubmission → restart state machine | Reviews, comments, transitions | Not a complete real workflow | Transactional transitions, notifications, audit/outbox |
| Journal entry | Balanced minor-unit posting | Journal entries/posting | No equivalent complete production core | Exact decimal engine, approvals, locks, periods and reversals |
| Chart/ledger/trial balance | Classified chart plus account running balance and balanced trial derived from posted demo entries | Accounts, ledger and trial balance | Demo only | Server calculation and reconciliation tests |
| Financial statements | Derived demo figures | Financial reports | Demo only | Accounting policy, periods, comparison and authorization |
| Bank statement | Preloaded extraction → mapping → DRAFT → human review → guarded posting → reports | Typed imports, rows, mappings and draft suggestion | n8n integration remains separate | Upload, extraction provider, secure review, idempotency and duplicate control |
| Billing | Preview only; no charging | Plans/subscriptions/usage/invoices | Not enabled | Provider selection, webhooks, tax and reconciliation |
| CSV report | Real local synthetic CSV | Export job contract can be added | Demo only | Signed export jobs with tenant authorization |
| Async operation feedback | Global loading, success, error and manual retry | Stable error envelope, revisions and idempotency | Existing production UI unchanged | Implement transport error mapping and cancellation |
| Guided scenarios | Company Owner, Accounting Office and Accountant journeys with connected completion state | Covered by the documented endpoint/state transitions | Demo only | Contract-server E2E and role/permission enforcement |
| Account hierarchy and periods | Working with summary/posting/active/contra controls and open/closed periods | Account and period DTOs need expansion | Demo only | Exact policy, period locks, migrations and reconciliation |
| Explicit journal approval | Draft → submit → independent approve → post → reverse | Posting commands documented | Demo only | Transactional locks, server authorization and immutable audit |
| Financial Twin imports | Synthetic sources, raw/normalized lineage, mapping, validation and rollback marker | Contract extension documented in Financial Twin architecture | Not connected | Persistent import jobs, object storage, parsers and connectors |
| Financial snapshots | Versioned immutable in-memory snapshots with coverage and source versions | Snapshot resource required | Not implemented | Snapshot persistence, consistency locks and retention policy |
| Data quality | Deterministic four-dimension score and exception counters | Quality result DTO required | Not implemented | Configurable policy, background execution and trend history |
| Control registry | 30 versioned rules; 11 executable with honest insufficient-data states | Rule/run/finding resources required | Not implemented | Rule configuration, job runner, evidence persistence and scale testing |
| Guardian lifecycle | Assignment, investigation, comments, correction, approval, revalidation and resolution | Finding transition commands required | Not implemented | Server workflow, SLAs, notifications, concurrency and audit |
| Mock agents | Governed local tools, tenant checks, zero external tokens and no posting authority | `AIProvider` boundary documented | Not implemented | Provider governance, redaction, budgets, tool sandbox and approvals |
| Forecasting | Deterministic read-only base scenario | Forecast resource planned | Not implemented | Scenario CRUD, permissions, assumptions and versioning |
| Integration hub | Status/contract preview only; no credentials | Connector contract planned | Existing n8n remains separate and untouched | Connector runtime, secret vault, sync jobs and observability |
| Commercial value | Usage and verified-recovery preview; no pricing or savings claim | Usage events planned | Not implemented | Billing policy, metering integrity and approved pricing |

## Readiness labels

- **Demo working:** safe to demonstrate with synthetic data.
- **Contract ready:** frontend DTO and endpoint expectations are documented.
- **Existing real application:** preserved as-is and not claimed production-ready by this work.
- **Backend work remaining:** must be implemented and security-reviewed before real customer use.
