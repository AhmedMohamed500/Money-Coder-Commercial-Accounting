# Money Coder — Phase 2D.1 Release Hardening

Date: 2026-11-16 (Africa/Cairo)  
Scope: accounting-core hardening and acceptance only. Financial Twin was not implemented.

## Executive result

The local review candidate passes the accounting, migration, build, authenticated-browser, RTL, and source checks listed below. It is **not approved for Production**: no Vercel Preview with an isolated database was provisioned, and Phase 2C.1 still lacks production scanner/worker/private-storage infrastructure. No Production, Neon, Vercel, `main`, or n8n MC-03/MC-04 state was changed.

## Starting state and worktree reconciliation

- Starting branch: `codex/phase2d-accounting-core`.
- Starting commit: `a240f69c60c6641c1deb3f189d3bc693a06218be`.
- Hardening branch: `codex/phase2d1-release-hardening`.
- Phase 2C.1 reconciliation commit: `cd41fe0`.
- Accounting hardening commit: `a0683be`.
- Final publication tip: use the head of `origin/codex/phase2d1-release-hardening`; the report cannot embed the hash of the commit that contains itself.
- The starting tree contained uncommitted Phase 2C.1 routes, scanner/gateway services, scripts, tests, and documentation while its migration was already a committed Phase 2D dependency. Those files were reviewed, tested, and committed separately.
- Historical reports, caches, and unrelated visual artifacts were preserved and were not staged.

## Phase 2C.1 security reconciliation

| Check | Status | Evidence |
|---|---|---|
| Quarantine before release | PASS | Upload intent and pending/release keys are separate. |
| CLEAN gate for download/automation/accounting evidence | PASS | Current hash, CLEAN status, and validity window are checked; journals recheck evidence before submit/post. |
| Uploads disabled without production infrastructure | PASS | Default production mode is disabled; private PUT now rejects after mode changes too. |
| Scanner contract, replay, hash mismatch, malicious fixture | PASS | Isolated storage integration tests. |
| Live scanner/worker/private storage | BLOCKED | No independently verified production infrastructure exists. |
| Remote automation | BLOCKED | Remains disabled; MC-03/MC-04 were not modified. |

The security code is internally consistent and tested, but Phase 2C.1 is not declared production-complete.

## Accounting review: findings and fixes

1. **Base-currency integrity:** journals in a currency different from the company base currency were previously accepted even though GL/TB aggregate one currency. Draft creation/replacement now rejects this, and a PostgreSQL trigger blocks direct inserted POSTED entries and non-base-currency posting.
2. **Evidence integrity:** a document link previously did not require a current CLEAN scan at every accounting transition. Linking, submit, approval, and posting now revalidate company ownership, scan verdict, hash, expiry, and deletion state. Duplicate evidence links are rejected.
3. **Draft replacement:** replacement now persists and validates the supplied evidence references.
4. **Period management:** a user-facing RTL page now shows fiscal year, monthly periods, state counts, closing actor/time, blockers, warnings, and an exact-name confirmation. SUBMITTED/APPROVED journals block close. Draft/rejected journals remain visible as warnings. The UI states explicitly that close is not an IFRS-completeness assertion.
5. **Next.js route contract:** the sanitized webpack build caught an illegal schema export from a route module. The schema was moved to `src/lib/accounting/journal-schema.ts`.
6. **Opening corrections:** tested as an atomic replacement: old opening journal reversed, replacement posted, GL closes at the replacement value, and a correction attempted after close creates neither a partial reversal nor a replacement journal.

Existing SQL guards for balanced posting, company/fiscal-year foreign keys, immutable posted headers/lines, append-only events/evidence, period closure, numbering, optimistic revision checks, and serializable posting were independently exercised.

## Migration result

- New migration: `20261115010000_phase2d1_release_hardening`.
- Seven migrations applied in order to a fresh disposable PostgreSQL 17 database.
- Result: **PASS**.
- This rehearses the complete existing migration history plus the hardening delta. No Neon or Production migration was run.

## Authenticated end-to-end journey

The reproducible command is `npm run test:browser:accounting`. It creates a disposable PostgreSQL database, synthetic users/companies/office delegation, migrates the schema, starts the local application, drives Microsoft Edge, saves screenshots, then destroys the temporary database.

