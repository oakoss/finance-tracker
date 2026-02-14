# ADR 0011: CI and Dependency Automation

Date: 2026-02-14
Status: Accepted

## Context

We want consistent checks on PRs with minimal friction, and dependency updates on a monthly cadence.

## Decision

- CI runs static analysis for all PRs with docs-only optimization.
- Use CodeQL (monthly, security-extended) and Dependency Review for PRs.
- Renovate runs monthly with automerge for non-major updates, excluding core packages.
- Pin GitHub Actions by SHA.

## Alternatives Considered

- Run full test suite on every PR (higher cost).
- Manual dependency updates only.

## Consequences

- Positive: Consistent checks, lower maintenance, predictable updates.
- Negative: Monthly cadence may delay non-critical updates.
- Follow-ups: Enable unit/E2E jobs when tests exist.
