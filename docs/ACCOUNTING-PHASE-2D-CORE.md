# Money Coder — Phase 2D Accounting Core

Date: 2026-11-15 (Africa/Cairo)

## Executive result

Phase 2D establishes a transactional double-entry source of truth for Money Coder. Journal drafts, independent review, approval, posting, rejection, reversal, correction, opening-balance posting, General Ledger, and Trial Balance are now implemented locally and verified against an isolated PostgreSQL instance. No Production, Neon, Vercel, `main`, or live accounting workflow was changed.

## Actual starting repository state

- Workspace: `E:\My Portofolio\Money-Coder-Commercial-Accounting`.
- Starting branch: `codex/phase2c-review-20261108` at verified commit `ba7c98d`.
- Cached `origin/main`: `2c452ed`.
- The worktree was already dirty. It contained uncommitted Phase 2C.1 secure-document work, historical reports, QA artifacts, and local helper files. Those files were preserved; no `reset`, `clean`, destructive checkout, or deletion was used.
- Verified stack: Next.js 16.4.3, React 19.1.1, TypeScript, Prisma 6.12.0, PostgreSQL, Tailwind CSS 4.3.3, and ExcelJS 4.4.0.
- The relevant Next.js 16 local documentation under `node_modules/next/dist/docs/` was read before implementation.

## Existing work reused

- Phase 2A company-scoped Chart of Accounts, including active/postable account controls and the commercial chart template.
- Phase 2B fiscal years, approved Opening Balance batches, immutable approved snapshots, exact decimal helpers, review workflow, and opening audit trail.
- Phase 2C bank statements, bank transaction revisions, automation permissions, and source references.
- Existing server-side session authentication, company/accounting-office authorization, engagement assignments, and audit events.
- Phase 2C.1 `CompanyDocument` schema and secure-document migration were retained as the supporting-document dependency for journal evidence. The already-dirty Phase 2C.1 application-source changes were not silently absorbed into this Phase 2D commit.

## New Prisma model and migration design

Migration: `prisma/migrations/20261114010000_phase2d_accounting_core/migration.sql`.

New enums:

- `AccountingPeriodStatus`: `OPEN`, `CLOSED`.
- `JournalEntryStatus`: `DRAFT`, `SUBMITTED`, `APPROVED`, `POSTED`, `REJECTED`, `REVERSED`.
- `JournalEntryType`: `GENERAL`, `OPENING`, `REVERSAL`, `CORRECTION`.
- `JournalSourceType`: `MANUAL`, `OPENING_BALANCE`, `BANK_STATEMENT`, `DOCUMENT`.

New models:

- `AccountingPeriod`: company/fiscal-year period, sequence, date range, open/closed state, and closing actor/time.
- `JournalEntry`: header, dates, currency precision, state, exact totals, source metadata, idempotency key, actors, posting number, opening/reversal/correction links, and optimistic revision.
- `JournalLine`: ordered company-scoped account lines with `DECIMAL` debit/credit amounts and source references.
- `JournalEntryEvent`: append-only lifecycle history.
- `JournalEvidenceLink`: append-only link from an entry/line to a document, statement, bank transaction, opening snapshot, source revision, and evidence timestamp.

Database constraints and triggers additionally enforce non-overlapping periods, controlled period closure, posting-time balance/account checks, immutable posted/reversed headers and lines, and append-only journal evidence/history.

The Phase 2C.1 secure-document migration is included before Phase 2D because journal evidence has a foreign key to `CompanyDocument`.

## Journal state machine

Primary path:

`DRAFT → SUBMITTED → APPROVED → POSTED`

Controlled alternatives:

- `SUBMITTED → REJECTED → DRAFT` through an explicit correction and resubmission.
- `POSTED → REVERSED` only after posting a linked opposite `REVERSAL` entry.
- A corrected replacement is a new linked `CORRECTION` draft after the original has been reversed.

The preparer/submitter cannot approve or post the same entry. Rejection and approval also require an actor independent from the preparer/submitter. Role permissions provide the first authorization layer; service checks and database locks enforce the accounting policy.

