import { render } from '@react-email/render';

import { sendEmail } from '@/lib/email';

import { ResetPasswordEmail } from './emails/reset-password-email';
import { VerificationEmail } from './emails/verification-email';

type EmailPerson = {
  email: string;
  name?: string | null;
};

export async function sendVerificationEmail(params: {
  user: EmailPerson;
  url: string;
}) {
  const html = await render(
    <VerificationEmail name={params.user.name} url={params.url} />,
  );
  const text = await render(
    <VerificationEmail name={params.user.name} url={params.url} />,
    {
      plainText: true,
    },
  );

  await sendEmail({
    to: [{ email: params.user.email, name: params.user.name ?? undefined }],
    subject: 'Verify your email',
    html,
    text,
  });
}

export async function sendResetPasswordEmail(params: {
  user: EmailPerson;
  url: string;
}) {
  const html = await render(
    <ResetPasswordEmail name={params.user.name} url={params.url} />,
  );
  const text = await render(
    <ResetPasswordEmail name={params.user.name} url={params.url} />,
    {
      plainText: true,
    },
  );

  await sendEmail({
    to: [{ email: params.user.email, name: params.user.name ?? undefined }],
    subject: 'Reset your password',
    html,
    text,
  });
}
