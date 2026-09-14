import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Password hashing with scrypt from Node's standard library.
 *
 * scrypt is memory-hard and built in, so there is no native module to compile on
 * a contributor's machine. Parameters are stored inside the hash string, which
 * means they can be raised later and old hashes still verify (see `needsRehash`).
 */

const CURRENT_PARAMS = { N: 2 ** 15, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** Format: `scrypt$N$r$p$<salt base64url>$<hash base64url>`. */
const HASH_PATTERN = /^scrypt\$(\d+)\$(\d+)\$(\d+)\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await deriveKey(password, salt, CURRENT_PARAMS);
  const { N, r, p } = CURRENT_PARAMS;
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parseHash(stored);
  if (!parsed) return false;

  const derived = await deriveKey(password, parsed.salt, parsed.params);
  if (derived.length !== parsed.hash.length) return false;
  return timingSafeEqual(derived, parsed.hash);
}

/** True when a stored hash used weaker parameters than we now use. */
export function needsRehash(stored: string): boolean {
  const parsed = parseHash(stored);
  if (!parsed) return true;
  return (
    parsed.params.N < CURRENT_PARAMS.N ||
    parsed.params.r < CURRENT_PARAMS.r ||
    parsed.params.p < CURRENT_PARAMS.p
  );
}

interface ScryptParams {
  N: number;
  r: number;
  p: number;
}

function parseHash(stored: string): { params: ScryptParams; salt: Buffer; hash: Buffer } | null {
  const match = HASH_PATTERN.exec(stored);
  if (!match) return null;

  const [, n, r, p, salt, hash] = match;
  if (!n || !r || !p || !salt || !hash) return null;

  return {
    params: { N: Number(n), r: Number(r), p: Number(p) },
    salt: Buffer.from(salt, 'base64url'),
    hash: Buffer.from(hash, 'base64url'),
  };
}

function deriveKey(password: string, salt: Buffer, params: ScryptParams): Promise<Buffer> {
  return scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, {
    ...params,
    /* Node's default maxmem (32 MB) is below what N=2^15, r=8 needs. */
    maxmem: 256 * 1024 * 1024,
  });
}
