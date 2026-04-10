# Research: Profile page UX in finance apps

Date: 2026-04-09
Related: TREK-35 / EPIC-9

## Summary

Researched profile/account page patterns across YNAB, Monarch Money,
Lunch Money, Actual Budget, and general SaaS apps (GitHub, Vercel,
Linear) before implementing the finance tracker's profile page.

## Pitfalls

- Burying currency/timezone/locale settings deep in nested menus
- No data export prompt before account deletion
- Mixing identity settings with billing on one page
- No re-auth for email/password changes (security anxiety)
- Desktop-only profile pages that break on mobile

## Community pain points

- YNAB: timezone handling causes budget rollover confusion
- Monarch Money: no date format or first-day-of-week customization
- Mint shutdown: users lost years of data, reinforcing demand for
  easy data export from profile/settings
- Recurring theme: "let me change display name without changing
  login email"
- Power users want API token management in profile

## Patterns adopted

- Initials-based avatar (no upload for MVP) — standard in YNAB,
  Monarch, Linear
- Danger zone: visually distinct section at bottom with destructive
  border (GitHub, Vercel, Linear pattern)
- Type-to-confirm for account deletion
- Data export prompt before deletion (deferred to TREK-70)
- 7-day grace period with email confirmation to cancel
- Profile page as a "trust surface" — security signals matter more
  in finance apps than other categories

## Patterns deferred

- Avatar upload (storage, resizing, moderation)
- Session management (active sessions list, device revocation)
- API key / personal access token management
- 2FA setup in profile
- Notification preferences
