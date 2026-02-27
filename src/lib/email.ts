import { BrevoClient } from '@getbrevo/brevo';

import { env } from '@/configs/env';

type EmailRecipient = {
  email: string;
  name?: string;
};

type SendEmailOptions = {
  html: string;
  replyTo?: EmailRecipient;
  subject: string;
  text?: string;
  to: EmailRecipient[];
};

const brevo = new BrevoClient({ apiKey: env.BREVO_API_KEY });

const defaultSender = {
  email: env.EMAIL_FROM,
  name: env.EMAIL_FROM_NAME,
};

const defaultReplyTo = env.EMAIL_REPLY_TO
  ? { email: env.EMAIL_REPLY_TO }
  : undefined;

export async function sendEmail(options: SendEmailOptions) {
  const { html, replyTo, subject, text, to } = options;

  await brevo.transactionalEmails.sendTransacEmail(
    {
      htmlContent: html,
      replyTo: replyTo ?? defaultReplyTo,
      sender: defaultSender,
      subject,
      textContent: text,
      to,
    },
    env.EMAIL_SANDBOX ? { headers: { 'X-Sib-Sandbox': 'drop' } } : undefined,
  );
}
