# Money Coder Guardian Roadmap

## Status legend

- **Implemented locally**: deterministic frontend-only behavior with synthetic data and automated coverage.
- **Contract-ready**: port, DTO or OpenAPI boundary exists, but no real service is connected.
- **Deferred**: requires an approved backend, provider, production security review or product decision.

## M0 — Verified baseline

Status: **Implemented locally**.

- Capability and security boundary audit.
- Demo-only isolation retained.
- No production credentials, database writes or provider connections.

## M1 — Accounting hardening

Status: **Implemented locally for the demo**.

- Explicit draft, submit, approve, post and reverse lifecycle.
- Balanced-entry, account, period, reference and segregation checks.
- Contra-account and normal-balance-aware reporting.
- Period-scoped ledger, trial balance and statements.

Backend work remains: transactional enforcement, database constraints, immutable audit/outbox records and concurrency tests.

## M2 — Financial Twin ingestion

Status: **Implemented locally with synthetic sources; contract-ready for real ingestion**.

- Source batch, account mapping, deterministic validation and duplicate detection.
- Atomic rejection of invalid transaction groups.
- Immutable versioned snapshot model and quality metrics.
- Rollback contract that preserves evidence.

Deferred: real Excel/CSV parsers, bank/ERP connectors, malware scanning, object storage and high-volume workers.

## M3 — Guardian control engine

Status: **Implemented locally for 11 deterministic controls**.

- Versioned registry containing 30 controls.
- Evidence-linked findings, stable fingerprints and lifecycle transitions.
- Revalidation and verified-recovery calculation.
- Rules without sufficient synthetic evidence report `INSUFFICIENT_DATA`.

Deferred: provider-scale rule execution, scheduling, distributed locks and 1k/10k/50k benchmark certification.

## M4 — Governed agents

Status: **Implemented locally with a mock provider**.

- Provider port, tool registry, allowlists and run trace.
- Advisory analysis and draft correction proposal.
- Human approval/posting boundaries remain mandatory.
- External token usage and cost remain zero.

Deferred: any external AI provider, prompt/data-governance approval, provider credentials, model evaluation and production observability.

## M5 — Forecasting and integrations

Status: **UI foundation and contracts only**.

- Scenario-ready forecast types and synthetic presentation.
- Integration catalog and operational status model.

Deferred: approved forecasting engine, real connectors, secrets management, background jobs and reconciliation workflows.

## M6 — Commercial and production readiness

Status: **Deferred**.

- Packaging, usage metering, entitlements and ROI evidence require product approval.
- Payments, subscriptions, public access and production deployment are explicitly out of scope.
- Promotion requires accounting review, security review, tenant-isolation tests, load tests, restore drills and an explicit release approval.
