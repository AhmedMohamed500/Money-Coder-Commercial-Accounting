# Security and Demo Boundaries

## Enforced local boundaries

- Synthetic data only; no real upload is accepted by the new modules.
- `InMemoryDemoAdapter` performs no `fetch` and has no provider credentials.
- `MockAIProvider` uses local deterministic tools and reports zero external tokens/cost.
- Every import, snapshot, finding, journal and agent run is scoped to the current organization.
- Company switching does not aggregate or copy tenant data.
- AI proposals remain drafts and cannot approve or post themselves.
- Optional persistence is browser-local and can be reset; schema version 2 prevents loading incompatible old state.
- Demo-only build verification rejects database, auth, SMTP, S3, Neon, n8n and payment secrets.
- Demo-only proxy returns 404 for production routes at runtime.

## Not production security

The browser adapter is not an authorization boundary. A real backend must derive the tenant and actor from an authenticated session, validate every resource relationship, use revisions/idempotency, record an immutable audit log, rate-limit commands, isolate environments, encrypt data, and test backup/restore.

## Review checklist before a real AI or integration

- Data minimization and retention policy
- Provider contract and regional processing review
- Prompt/tool injection defenses
- Secret management and egress allowlist
- Human approval and break-glass controls
- Cross-tenant and object-enumeration testing
- Model/tool audit evidence and incident response
