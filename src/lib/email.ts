import type { BrevoClient } from '@getbrevo/brevo';

import { createTransport } from 'nodemailer';

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

const defaultSender = {
  email: env.EMAIL_FROM,
  name: env.EMAIL_FROM_NAME,
};

const defaultReplyTo = env.EMAIL_REPLY_TO
  ? { email: env.EMAIL_REPLY_TO }
  : undefined;

let smtpTransport: ReturnType<typeof createTransport> | undefined;

function getSmtpTransport() {
  smtpTransport ??= createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 1025,
  });
  return smtpTransport;
}

async function sendViaSmtp(options: SendEmailOptions) {
  const replyTo = options.replyTo ?? defaultReplyTo;

  await getSmtpTransport().sendMail({
    from: defaultSender.name
      ? `${defaultSender.name} <${defaultSender.email}>`
      : defaultSender.email,
    html: options.html,
    replyTo: replyTo ? replyTo.email : undefined,
    subject: options.subject,
    text: options.text,
    to: options.to.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)),
  });
}

let brevoClient: BrevoClient | undefined;

async function getBrevoClient() {
  if (!brevoClient) {
    if (!env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY is required when SMTP_HOST is not set');
    }
    const { BrevoClient: Client } = await import('@getbrevo/brevo');
    brevoClient = new Client({ apiKey: env.BREVO_API_KEY });
  }
  return brevoClient;
}

async function sendViaBrevo(options: SendEmailOptions) {
  const brevo = await getBrevoClient();
  const replyTo = options.replyTo ?? defaultReplyTo;

  await brevo.transactionalEmails.sendTransacEmail({
    htmlContent: options.html,
    replyTo,
    sender: defaultSender,
    subject: options.subject,
    textContent: options.text,
    to: options.to,
  });
}

export async function sendEmail(options: SendEmailOptions) {
  await (env.SMTP_HOST ? sendViaSmtp(options) : sendViaBrevo(options));
}
