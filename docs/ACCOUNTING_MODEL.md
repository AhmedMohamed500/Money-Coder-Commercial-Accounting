# Accounting Model and Demo Limits

## Chart of accounts

Accounts now include hierarchy, level, class, normal balance, statement group, statement sign, contra flag, active flag and posting permission. Summary and inactive accounts cannot receive journal lines.

## Journal lifecycle

```text
DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTED -> REVERSED
          -> CORRECTION_REQUESTED -> PENDING_APPROVAL
```

- Draft creation validates exact minor units, line semantics, tenant ownership and posting accounts.
- Submission rechecks balance and open period.
- Approval requires an approval permission and separation from the creator role.
- Posting requires an approved entry and rechecks all invariants.
- Reversal creates an opposite posted entry and links both immutable records.
- Ledger and reports include posted entries and both sides of a reversal, producing a net-zero reversal effect.

## Periods and reporting

The fixtures contain a closed opening period and an open current period. Posting into a closed period is blocked. Reporting supports normal-balance presentation, contra signs and period opening/movement/closing trial-balance rows.

## Numeric limits

The local demo uses safe integer minor units. All operands and running totals must satisfy `Number.isSafeInteger`. A real backend must use exact decimal or integer minor units with currency-specific scale and return decimal strings in JSON.

## Boundaries

The model is not a claim of full IFRS or Egyptian tax compliance. Policies for provisions, foreign currency, VAT, depreciation, consolidation and statutory reporting remain backend/accounting-policy work.