## Posting and reversal algorithms

Posting runs inside a serializable Prisma transaction and obtains company and entry row locks. It rechecks:

- company, fiscal year, date, and open period;
- at least two non-zero lines;
- active posting-enabled accounts from the same organization;
- exact debit/credit equality using decimal-to-minor-unit arithmetic;
- expected entry state, revision, and segregation of duties.

The next company journal number is allocated while holding the company lock. A concurrent second posting receives HTTP 409 instead of producing another posting. Once posted, database triggers block direct header or line mutations.

Reversal copies the original lines with debit and credit exchanged. Posting the reversal marks the original `REVERSED` but preserves its amounts, number, lines, evidence, and audit history. Ledger reports include both posted historical records so the reversal nets the accounting effect without erasing history.

## Opening-balance integration

Approval and posting remain separate actions. An authorized user explicitly posts an approved batch through a dedicated endpoint and UI action.

- `OpeningBalanceBatch.postedJournalEntry` provides a unique one-to-one posting bridge.
- The batch row is locked and checked for approved status.
- The opening entry uses the fiscal year, opening date, currency precision, exact approved lines, snapshot revision, approval timestamp, and an append-only evidence link.
- Duplicate/repeated requests return the existing entry.
- A superseding approved correction automatically creates and posts a linked reversal for the previous posted opening entry before posting the replacement snapshot, in one serializable transaction.
- The preparer/submitter cannot perform the explicit posting action.

## General Ledger calculation

The General Ledger queries only entries that have a posting timestamp and are in posted history (`POSTED` or an original entry later marked `REVERSED`). It derives:

- opening net balance from entries before the selected range;
- in-period debit and credit totals;
- ordered movements by posting date, entry number, and line number;
- exact running debit/credit-side balance;
- journal drill-down, source reference/type, and evidence count.

No stored or invented ledger balance is used. The report is reproducible from authoritative journal lines. Excel export uses the same service result.

## Trial Balance calculation

The Trial Balance aggregates authoritative posted journal lines by account and splits each account into:

- opening debit/credit;
- period debit/credit;
- closing debit/credit.

Detailed rows retain chart account code, Arabic name, class, and normal balance. Summary rows aggregate by asset, liability, equity, revenue, and expense. Reconciliation compares independently calculated debit and credit totals; the system never inserts balancing or plug rows. The same calculations feed the Excel export.

## Permission model

New granular permissions cover journal view/create/edit/submit/approve/post/reverse/audit, explicit opening posting, General Ledger view/export, Trial Balance view/export, and accounting-period management.

- Owners: all permissions.
- Managers: review/approve/post/reverse/opening post, reports, and period management.
- Accountants: draft/edit/submit and report access, but not approve/post.
- Reviewers: journal review/audit and read-only reports.
- Viewers: read-only journal and reports.
- Accounting-office users still require an active engagement, staff assignment, and intersecting engagement/member permissions.

## API routes

- `GET|POST /api/organizations/[id]/journal-entries`
- `GET|PUT|PATCH /api/organizations/[id]/journal-entries/[entryId]`
- `POST /api/organizations/[id]/journal-entries/[entryId]/reversal`
- `POST /api/organizations/[id]/journal-entries/[entryId]/correction`
- `POST /api/organizations/[id]/opening-balances/[batchId]/post`
- `GET /api/organizations/[id]/general-ledger`
- `GET /api/organizations/[id]/general-ledger/export`
- `GET /api/organizations/[id]/trial-balance`
- `GET /api/organizations/[id]/trial-balance/export`
- `PATCH /api/organizations/[id]/accounting-periods/[periodId]`

Mutation endpoints use same-origin checks, capped JSON bodies, strict Zod schemas, organization authorization, service transactions, and non-cacheable responses.

## Implemented Arabic RTL UI

