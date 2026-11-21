# Frontend-First Demo Scope

## Purpose

`/demo` is an isolated, client-side product demonstration. It tells the Money Coder product story without Neon, PostgreSQL, Prisma runtime queries, SMTP, S3, n8n, payment services, or production authentication.

Every screen displays **«وضع تجريبي — بيانات افتراضية»**. Fictional records use `DEMO` labels and do not contain real customer names, credentials, files, logos, or payment details.

## Isolation guarantees

- The `/demo` route imports only `domain`, `application/demo`, `data/ports`, `data/adapters/demo`, `demo`, and reusable product components.
- It never imports `src/lib/db.ts`, `src/lib/auth.ts`, `src/lib/storage.ts`, Prisma, email, n8n, or production API route handlers.
- The demo adapter does not call `fetch`, `XMLHttpRequest`, WebSocket, or third-party SDKs.
- Simulated upload creates a sample metadata record only. The demo renders no file picker, never reads a browser file, and never sends file bytes.
- Browser persistence is disabled by default. The user may opt in to `localStorage`; only deterministic synthetic demo state is stored.
- Reset restores the deterministic baseline.
- Role switching is a presentation control, not authentication or authorization.

## Implemented demo modules

| Module | Functional behavior |
| --- | --- |
| Overview | KPIs, tasks, notifications, activity and charts derived from shared state |
| Company setup | Edit fictional profile, preview staff permissions and banking profiles |
| Accounting office | Three-client portfolio, company isolation, staff assignments and delegated scope |
| Documents | Search, filter, version display and sample-only staged upload |
| Reviews | Tenant-scoped assignment, explicit review start, enforced transitions, resubmission, version creation, approval/rejection, comments and timeline |
| Accounting | Classified chart of accounts, balanced journal validation, demo posting, account ledger with running balance and trial balance equality |
| Bank statement | Preloaded rows, simulated extraction label, account mapping and sample suggestion |
| Reports | Income, position, trial balance, company filtering and real local CSV download |
| Plans | Illustrative comparison with disabled, non-charging actions |
| Settings/help | Role explanation, optional local persistence, walkthrough and reset |

## Deliberately not implemented as real services

- Real authentication, invitations, email verification or password reset.
- Real file upload/download, object storage, antivirus or OCR/AI extraction.
- Real accounting approval, tax filing or statutory reporting.
- Real payment collection, card entry, subscriptions or invoices.
- Production notifications, audit retention, backup or recovery.

## Demonstration walkthrough

1. Open `/demo`, confirm the demo badge, and choose one of the three guided roles.
2. **Company Owner:** review performance, update the fictional profile, follow an approval decision, then read the resulting statements.
3. **Accounting Office:** open the client portfolio, switch companies, assign an authorized reviewer, start the review, request correction, resubmit, restart review and approve.
4. **Accountant:** inspect the classified chart, post equal debit and credit lines, inspect the account ledger and trial balance, then run the guarded bank-statement journey.
5. Confirm overview counters, localized activity, statements and CSV values change only for the active company.
6. Reset and confirm the deterministic baseline returns.