| Role/journey | Status | Browser evidence |
|---|---|---|
| Accountant creates opening draft, enters balanced lines, submits | PASS | Real form and authenticated requests. |
| Independent manager reviews and approves opening balances | PASS | Real action controls and confirmation. |
| Owner explicitly posts opening journal | PASS | HTTP 201 and posted-opening screenshot. |
| Accountant creates and submits balanced journal | PASS | `E2E-JV-001`. |
| Manager independently approves | PASS | Authenticated manager context. |
| Owner posts | PASS | Posted status and audit view. |
| GL movement/running balance and Excel export | PASS | EGP 1,250.75 closing before reversal; export returned 200. |
| TB opening/movement/closing and Excel export | PASS | Reconciled debit/credit totals; export returned 200. |
| Viewer | PASS | Can view; no submit/approve/post/reverse control. |
| Delegated office staff | PASS | Engagement/assignment intersection allows view only; mutation controls absent. |
| Cross-company isolation | PASS | Direct journal URL returned 404. |
| Reversal | PASS | Manager creates, accountant submits, owner approves/posts. |
| Period page | PASS | Status, counts, warnings, and actor-aware close UI rendered. |

Screenshots:

- [Opening balance posted](../artifacts/phase2d1-browser/00-opening-posted.png)
- [Posted journal](../artifacts/phase2d1-browser/01-posted-journal.png)
- [Trial balance](../artifacts/phase2d1-browser/02-trial-balance.png)
- [Delegated office view](../artifacts/phase2d1-browser/03-delegated-office-view.png)
- [Accounting periods](../artifacts/phase2d1-browser/04-accounting-periods.png)

## Financial quality matrix

| Case | Status | Verified effect |
|---|---|---|
| Cash purchase | PASS | Expense debit / cash credit. |
| Credit sale | PASS | Customer debit / revenue credit. |
| Customer collection | PASS | Cash debit / customer credit. |
| Supplier payment | PASS | Supplier debit / cash credit. |
| Prepaid expense | PASS | Prepaid asset closes debit 60.00. |
| Accrued expense | PASS | Accrued liability closes credit 30.00. |
| Unearned revenue | PASS | Unearned liability closes credit 70.00. |
| Journal reversal | PASS | New opposite journal; original becomes REVERSED without mutation. |
| Incorrect account classification | BLOCKED | A general journal cannot infer commercial substance from balanced lines; this needs reviewed transaction/subledger policy, not an invented auto-reclassification rule. |
| Large balances | PASS | Decimal arithmetic tested at 900,000,000,000.99. |
| Contra account | PASS | Opposing credit balance retained and shown. |
| Month boundary | PASS | November report excludes a December 1 posting. |
| Financial-year boundary | PASS | Posting context requires the selected fiscal year and an in-range accounting period. |
| Closed-period correction | PASS | 409; no silent backdate or partial reversal. |

These cases prove arithmetic, lifecycle, isolation, and audit integrity for the covered scenarios. They do not prove full IFRS compliance or completeness of an ERP.

## Release gates

| Gate | Result |
|---|---|
| TypeScript | PASS |
| ESLint (`--max-warnings=0`) | PASS |
| Unit tests | PASS — 44 passed; DB-gated tests skipped by design in this command |
| Isolated PostgreSQL | PASS — 78/78 |
| Migration rehearsal | PASS — 7/7 migrations |
| Production build (Turbopack) | PASS |
| Sanitized production build (webpack, no project secrets) | PASS |
| Authenticated Edge journey | PASS |
| RTL/visual smoke | PASS — 390, 768, 1280, 1440, 1920 px; no horizontal overflow |
| Secret-pattern scan | PASS — no private-key/AWS/live-key patterns found in tracked source |
| `git diff --check` | PASS |
| Vercel Preview | BLOCKED — no isolated, schema-compatible Preview database/credentials were authorized |
| Production/Neon verification | NOT RUN — explicitly outside scope |

## Remaining blockers and finance-owner acceptance

- [ ] Provision and independently validate production private storage, scanner, worker, monitoring, and recovery process.
- [ ] Provision an isolated Vercel Preview database and run the same migration/browser suite there.
- [ ] Obtain finance-owner sign-off on chart classification, period-close checklist, reversal authority, correction evidence, numbering, and retention policy.
- [ ] Define reviewed multi-currency and classification/subledger policies before allowing non-base-currency journals or automatic classification assertions.
- [ ] Perform an independent Production-readiness review; passing this local candidate does not authorize release.

## Recommended next phase

After the blockers and finance-owner checklist are closed, the smallest sellable Financial Twin MVP should be a **read-only Control Radar + Excel Audit**: exception cards sourced only from posted journals, period/evidence/approval gaps, drill-through to immutable records, and a reproducible Excel audit pack. It should not post, classify, correct, or claim IFRS compliance automatically.
