# Financial Twin Architecture — Local Demo Foundation

## Scope

The current implementation is a deterministic, frontend-only vertical slice. It does not upload a file, call an ERP, contact Neon, or mutate the production accounting application.

```text
Synthetic source adapter
  -> raw records (immutable evidence)
  -> normalized transactions
  -> reviewed account mappings
  -> validation and duplicate detection
  -> versioned FinancialSnapshot
  -> deterministic control engine
  -> evidence-linked findings
  -> governed mock-agent analysis
  -> human correction workflow
  -> posting and revalidation
```

## Domain ownership

| Module | Responsibility |
| --- | --- |
| `domain/financial-twin` | Import batches, raw records, normalized transactions, snapshots and quality metrics |
| `integrations/demo/synthetic-financial-sources.ts` | Generates deterministic Excel/CSV/ERP-like data without I/O |
| `application/financial-twin/import-engine.ts` | Mapping, validation, duplicate detection, atomic group rejection, snapshot creation and quality scoring |
| `data/ports/product-demo-port.ts` | Async UI boundary that a real API adapter can replace |
| `InMemoryDemoAdapter` | Tenant-scoped orchestration and immutable state replacement |

## Import lifecycle

```text
LOADED -> MAPPED -> VALIDATED -> CONFIRMED
                                -> ROLLED_BACK
```

- Raw evidence is never overwritten by mapping or validation.
- A row contains a source fingerprint and source row number.
- A transaction group is atomic for structural rejection: if one line is unmapped or structurally rejected, valid-looking sibling lines are rejected with `GROUP_HAS_INVALID_LINE`.
- Duplicate rows remain visible and are excluded from the confirmed snapshot.
- Confirmed snapshots contain accepted record IDs, source/mapping versions, coverage and exact minor-unit totals.
- Rollback marks the import; it does not erase evidence.

## Data quality formula

The demo score is the rounded arithmetic mean of:

1. required-field completeness;
2. valid-record percentage;
3. account-mapping coverage;
4. freshness band.

The UI also reports duplicates, unmapped accounts, rejected rows, missing references and reconciliation difference. This formula is a documented demo policy, not an accounting standard.

## Backend replacement

The backend should persist raw records in append-only storage, normalized transactions in tenant-scoped tables, and snapshots as immutable versioned aggregates. Confirmation and rollback require idempotency keys and revisions. The UI must continue to use the port; it must not consume database-shaped DTOs.
