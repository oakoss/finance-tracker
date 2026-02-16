# ADR 0016: User Preferences in Separate Table

Date: 2026-02-15
Status: Accepted

## Context

We need to store user-level preferences (currency, locale, time zone, onboarding flags) without modifying Better Auth’s generated `users` table.

## Decision

- Create a `user_preferences` table keyed by `user_id`.
- Keep preferences out of the auth schema to avoid conflicts with Better Auth schema generation.

## Alternatives Considered

- Add columns directly to `users` (risk of being overwritten by auth schema generation).
- Store preferences in JSON inside another table.

## Consequences

- Positive: Safer integration with Better Auth; easier to evolve preferences.
- Negative: Extra join to read user preferences.
- Follow-ups: Add a helper to join preferences into session payloads.
