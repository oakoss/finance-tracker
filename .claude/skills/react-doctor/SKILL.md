---
name: react-doctor
description: Use after editing React code, before committing, or when cleaning up a codebase. Runs the local react-doctor analyzer to surface state/effects, performance, security, accessibility, and architecture issues, and to flag health-score regressions vs the base branch.
---

# React Doctor

Scans React codebases for state/effects, performance, security, accessibility, and architecture issues. Outputs a 0–100 health score (higher is better).

## After React code changes

Run `pnpm react-doctor --verbose --diff` and check the score did not regress.

If the score dropped, fix the regressions before committing.

## Full codebase cleanup

Run `pnpm react-doctor --verbose` (without `--diff`) to scan the full codebase. Fix errors before warnings.

## Command

```bash
pnpm react-doctor --verbose --diff
```

| Flag        | Purpose                                       |
| ----------- | --------------------------------------------- |
| `--verbose` | Show affected files and line numbers per rule |
| `--diff`    | Only scan changed files vs base branch        |
