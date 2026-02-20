import { BrevoClient } from '@getbrevo/brevo';

import { env } from '@/env';

type EmailRecipient = {
  email: string;
  name?: string;
};

type SendEmailOptions = {
  subject: string;
  html: string;
  text?: string;
  to: EmailRecipient[];
  replyTo?: EmailRecipient;
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
  const { subject, html, text, to, replyTo } = options;

  await brevo.transactionalEmails.sendTransacEmail({
    sender: defaultSender,
    to,
    subject,
    htmlContent: html,
    textContent: text,
    replyTo: replyTo ?? defaultReplyTo,
  });
}
