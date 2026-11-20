# Feature Matrix

| Capability | Demo adapter | `/api/v1` contract | Existing real application | Backend work remaining |
| --- | --- | --- | --- | --- |
| Role/company switcher | Working, explicitly simulated | Organizations, sessions, memberships | Existing authenticated memberships preserved | Server-derived identity and tenant context |
| Company profile | Working in memory | Organizations | Existing onboarding preserved | Implement v1 DTO mapping and revision checks |
| Office portfolio | Working with three companies | Offices, engagements, assignments | Existing office authorization preserved | Implement cursor paging and delegated scopes |
| Documents | Metadata/version simulation | Documents and versions | Existing storage path preserved but not used by demo | Secure upload service, malware quarantine, immutable versions |
| Review workflow | Working state machine | Reviews, comments, transitions | Not a complete real workflow | Transactional transitions, notifications, audit/outbox |
| Journal entry | Balanced minor-unit posting | Journal entries/posting | No equivalent complete production core | Exact decimal engine, approvals, locks, periods and reversals |
| Ledger/trial balance | Derived from posted demo entries | Ledger/trial balance | Demo only | Server calculation and reconciliation tests |
| Financial statements | Derived demo figures | Financial reports | Demo only | Accounting policy, periods, comparison and authorization |
| Bank statement | Preloaded simulated extraction | Imports, rows and mappings | n8n integration remains separate | Upload, extraction provider, review, duplicate control |
| Billing | Preview only; no charging | Plans/subscriptions/usage/invoices | Not enabled | Provider selection, webhooks, tax and reconciliation |
| CSV report | Real local synthetic CSV | Export job contract can be added | Demo only | Signed export jobs with tenant authorization |

## Readiness labels

- **Demo working:** safe to demonstrate with synthetic data.
- **Contract ready:** frontend DTO and endpoint expectations are documented.
- **Existing real application:** preserved as-is and not claimed production-ready by this work.
- **Backend work remaining:** must be implemented and security-reviewed before real customer use.
