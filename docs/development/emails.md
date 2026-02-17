# Emails

How we build and style transactional emails in this repo.

## Stack

- Templates: React Email (`@react-email/components`)
- Delivery: Brevo Transactional Email API (`@getbrevo/brevo`)
- Styling: Tailwind v4 via the React Email `Tailwind` wrapper

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
- Use descriptive link text (avoid “click here”).
- Ensure good text/background contrast.
- Don’t rely on color alone to convey meaning.
- Keep the `lang` attribute set on the root `<Html>`.

## Adding a new email

1. Create a new template in `src/modules/auth/emails/`.
2. Use `BaseEmail` as the wrapper.
3. For auth emails, add the new template to the Better Auth hooks. For
   non-auth emails, wire it into the feature flow and use `sendEmail` +
   `renderEmail`.

## Localization (Paraglide)

- Email templates can use Paraglide messages directly.
- Use the `renderEmail` helper in `src/modules/auth/email-render.ts` to render
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
import type { EmailLocale } from '@/modules/auth/email-render';
import { renderEmail } from '@/modules/auth/email-render';
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

From `docs/development/env.md`:

- `BREVO_API_KEY`
- `EMAIL_FROM`
- `EMAIL_FROM_NAME`
- `EMAIL_REPLY_TO`

## Related docs

- ADR: `docs/adr/0005-email-react-email-and-brevo.md`
