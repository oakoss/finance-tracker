import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { createServerCookies } from '@/lib/cookies';
import { sendEmail } from '@/lib/email';
import { userPreferences } from '@/modules/finance/db/schema';
import { isLocale } from '@/paraglide/runtime';

import { type EmailLocale, renderEmail } from './email-render';
import { ResetPasswordEmail } from './reset-password-email';
import { VerificationEmail } from './verification-email';

type EmailPerson = {
  email: string;
  id?: string | null;
  name?: string | null;
};

const localeCookieName = 'APP_LOCALE';

function getLocaleFromCookie(cookieHeader?: string | null) {
  if (!cookieHeader) return;
  const cookies = createServerCookies(cookieHeader);
  const locale = cookies.get(localeCookieName);
  return locale && isLocale(locale) ? locale : undefined;
}

async function getUserLocale(userId?: string | null) {
  if (!userId) return;

  const [preference] = await db
    .select({ locale: userPreferences.locale })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  if (preference?.locale && isLocale(preference.locale)) {
    return preference.locale;
  }
}

export async function sendVerificationEmail(params: {
  cookie?: string | null;
  locale?: EmailLocale;
  url: string;
  user: EmailPerson;
}) {
  const recipientName =
    params.user.name === null ? undefined : params.user.name;
  const resolvedLocale =
    params.locale ??
    getLocaleFromCookie(params.cookie) ??
    (await getUserLocale(params.user.id));
  const { html, text } = await renderEmail(
    <VerificationEmail name={params.user.name} url={params.url} />,
    {
      locale: resolvedLocale,
    },
  );

  await sendEmail({
    html,
    subject: 'Verify your email',
    text,
    to: [{ email: params.user.email, name: recipientName }],
  });
}

export async function sendResetPasswordEmail(params: {
  cookie?: string | null;
  locale?: EmailLocale;
  url: string;
  user: EmailPerson;
}) {
  const recipientName =
    params.user.name === null ? undefined : params.user.name;
  const resolvedLocale =
    params.locale ??
    getLocaleFromCookie(params.cookie) ??
    (await getUserLocale(params.user.id));
  const { html, text } = await renderEmail(
    <ResetPasswordEmail name={params.user.name} url={params.url} />,
    {
      locale: resolvedLocale,
    },
  );

  await sendEmail({
    html,
    subject: 'Reset your password',
    text,
    to: [{ email: params.user.email, name: recipientName }],
  });
}
