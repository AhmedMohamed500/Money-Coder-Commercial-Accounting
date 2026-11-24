# Guardian Foundation Baseline

**Audit date:** 24 November 2026  
**Starting commit:** `0c99caa302e8227d944ec3683e096f19aa57b05e`  
**Source branch:** `codex/frontend-first-demo-foundation`  
**Local implementation branch:** `codex/guardian-financial-twin-v1`

## Repository safety

- The new branch was created from the latest local Demo HEAD, not `main`.
- The pre-existing `next.config.ts` development-origin change and all untracked reports/artifacts remain untouched and outside this work.
- No Prisma schema, migration, production route, credential, provider configuration, Git remote, Vercel project, or production data was changed.
- This implementation remains local-only. No push, merge, or deployment is authorized.

## Baseline verification

| Check | Result | Evidence |
| --- | --- | --- |
| ESLint | PASS | `npm run lint` on the starting commit |
| TypeScript | PASS | `npm run typecheck` on the starting commit |
| Automated tests | PASS with documented skips | `56 passed`, `24 skipped`; skipped suites require external integration configuration |
| Demo isolation | EXISTING | `src/proxy.ts`, `scripts/verify-demo-only-env.mjs`, `vercel.demo.json` |
| Client-only demo state | EXISTING | `src/demo/state/demo-provider.tsx`, `src/data/adapters/demo/in-memory-demo-adapter.ts` |
| Inert HTTP boundary | EXISTING | `src/data/adapters/http/http-product-adapter.ts` has injected transport and no default `fetch` |
| Backend-neutral DTOs | EXISTING | `src/contracts/v1.ts`, `contracts/openapi.yaml` |

## Capability audit

| Capability | Baseline classification | Evidence and gap |
| --- | --- | --- |
| Isolated frontend demo | EXISTING / REUSE | `/demo` uses `DemoProvider` and `InMemoryDemoAdapter`; no production service import |
| Synthetic organizations | EXISTING / EXTEND | Three tenant-scoped organizations in `demo-fixtures.ts` |
| Company and office workspaces | EXISTING / REUSE | Interactive company profile, office portfolio and delegated reviewer scope |
| Documents and reviews | EXISTING / EXTEND | Enforced review state machine; not yet connected to control findings |
| Chart of accounts | EXISTING / EXTEND | Flat posting accounts only; no hierarchy, contra, active, normal-balance or statement mapping metadata |
| Journal entries | EXISTING / EXTEND | Exact minor units and balance checks exist; manual workflow still creates and posts in one operation |
| General ledger | EXISTING / EXTEND | Posted movement and running balance exist; period/opening/source filters require extension |
| Trial balance and reports | EXISTING / EXTEND | Exact baseline equality and position equation are tested; comparative periods and reversals are absent |
| Bank statement journey | EXISTING / EXTEND | Synthetic mapping → draft → human post exists; reconciliation control evidence is absent |
| Async UI operations | EXISTING / REUSE | Loading, success, safe error and manual retry in `DemoProvider.execute()` |
| Financial Twin | NEW | No raw/normalized import batches, mapping, snapshots or rollback model |
| Data Quality Center | NEW | No deterministic completeness/validity/mapping score |
| Financial Control Engine | NEW | No versioned rule registry, rule result or evidence model |
| Guardian findings | NEW | No finding lifecycle, evidence drill-down, assignment, correction or revalidation |
| Mock AI agents | NEW | No provider-neutral AI interface, tool registry or audited agent run |
| Financial close | NEW | No period checklist derived from verifiable tasks |
| Bilingual terminology | NEW | Arabic-first strings are embedded in components; no central terminology registry or display mode |
| Forecasting, integrations, ROI | DEFERRED until the core Guardian journey is stable | Must not become disconnected dashboard mockups |

## Baseline accounting findings

1. Monetary storage uses safe integer minor units and the future HTTP contract uses decimal strings.
2. Journal lines reject simultaneous debit and credit, but account activity/posting eligibility and period status are not represented.
3. Manual entries bypass `DRAFT → PENDING_APPROVAL → APPROVED → POSTED`.
4. Reversal entries, immutable reversal links and segregation of duties are not implemented.
5. Account balance direction is inferred from account type, so contra accounts cannot be represented correctly.
6. Opening balances are represented by an opening journal, but period trial-balance columns are not exposed.
7. Company and currency isolation are tested and must remain preserved.

## Baseline security boundaries

- Demo role switching is presentation simulation, not authentication.
- The demo build denies production-capable environment variables.
- Demo-only middleware returns 404 outside `/demo`.
- No real file selector, upload, database, SMTP, S3, n8n, payment, ERP or AI provider is used.
- Production authorization, secure storage, malware quarantine, distributed rate limiting, backup/restore and provider security remain backend/production work and are not claimed fixed here.

## Implementation decision

The work will be additive and staged:

1. Harden accounting domain rules and introduce a central terminology layer.
2. Add traceable synthetic imports, raw/normalized records and immutable financial snapshots.
3. Add a deterministic control registry and Guardian finding lifecycle.
4. Add an evidence-bound mock AI provider that cannot approve or post.
5. Complete one tested end-to-end Guardian journey before adding secondary simulations.

No existing UI or production infrastructure will be replaced merely to match a proposed folder tree.
