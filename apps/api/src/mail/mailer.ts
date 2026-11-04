import nodemailer, { type Transporter } from 'nodemailer';
import { env, isTest } from '../env.js';
import { logger } from '../logger.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Sends the few e-mails the app needs (sign-up confirmation, password reset)
 * through the SMTP server in the configuration - any provider works.
 *
 * - Tests: kept in `sentMails`, so a test can follow the link in it.
 * - No SMTP_HOST (a laptop): written to the log instead of sent.
 */
export const sentMails: MailMessage[] = [];

let transporter: Transporter | null = null;

function smtp(): Transporter | null {
  if (!env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD ?? '' } } : {}),
  });
  return transporter;
}

export async function sendMail(message: MailMessage): Promise<void> {
  if (isTest) {
    sentMails.push(message);
    return;
  }

  const transport = smtp();
  if (!transport) {
    logger.warn(
      { to: message.to, subject: message.subject, text: message.text },
      'E-mail not sent: no SMTP_HOST configured - here it is instead',
    );
    return;
  }

  await transport.sendMail({ from: env.MAIL_FROM, ...message });
  logger.info({ subject: message.subject }, 'E-mail sent');
}
