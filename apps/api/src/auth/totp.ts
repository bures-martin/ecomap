import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * TOTP (RFC 6238) over HMAC-SHA1 with 6 digits and a 30-second step - the
 * settings every authenticator app defaults to.
 *
 * Implemented directly on `node:crypto` rather than pulled in as a dependency:
 * it is ~60 lines of well-specified arithmetic, and `totp.test.ts` checks it
 * against the reference vectors published in the RFC.
 */

export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SECONDS = 30;

/**
 * How many steps either side of "now" we accept, to tolerate clock drift between
 * the server and the user's phone. One step means a code stays valid for roughly
 * 30-90 seconds.
 */
export const TOTP_WINDOW = 1;

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** A fresh base32 secret; 20 bytes is the RFC 4226 recommended length. */
export function generateTotpSecret(byteLength = 20): string {
  return base32Encode(randomBytes(byteLength));
}

export function generateTotpCode(secret: string, atMs: number = Date.now()): string {
  return codeForCounter(base32Decode(secret), Math.floor(atMs / 1000 / TOTP_PERIOD_SECONDS));
}

/**
 * Constant-time-ish verification across the accepted window.
 *
 * We compare every candidate rather than returning on the first match so the
 * work done does not depend on which step matched.
 */
export function verifyTotpCode(secret: string, code: string, atMs: number = Date.now()): boolean {
  const normalised = code.replace(/\s+/g, '');
  if (!new RegExp(`^\\d{${TOTP_DIGITS}}$`).test(normalised)) return false;

  let key: Buffer;
  try {
    key = base32Decode(secret);
  } catch {
    return false;
  }

  const counter = Math.floor(atMs / 1000 / TOTP_PERIOD_SECONDS);
  let matched = false;
  for (let offset = -TOTP_WINDOW; offset <= TOTP_WINDOW; offset += 1) {
    const candidate = codeForCounter(key, counter + offset);
    if (equalsConstantTime(candidate, normalised)) matched = true;
  }
  return matched;
}

/** The `otpauth://` URI an authenticator app reads from a QR code. */
export function totpUri(options: { secret: string; account: string; issuer: string }): string {
  const label = `${options.issuer}:${options.account}`;
  const params = new URLSearchParams({
    secret: options.secret,
    issuer: options.issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

function codeForCounter(key: Buffer, counter: number): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', key).update(message).digest();

  /* Dynamic truncation, RFC 4226 section 5.3. */
  const offset = (digest[digest.length - 1] ?? 0) & 0x0f;
  const binary =
    (((digest[offset] ?? 0) & 0x7f) << 24) |
    (((digest[offset + 1] ?? 0) & 0xff) << 16) |
    (((digest[offset + 2] ?? 0) & 0xff) << 8) |
    ((digest[offset + 3] ?? 0) & 0xff);

  return (binary % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, '0');
}

function equalsConstantTime(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += symbolAt((value >>> (bits - 5)) & 31);
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += symbolAt((value << (5 - bits)) & 31);
  }
  return output;
}

/** The alphabet is 32 characters and the index is masked to 5 bits, so this is total. */
function symbolAt(index: number): string {
  return BASE32_ALPHABET[index] ?? '';
}

export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error(`Invalid base32 character: ${char}`);
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}
