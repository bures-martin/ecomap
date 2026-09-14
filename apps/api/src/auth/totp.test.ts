import { describe, expect, it } from 'vitest';
import {
  TOTP_PERIOD_SECONDS,
  base32Decode,
  base32Encode,
  generateTotpCode,
  generateTotpSecret,
  totpUri,
  verifyTotpCode,
} from './totp.js';

/** The shared secret used by every RFC 6238 test vector: ASCII "12345678901234567890". */
const RFC_SECRET_BYTES = Buffer.from('12345678901234567890', 'ascii');
const RFC_SECRET_BASE32 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('base32', () => {
  it('encodes the RFC secret the way RFC 4648 does', () => {
    expect(base32Encode(RFC_SECRET_BYTES)).toBe(RFC_SECRET_BASE32);
  });

  it('round-trips arbitrary bytes', () => {
    const bytes = Buffer.from([0x00, 0xff, 0x10, 0x7a, 0x3c, 0x9e, 0x01]);
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
  });

  it('ignores padding, spaces and case', () => {
    expect(base32Decode('gezd gnbv gy3t qojq')).toEqual(Buffer.from('1234567890', 'ascii'));
  });

  it('rejects characters outside the alphabet', () => {
    expect(() => base32Decode('GEZD1')).toThrow();
  });
});

describe('generateTotpCode - RFC 6238 test vectors (SHA-1)', () => {
  /* The RFC publishes 8-digit codes; we generate 6, which is the last 6 digits. */
  const vectors: [unixSeconds: number, expected: string][] = [
    [59, '287082'],
    [1_111_111_109, '081804'],
    [1_111_111_111, '050471'],
    [1_234_567_890, '005924'],
    [2_000_000_000, '279037'],
    [20_000_000_000, '353130'],
  ];

  it.each(vectors)('matches the published code at T=%i', (unixSeconds, expected) => {
    expect(generateTotpCode(RFC_SECRET_BASE32, unixSeconds * 1000)).toBe(expected);
  });
});

describe('verifyTotpCode', () => {
  const secret = generateTotpSecret();
  const now = 1_700_000_000_000;

  it('accepts the current code', () => {
    expect(verifyTotpCode(secret, generateTotpCode(secret, now), now)).toBe(true);
  });

  it('accepts a code from the previous step, for a slow phone', () => {
    const previous = generateTotpCode(secret, now - TOTP_PERIOD_SECONDS * 1000);
    expect(verifyTotpCode(secret, previous, now)).toBe(true);
  });

  it('rejects a code that is well outside the window', () => {
    const stale = generateTotpCode(secret, now - 10 * TOTP_PERIOD_SECONDS * 1000);
    expect(verifyTotpCode(secret, stale, now)).toBe(false);
  });

  it('tolerates the spaces authenticator apps display', () => {
    const code = generateTotpCode(secret, now);
    expect(verifyTotpCode(secret, `${code.slice(0, 3)} ${code.slice(3)}`, now)).toBe(true);
  });

  it.each(['', '12345', '1234567', 'abcdef'])('rejects malformed code %j', (code) => {
    expect(verifyTotpCode(secret, code, now)).toBe(false);
  });

  it('rejects rather than throws on a malformed secret', () => {
    expect(verifyTotpCode('not base32!!', '123456', now)).toBe(false);
  });

  it('rejects a valid-looking code from a different secret', () => {
    const other = generateTotpSecret();
    expect(verifyTotpCode(secret, generateTotpCode(other, now), now)).toBe(false);
  });
});

describe('totpUri', () => {
  it('builds an otpauth URI an authenticator app can scan', () => {
    const uri = totpUri({
      secret: RFC_SECRET_BASE32,
      account: 'bo@example.org',
      issuer: 'EcoMap Community',
    });
    const parsed = new URL(uri);

    expect(parsed.protocol).toBe('otpauth:');
    expect(decodeURIComponent(parsed.pathname)).toContain('EcoMap Community:bo@example.org');
    expect(parsed.searchParams.get('secret')).toBe(RFC_SECRET_BASE32);
    expect(parsed.searchParams.get('digits')).toBe('6');
    expect(parsed.searchParams.get('period')).toBe('30');
  });
});
