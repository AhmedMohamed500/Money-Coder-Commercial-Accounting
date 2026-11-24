# Deterministic Financial Control Engine

## Registry

`control-registry.ts` is the authoritative demo registry. Every rule defines an ID, semantic version, Arabic and English names, category, severity, required data, recommendation and implementation state.

- `EXECUTABLE`: implemented against the available demo evidence.
- `INSUFFICIENT_DATA`: intentionally returns that state; it never reports a false pass.
- `PLANNED`: reserved for later work.

The registry includes banking, accounting, receivables, payables, expenses, fixed assets, inventory and close rules. The current executable slice covers BNK-001/003/004, ACC-001/002/003/004/005/006/007 and CLS-001.

## Result semantics

Each execution returns exactly one of:

`PASSED | FINDING | INSUFFICIENT_DATA | NOT_APPLICABLE | EXECUTION_ERROR | DISABLED`

Findings retain rule version, snapshot, related transactions/documents, currency, amount under review, evidence, recommendation, lifecycle history and a duplicate fingerprint.

Finding IDs are derived from a stable hash of their duplicate fingerprint, not array order. This prevents identity collisions when a later run removes or reorders candidates.

## Exposure and recovery

- Open exposure uses the maximum amount for each duplicate fingerprint, preventing repeated findings from inflating the KPI.
- Verified recovery includes only `RESOLVED` findings whose revalidation result is `PASSED`.
- No claimed saving or recovery is inferred from detection alone.

## Revalidation

Revalidation runs the same versioned deterministic rule against the same snapshot plus the current posted ledger. A finding is resolved only when its rule/fingerprint is no longer detected. Otherwise it becomes `REOPENED`.

## Real backend requirements

- Store rule versions and immutable execution inputs.
- Run controls idempotently per tenant/snapshot/rule version.
- Persist evidence pointers, not unbounded copied payloads.
- Lock lifecycle transitions with revisions.
- Separate rule execution permission from finding disposition permission.
- Queue large runs and expose progress; never silently skip a rule.
