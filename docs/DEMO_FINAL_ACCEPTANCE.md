# Demo Final Acceptance

## Scope

This acceptance pass applies only to the frontend-only `/demo` experience on `codex/frontend-first-demo-foundation`. It does not change production authentication, Prisma, database schemas, storage, SMTP, n8n, billing, or the production deployment.

## Screen audit

| Screen | Verified behavior |
| --- | --- |
| Dashboard | Tenant-scoped KPIs, tasks, localized activity, shortcuts and linked financial totals |
| Company Setup | Required fields, in-memory validation, current-company update and safe fictional banking/staff context |
| Accounting Office | Client portfolio, delegated assignments and isolated company switching |
| Document Center | Search, status filter, synthetic metadata creation and exact review selection |
| Review Workflow | Authorized assignee scope and enforced `READY_FOR_REVIEW → IN_REVIEW → CORRECTION_REQUESTED → RESUBMITTED → IN_REVIEW → APPROVED/REJECTED` transitions |
| Chart of Accounts | Account code, Arabic classification and current posted balance |
| Journal Entries | Controlled metadata, exact minor-unit calculation, balanced-only posting and duplicate-reference protection |
| General Ledger | Account filter, posted entries only, turnover totals and running debit/credit balance |
| Trial Balance | Debit/credit totals, zero-difference indicator and exact equality |
| Financial Reports | Linked income, position equation, trial balance and decimal CSV export |
| Bank Statement Demo | Synthetic rows, tenant account mapping, automatic bank side, human-reviewed draft and duplicate-post prevention |
| Plans | Explicitly illustrative and non-charging |
| Settings | Optional synthetic-only browser persistence, role switching and deterministic reset feedback |

## Guided customer journeys

- **Company Owner:** performance → fictional company profile → approval result → financial statements.
- **Accounting Office:** portfolio → tenant switch → authorized reviewer → correction cycle → approval.
- **Accountant:** chart of accounts → journal → ledger/trial balance → bank draft → reports.

Journey progress is derived from demo audit events. It is presentation guidance, not production authorization.

## Accounting and isolation assertions

- Money is stored as integer minor units within the documented demo limits.
- Only `POSTED` entries affect ledger, trial balance and statements.
- Every journal must have equal debit and credit totals and at least two valid tenant accounts.
- Manual references are unique per company; bank drafts and posting are guarded against repetition.
- The displayed position equation is `assets = liabilities + equity including current profit`.
- Company switching remounts organization-dependent screens and the adapter rejects cross-tenant account, review, comment and bank-row access.
- Currency presentation follows the selected fictional organization and never converts or combines currencies.

## Browser acceptance command

Run the demo locally without production credentials:

```powershell
$env:DEMO_ONLY_DEPLOYMENT='1'
npm run dev -- --port 3108
```

In a second terminal:

```powershell
$env:DEMO_E2E_BASE_URL='http://127.0.0.1:3108'
$env:DEMO_E2E_OUTPUT='<safe-output-directory>'
npm run test:e2e:demo
```

The browser test covers desktop navigation, the three guided roles, document/review selection, accounting tabs and equality, organization isolation, route blocking, mobile navigation, RTL and horizontal overflow. It stores screenshots in the configured output directory.

## Deployment gate

This pass does not deploy. A protected Preview may be updated only after explicit approval. The demo-only build must continue using `DEMO_ONLY_DEPLOYMENT=1`, `npm run build:demo`, no production environment variables, no domains/aliases, and no public access.
