# Guardian V1 financial integrity acceptance

**Recommendation — APPROVE WITH CONDITIONS for a protected, synthetic-data demonstration.** Production readiness remains unverified.

| Requirement | Classification | Evidence and limits |
|---|---|---|
| Import, mapping, validation and snapshots | Verified Working | `src/application/financial-twin/import-engine.ts` and `tests/financial-twin-control.test.ts` verify source lineage, batch immutability through the adapter, cross-company isolation, and atomic rejection of invalid groups. The base sample contains 16 rows, 8 accepted, 8 excluded, and a 50,000-minor-unit diagnostic imbalance. The snapshot is analytical evidence, not a posted ledger. |
| Deterministic controls | Working with Limitations | `src/application/control-engine/run-controls.ts` evaluates 11 of 30 registered controls across the supported demo datasets. Missing or unavailable inputs are represented separately from passed controls. Rules can return source, account, journal or calculation evidence. A confirmed correction is distinct from recovered cash. |
| Money Coder accounting correction | Verified Working | `tests/financial-twin-control.test.ts` tests a draft, separate human roles for submission/approval/posting, positive matching journal evidence, and reopening after reversal. |
| ERP-only correction | Simulated | Verified for the Odoo BNK-001 fixture. A confirmed, newer targeted snapshot contains source posting evidence. Internal journals are byte-for-byte unchanged in the unit test. Missing or disabled verification keeps the finding open. |
| Financial reports | Working with Limitations | `tests/accounting-demo-accuracy.test.ts` and `tests/accounting-hardening.test.ts` verify balanced and unbalanced journals, opening balances, permissions, currencies by company, reversal, trial balance and cumulative position. The latter now carries prior profit into the position as of the report date. Production decimal limits and formal close remain pending. |
| Mock AI | Simulated | `src/application/agents/tool-registry.ts` and `tests/financial-twin-control.test.ts` verify read-only allowlisted operations, linked evidence and no network or auto-posting. Dedicated cancellation and durable failure tracking are pending. |
| Bilingual interface | Working with Limitations | Browser coverage checks navigation terminology and RTL/LTR modes. Body copy, some status labels and notifications remain Arabic. Full English-only localization is not implemented. |
| Close and forecasting | Working with Limitations | Browser navigation opens both screens; close-readiness cards and a read-only fixture forecast do not simulate a full close or editable forecast. |
| Backend integration | Contract Only | `contracts/openapi.yaml`, `src/data/ports/product-demo-port.ts` and `docs/BACKEND_HANDOFF.md`. Production service DTOs, permissions, concurrency, persistence and HTTP wiring require implementation. |
| Production integrations and cutover | Not Implemented | This acceptance concerned the standalone demo. Production tenant and field-level authorization, distributed rate limiting, private storage controls, backup restore and secrets isolation still need separate validation. |

## Regression commands

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `DEMO_ONLY_DEPLOYMENT=1 npm run build:demo` (PowerShell equivalent: `$env:DEMO_ONLY_DEPLOYMENT='1'; npm run build:demo`)
- `npm run test:e2e:demo` with `DEMO_E2E_BASE_URL` set to the isolated local server.

The 24 skipped Vitest cases are in three suites gated by `RUN_DB_TESTS=1`: PostgreSQL tenancy and delegation, authentication, and private storage. Their skipped status provides no evidence of production readiness.
