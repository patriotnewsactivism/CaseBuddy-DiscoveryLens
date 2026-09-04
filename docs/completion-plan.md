# Completion Plan Record

- Approved plan SHA-256: `b2ee166bda01f4e928c05681a5baa990b869b524ba8a59079801cabfef5a9095`
- Baseline: `a33697245862271ac6458b449a7d87d6f40be6b1` on `main`
- Working branch: `codex/secure-completion-a336972`

## Initial Failure Boundary

No production deployment, data migration, or feature expansion may proceed until authorization is server-enforced and verified. Several API routes currently use a Supabase service-role client without authenticating the caller or checking project membership. The existing collaboration migration also contains public read policies for sensitive records.

## Approved Scope

1. Inventory operations and establish reproducible checks.
2. Add forward-only schema and least-privilege policy remediation with clean and legacy replay coverage.
3. Enforce authenticated project-role authorization on protected API and storage operations.
4. Make upload, processing, Bates allocation, and report persistence retry-safe and idempotent.
5. Add CI, production verification, provenance/provider coverage, and operator documentation.

## Stop Conditions

Stop and report on migration incompatibility that cannot be repaired forward-only, any unresolved cross-project access, unavailable safe test infrastructure, missing deployment access, or a second unsuccessful remediation of the same blocker.
