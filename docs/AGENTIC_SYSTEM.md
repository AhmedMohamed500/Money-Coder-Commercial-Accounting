# Governed Agentic System — Mock Provider

## Current behavior

`MockAIProvider` is deterministic and network-free. It is behind `AIProvider`, so a future provider can be introduced without changing product components.

The provider must use the tool registry. Implemented read tools are:

- `read_finding_evidence`
- `read_snapshot_summary`
- `read_account_balances`
- `read_journal_workflow`

Tools enforce agent-specific allowlists and tenant scope. Tool calls record permission, input/output summaries, status and duration.

## Prohibited authority

An agent cannot:

- approve or post a journal;
- accept risk or close a finding;
- cross organization boundaries;
- access production credentials;
- call an external model in the demo;
- claim certainty beyond available evidence.

An agent may propose a balanced draft correction when evidence and mappings are sufficient. The draft is marked `AI_SIMULATION` and then follows human submit, independent approval, posting and deterministic revalidation.

## Future provider contract

A real provider must receive only a server-authorized tenant context and evidence references. The server must re-run tool authorization, redact sensitive data, constrain tool schemas, cap budgets, log prompts/tool calls, support cancellation and require a human approval token for any mutating command. Model output is advisory and must never become an accounting posting instruction without deterministic validation.
