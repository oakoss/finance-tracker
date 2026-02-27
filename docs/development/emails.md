# Emails

How we build and style transactional emails in this repo.

## Stack

- Templates: React Email (`@react-email/components`)
- Delivery: Brevo Transactional Email API (production) or SMTP via
  nodemailer (local dev / CI)
- Styling: Tailwind v4 via the React Email `Tailwind` wrapper
- Local testing: Mailpit (SMTP trap with web UI and REST API)

## Email transport

`src/lib/email.ts` picks the transport at runtime:

| Condition                  | Transport         | Use case                |
| -------------------------- | ----------------- | ----------------------- |
| `SMTP_HOST` is set         | nodemailer → SMTP | Local dev, CI (Mailpit) |
| `SMTP_HOST` is **not** set | Brevo API         | Production              |

Set `SMTP_HOST=localhost` and `SMTP_PORT=1025` in your `.env` for local
development. Brevo requires `BREVO_API_KEY` and is only used in
production.

## Mailpit (local email testing)

Mailpit runs as a Docker Compose service alongside PostgreSQL:

```bash
pnpm docker:up        # starts db + mailpit
```

- **SMTP**: `localhost:1025` (receives all outgoing email)
- **Web UI**: `http://localhost:8025` (browse captured emails)
- **REST API**: `http://localhost:8025/api/v1/...` (used by E2E tests)

Emails are stored in memory and reset on container restart.

### E2E email assertions

Import the Mailpit fixture in Playwright tests:

```ts
import { expect, test } from '~e2e/fixtures/mailpit';

test('sends verification email', async ({ page, mailpit }) => {
  const emailPromise = mailpit.waitForEvent('new');

  // trigger sign-up flow...

  const event = await emailPromise;
  expect(event.Data.Subject).toBe('Verify your email');
});
```

The fixture clears all messages before each test and disconnects
the event listener after.

## Where templates live

- Base layout + Tailwind config: `src/modules/auth/emails/base-email.tsx`
- Templates:
  - `src/modules/auth/emails/verification-email.tsx`
  - `src/modules/auth/emails/reset-password-email.tsx`

## Tailwind setup for emails

Emails use a local Tailwind config in `BaseEmail`:

- `pixelBasedPreset` is enabled for email client compatibility.
- Colors are aligned to the light theme OKLCH tokens from `:root` in
  `src/styles/globals.css`.
  These values are manually mirrored in `BaseEmail`, so keep them in sync
  when tokens change.
- System font stack is used for maximum client support.

If you add new tokens for email, extend the `colors` (or `fontFamily`) in `BaseEmail`.

## Template conventions

- Wrap content with `BaseEmail` and pass a `preview` string.
- Use the shared token classes (`bg-card`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `text-primary-foreground`).
- Prefer `Text` for body copy with `text-base/relaxed` (or `leading-relaxed`).
- Keep layout simple for email client compatibility.

## Preview and testing

- Render emails locally using the React Email CLI (e.g. `pnpm dlx react-email`)
  or your preferred preview setup.
- Sanity-check in a real client (Gmail/Outlook) for spacing and button styles.
- Avoid relying on custom CSS features with poor email client support; lean on
  Tailwind utilities and simple layouts.

## Email client constraints

- Favor simple layouts and avoid complex positioning.
- Use inline-friendly utilities; not all clients support modern CSS.
- Be conservative with hover and focus effects.

## Best practices

- Keep preview text under ~90 characters.
- Prefer sending both HTML and plain-text versions. `renderEmail` provides both;
  `sendEmail` only sends what you pass.
- `sendEmail` uses `EMAIL_FROM`, `EMAIL_FROM_NAME`, and `EMAIL_REPLY_TO` from
  env by default (`EMAIL_REPLY_TO` is required by the env schema). Pass
  `replyTo` to override per email.
- Use consistent sender/reply-to and clear subjects.
- Avoid overly complex styles that reduce deliverability.

## Accessibility checklist

- Add `alt` text for any images.
- Use descriptive link text (avoid "click here").
- Ensure good text/background contrast.
- Don't rely on color alone to convey meaning.
- Keep the `lang` attribute set on the root `<Html>`.

## Adding a new email

1. Create a new template in `src/modules/auth/emails/`.
2. Use `BaseEmail` as the wrapper.
3. For auth emails, add the new template to the Better Auth hooks. For
   non-auth emails, wire it into the feature flow and use `sendEmail` +
   `renderEmail`.

## Localization (Paraglide)

- Email templates can use Paraglide messages directly.
- Use the `renderEmail` helper in `src/modules/auth/emails/email-render.ts` to render
  localized HTML + plain text and restore the previous locale.
- Pass an optional `locale` when sending emails (e.g.
  `sendVerificationEmail({ user, url, locale })`).
- Locale resolution order: explicit `locale` param → `APP_LOCALE` cookie →
  `user_preferences.locale` → runtime `getLocale()` → `baseLocale`.
- Better Auth email hooks pass the `request` as a second argument; we forward
  `request.headers.get('cookie')` into the email sender to read `APP_LOCALE`.
  Cookie-based locale detection requires passing the raw cookie header.
  Cookie lookup happens in `email-service`; `renderEmail` does not parse cookies.
- If no locale/cookie is available and Paraglide middleware has not run,
  `renderEmail` falls back to `baseLocale`.
  Runtime `getLocale()` is only consulted by `renderEmail` when
  `email-service` resolves no locale.
  Non-auth flows using `renderEmail` directly should pass `locale` if they need
  cookie or user-preference behavior.

### Non-auth email example (with locale)

If you need to send a custom email outside of Better Auth, prefer using the
render helper so you get HTML + plain text and consistent locale handling:

```ts
import { Text } from '@react-email/components';

import { sendEmail } from '@/lib/email';
import type { EmailLocale } from '@/modules/auth/emails/email-render';
import { renderEmail } from '@/modules/auth/emails/email-render';
import { BaseEmail } from '@/modules/auth/emails/base-email';

function BillingSummaryEmail({ url }: { url: string }) {
  return (
    <BaseEmail preview="Your monthly summary is ready">
      <Text className="text-foreground text-base leading-relaxed">
        View your summary here: {url}
      </Text>
    </BaseEmail>
  );
}

export async function sendBillingSummaryEmail(params: {
  to: { email: string; name?: string | null };
  locale?: EmailLocale;
  summaryUrl: string;
}) {
  const { html, text } = await renderEmail(
    <BillingSummaryEmail url={params.summaryUrl} />,
    { locale: params.locale },
  );

  await sendEmail({
    to: [{ email: params.to.email, name: params.to.name ?? undefined }],
    subject: 'Your monthly summary',
    html,
    text,
  });
}
```

## Environment variables

| Variable          | Required  | Description                                          |
| ----------------- | --------- | ---------------------------------------------------- |
| `SMTP_HOST`       | No        | SMTP server host (enables nodemailer transport)      |
| `SMTP_PORT`       | No        | SMTP server port (default: 1025)                     |
| `BREVO_API_KEY`   | Prod only | Brevo API key (required when `SMTP_HOST` is not set) |
| `EMAIL_FROM`      | Yes       | Sender email address                                 |
| `EMAIL_FROM_NAME` | No        | Sender display name                                  |
| `EMAIL_REPLY_TO`  | Yes       | Reply-to email address                               |

## Related docs

- ADR: `docs/adr/0005-email-react-email-and-brevo.md`
