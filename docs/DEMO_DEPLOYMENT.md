# Demo-only deployment runbook

This is a preparation document, not authorization to publish. Do not attach the existing Production project, domains or environment variables.

## Isolation design

- Build command: `npm run build:demo`.
- Configuration: `vercel.demo.json`.
- Required flag: `DEMO_ONLY_DEPLOYMENT=1`.
- A prebuild gate refuses known database, authentication, SMTP, object-storage, workflow and payment credentials.
- Proxy redirects `/` to `/demo`; every non-demo page/API returns `404` in demo-only mode.
- `/demo` continues to use `InMemoryDemoAdapter` and deterministic synthetic fixtures.

The denylist is defense in depth, not a reason to copy secrets. The separate project must have no Production environment variables at all.

## Reviewed preview procedure

1. Create a new Vercel project from the same repository with Production auto-deploy disabled.
2. Choose `codex/frontend-first-demo-foundation` or an approved demo branch.
3. Use `vercel.demo.json` as the local configuration and add only `DEMO_ONLY_DEPLOYMENT=1`.
4. Run the protected Preview deployment; do not assign the Production domain.
5. Verify `/demo`, direct attempts to `/api/*`, `/dashboard`, `/company`, `/office`, `/auth/*`, and `/`.
6. Inspect browser network traffic and deployment environment inventory; verify no production host or credential is present.
7. Share only the protected Preview URL with reviewers.
8. Make public access or Production promotion only after explicit written approval.

## Local verification (PowerShell)

```powershell
$env:DEMO_ONLY_DEPLOYMENT = "1"
npm run build:demo
Remove-Item Env:DEMO_ONLY_DEPLOYMENT
```

If any denied variable exists locally, the build must fail and name variables only, never their values.
