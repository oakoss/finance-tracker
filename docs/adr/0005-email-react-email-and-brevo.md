# ADR 0005: Use React Email templates + Brevo delivery

Date: 2026-02-13
Status: Accepted

## Context

We need transactional emails for auth flows (verification + password reset) with:

- Maintainable templates in-code
- Reliable delivery
- Simple integration with Better Auth hooks

## Decision

Use React Email for templates and render to HTML server-side, then send via Brevo Transactional Email API using the `@getbrevo/brevo` SDK.

Email styling defaults:

- Tailwind v4 via `@react-email/components`.
- `pixelBasedPreset` enabled for email-client sizing compatibility.
- Palette in `src/modules/auth/emails/base-email.tsx` uses the light-theme OKLCH
  tokens from `:root` in `src/styles/globals.css`.
- System font stack applied at the base email wrapper for broad client support.

Expected configuration (see `.env.example`):

- Sender: `no-reply@finance.oakoss.dev`
- Reply-To: `support@financial.oakoss.dev`

## Alternatives Considered

- Brevo SMTP
- Resend
- Postmark

## Consequences

- Positive: Template code stays in TS/React; Brevo handles delivery and reputation.
- Negative: Requires Brevo sender/domain verification; careful handling of link base URLs.
- Follow-ups: Establish required env vars (`BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO`) and validate link generation in tunneled environments.
- Follow-ups: Keep email templates aligned with shared design tokens (colors + typography).
