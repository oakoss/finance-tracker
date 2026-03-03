# Claude Code Local Rules

## Post-Plan Checklist

- All checks pass (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`) or failures are documented as pre-existing.
- Run `/pr-review-toolkit:review-pr` and `/de-slopify` after finishing a plan.
- Delete plan files from `.claude/plans/` after the plan has been fully implemented.
