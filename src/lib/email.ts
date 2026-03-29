import type { BrevoClient } from '@getbrevo/brevo';

import { createTransport } from 'nodemailer';
import { ENV } from 'varlock/env';

type EmailRecipient = { email: string; name?: string | undefined };

type SendEmailOptions = {
  html: string;
  replyTo?: EmailRecipient | undefined;
  subject: string;
  text?: string | undefined;
  to: EmailRecipient[];
};

const defaultSender: EmailRecipient = {
  email: ENV.EMAIL_FROM,
  name: ENV.EMAIL_FROM_NAME,
};

const defaultReplyTo = ENV.EMAIL_REPLY_TO
  ? { email: ENV.EMAIL_REPLY_TO }
  : undefined;

let smtpTransport: ReturnType<typeof createTransport> | undefined;

function getSmtpTransport() {
  smtpTransport ??= createTransport({
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT ?? 1025,
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
    ...(replyTo ? { replyTo: replyTo.email } : {}),
    subject: options.subject,
    ...(options.text !== undefined && { text: options.text }),
    to: options.to.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)),
  });
}

let brevoClient: BrevoClient | undefined;

async function getBrevoClient() {
  if (!brevoClient) {
    if (!ENV.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY is required when SMTP_HOST is not set');
    }
    const { BrevoClient: Client } = await import('@getbrevo/brevo');
    brevoClient = new Client({ apiKey: ENV.BREVO_API_KEY });
  }
  return brevoClient;
}

async function sendViaBrevo(options: SendEmailOptions) {
  const brevo = await getBrevoClient();
  const replyTo = options.replyTo ?? defaultReplyTo;

  await brevo.transactionalEmails.sendTransacEmail({
    htmlContent: options.html,
    ...(replyTo !== undefined && { replyTo }),
    sender: {
      email: defaultSender.email,
      ...(defaultSender.name !== undefined && { name: defaultSender.name }),
    },
    subject: options.subject,
    ...(options.text !== undefined && { textContent: options.text }),
    to: options.to.map((r) => ({
      email: r.email,
      ...(r.name !== undefined && { name: r.name }),
    })),
  });
}

export async function sendEmail(options: SendEmailOptions) {
  await (ENV.SMTP_HOST ? sendViaSmtp(options) : sendViaBrevo(options));
}