- `القيود اليومية`: filtering, status counters, review queue, responsive table/cards, and entry drill-down.
- `إنشاء قيد جديد`: fiscal year/dates/currency/reference and dynamic debit/credit lines with client guidance plus server authority.
- Journal detail: lifecycle actions, actors, linked reversal/correction, source data, and event timeline.
- `دفتر الأستاذ العام`: account/date filters, opening/running/closing balances, source references, entry drill-down, mobile view, and Excel export.
- `ميزان المراجعة`: detailed/summary views, six amount columns, reconciliation state, responsive table, and Excel export.
- Opening balances: explicit post-to-ledger control and direct link to the resulting journal entry.
- Existing company navigation was extended rather than duplicated; the landing page was not redesigned.

## Financial Twin extension points

Future read-only analysis can anchor every fact to organization, fiscal year/period, posted entry, journal line, chart account, document/bank evidence, source revision/timestamp, and audit event. `JournalEvidenceLink` is the narrow evidence boundary for those consumers.

An isolated Excel Audit MVP should stage uploaded workbook data outside the journal, record file hash/revision/evidence time, run deterministic checks, and produce findings that link to evidence. It must not create or post journal records without the normal draft/review/approval/posting workflow.

## Tests and real results

All tests used local files and an isolated temporary PostgreSQL server; Production and Neon were not contacted.

| Check | Result |
| --- | --- |
| `npm test -- --run` | 44 passed; database-gated suites skipped as designed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed with zero warnings |
| `npm run test:db` | 6 migrations applied; 7 files and 75/75 integration tests passed |
| `npm run build` | Passed with Next.js 16.4.3; all Phase 2D routes compiled |
| `npm run test:visual` | Passed in Edge at 390, 768, 1280, 1440, and 1920 px; RTL/no overflow; auth redirects verified |

The database suite covers balance rejection/posting, company isolation, authorization, idempotency, concurrent posting, immutable postings, reversal, closed periods, opening posting exactly once, GL/TB calculations, large-value precision, all five account classes, contra/opposing balance, period boundary exclusion, audit events, and existing Phase 2A/2B/2C regressions.

## Issues and unresolved risks

- The migrations have been validated only on a disposable local PostgreSQL 17 instance. No shared Preview or Production database migration has run.
- The existing worktree still contains separate, pre-existing Phase 2C.1 source changes and many untracked reports/artifacts. They were deliberately preserved and excluded from the Phase 2D implementation commit. Phase 2C.1 should receive its own review/commit before a clean release line is assembled.
- No exchange-rate policy exists. Each entry is single-currency and mixed-currency posting is rejected by design; multi-currency accounting is deferred.
- Period closure is implemented, but reopening and formal year-end close are intentionally absent because they require a separately approved control policy.
- There is no Vercel Preview in this task. Authenticated browser CRUD was verified primarily through API/integration tests; browser smoke covered responsive public regression and protected-route boundaries.
- Before deployment, run migration rehearsal against a sanitized Preview copy, verify backup/rollback procedures, and perform a finance-owner acceptance test.

## Git and deployment status

- Review branch: `codex/phase2d-accounting-core`.
- Implementation commit: `78e7010` (`feat(accounting): add phase 2d journal and ledger core`).
- Base: `ba7c98d` on `codex/phase2c-review-20261108`.
- GitHub push: pending at the time this report was written; verify the remote hash after push.
- Vercel Preview: not created.
- Production deployment/migration: not performed.

## Remaining production blockers

1. Review and separately formalize the preserved Phase 2C.1 source work, then verify the combined clean branch.
2. Review migration/trigger SQL with the database and finance control owners.
3. Rehearse all migrations on a disposable Preview database restored from sanitized current schema/data.
4. Complete authenticated user-acceptance testing for accountant, reviewer/manager, owner, viewer, and delegated office roles.
5. Approve backup, rollback, period-close, reversal, and opening-correction operating procedures.
6. Obtain separate authorization before any Preview/Production migration or deployment.

## Recommended next phase

Run a Phase 2D.1 release-hardening and acceptance cycle: cleanly integrate Phase 2C.1, add authenticated end-to-end browser workflows, add period-management UI and formal close checklists, rehearse migrations, and obtain finance-owner sign-off. After that gate, an isolated evidence-only Excel Audit MVP can be built on `JournalEvidenceLink` without bypassing the ledger controls.
