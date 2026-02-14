# Managing Updates

Updates are handled via Renovate on a monthly cadence.

## Renovate Policy

- Monthly schedule (first day of the month).
- Automerge for non-major updates except key packages (React, Better Auth, Drizzle, TanStack).
- Major updates are manual review.

## Manual Updates

If you need to update outside Renovate, run full checks:

```bash
pnpm lint
pnpm typecheck
pnpm build
```
