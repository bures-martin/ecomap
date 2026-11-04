import type { Locale } from '@ecomap/shared';
import type { MailMessage } from './mailer.js';

/**
 * The e-mails people get, in the community's language. Plain text: it reads
 * well everywhere, from phones to screen readers, and never looks like a
 * phishing mail full of buttons.
 */

interface LinkMail {
  to: string;
  communityName: string;
  link: string;
  locale: Locale;
}

export function verifyEmailMail({ to, communityName, link, locale }: LinkMail): MailMessage {
  if (locale === 'da') {
    return {
      to,
      subject: `Bekræft din e-mail - ${communityName}`,
      text: `Hej,

Tak, fordi du vil være med på ${communityName}. Klik på linket for at bekræfte din e-mail og logge ind:

${link}

Linket virker i 48 timer. Har du ikke oprettet en konto, kan du bare slette denne e-mail.
`,
    };
  }
  return {
    to,
    subject: `Confirm your e-mail - ${communityName}`,
    text: `Hello,

Thank you for joining ${communityName}. Click the link to confirm your e-mail and sign in:

${link}

The link works for 48 hours. If you did not create an account, just delete this e-mail.
`,
  };
}

export function resetPasswordMail({ to, communityName, link, locale }: LinkMail): MailMessage {
  if (locale === 'da') {
    return {
      to,
      subject: `Ny adgangskode - ${communityName}`,
      text: `Hej,

Nogen (forhåbentlig dig) har bedt om en ny adgangskode til din konto på ${communityName}. Klik på linket for at vælge en ny:

${link}

Linket virker i 1 time og kun én gang. Har du ikke bedt om det, kan du bare slette denne e-mail - din adgangskode er ikke ændret.
`,
    };
  }
  return {
    to,
    subject: `New password - ${communityName}`,
    text: `Hello,

Someone (hopefully you) asked for a new password for your account on ${communityName}. Click the link to choose a new one:

${link}

The link works for 1 hour and only once. If you did not ask for this, just delete this e-mail - your password has not changed.
`,
  };
}
