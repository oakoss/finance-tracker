import { eq } from 'drizzle-orm';
import { ENV } from 'varlock/env';

import { db } from '@/db';
import { createServerCookies } from '@/lib/cookies';
import { sendEmail } from '@/lib/email';
import { formatDate } from '@/lib/i18n/date';
import { userPreferences } from '@/modules/preferences/db/schema';
import { m } from '@/paraglide/messages';
import { isLocale } from '@/paraglide/runtime';

import { DeletionCancelledEmail } from './deletion-cancelled';
import { DeletionCompleteEmail } from './deletion-complete';
import { DeletionScheduledEmail } from './deletion-scheduled';
import { type EmailLocale, renderEmail } from './email-render';
import { ResetPasswordEmail } from './reset-password-email';
import { VerificationEmail } from './verification-email';

type EmailPerson = { email: string; id?: string | null; name?: string | null };

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
  const { html, subject, text } = await renderEmail(
    <VerificationEmail name={params.user.name} url={params.url} />,
    {
      locale: resolvedLocale,
      subject: () => m['email.verification.subject'](),
    },
  );

  await sendEmail({
    html,
    subject: subject ?? m['email.verification.subject'](),
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
  const { html, subject, text } = await renderEmail(
    <ResetPasswordEmail name={params.user.name} url={params.url} />,
    {
      locale: resolvedLocale,
      subject: () => m['email.resetPassword.subject'](),
    },
  );

  await sendEmail({
    html,
    subject: subject ?? m['email.resetPassword.subject'](),
    text,
    to: [{ email: params.user.email, name: recipientName }],
  });
}

export async function sendDeletionScheduledEmail(params: {
  purgeAfter: Date;
  user: EmailPerson;
}) {
  const recipientName =
    params.user.name === null ? undefined : params.user.name;
  const resolvedLocale = await getUserLocale(params.user.id);
  const purgeDate = formatDate(
    resolvedLocale
      ? { locale: resolvedLocale, value: params.purgeAfter }
      : { value: params.purgeAfter },
  );
  const profileUrl = `${ENV.BETTER_AUTH_URL}/profile`;
  const { html, subject, text } = await renderEmail(
    <DeletionScheduledEmail
      name={params.user.name}
      profileUrl={profileUrl}
      purgeDate={purgeDate}
    />,
    {
      locale: resolvedLocale,
      subject: () => m['email.deletionScheduled.subject'](),
    },
  );

  await sendEmail({
    html,
    subject: subject ?? m['email.deletionScheduled.subject'](),
    text,
    to: [{ email: params.user.email, name: recipientName }],
  });
}

export async function sendDeletionCancelledEmail(params: {
  user: EmailPerson;
}) {
  const recipientName =
    params.user.name === null ? undefined : params.user.name;
  const resolvedLocale = await getUserLocale(params.user.id);
  const { html, subject, text } = await renderEmail(
    <DeletionCancelledEmail name={params.user.name} />,
    {
      locale: resolvedLocale,
      subject: () => m['email.deletionCancelled.subject'](),
    },
  );

  await sendEmail({
    html,
    subject: subject ?? m['email.deletionCancelled.subject'](),
    text,
    to: [{ email: params.user.email, name: recipientName }],
  });
}

export async function sendDeletionCompleteEmail(params: {
  user: { email: string; name?: string | null };
}) {
  const recipientName =
    params.user.name === null ? undefined : params.user.name;
  const { html, subject, text } = await renderEmail(
    <DeletionCompleteEmail name={params.user.name} />,
    { subject: () => m['email.deletionComplete.subject']() },
  );

  await sendEmail({
    html,
    subject: subject ?? m['email.deletionComplete.subject'](),
    text,
    to: [{ email: params.user.email, name: recipientName }],
  });
}
