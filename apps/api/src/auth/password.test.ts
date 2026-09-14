import { describe, expect, it } from 'vitest';
import { hashPassword, needsRehash, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('verifies a correct password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    await expect(verifyPassword('correct horse battery stapler', hash)).resolves.toBe(false);
  });

  it('salts, so the same password hashes differently every time', async () => {
    const [a, b] = await Promise.all([
      hashPassword('same password'),
      hashPassword('same password'),
    ]);
    expect(a).not.toBe(b);
  });

  it('stores its parameters in the hash string', async () => {
    const hash = await hashPassword('whatever it takes');
    expect(hash.startsWith('scrypt$32768$8$1$')).toBe(true);
    expect(hash.split('$')).toHaveLength(6);
  });

  it('normalises unicode, so an accented password survives a different keyboard', async () => {
    const composed = 'café password!';
    const decomposed = 'café password!';
    const hash = await hashPassword(composed);
    await expect(verifyPassword(decomposed, hash)).resolves.toBe(true);
  });

  it('returns false rather than throwing on a corrupt hash', async () => {
    await expect(verifyPassword('anything', 'not-a-hash')).resolves.toBe(false);
    await expect(verifyPassword('anything', '')).resolves.toBe(false);
  });

  it('does not ask to rehash a freshly created hash', async () => {
    expect(needsRehash(await hashPassword('fresh enough'))).toBe(false);
  });

  it('asks to rehash weaker or unreadable hashes', () => {
    expect(needsRehash('scrypt$1024$8$1$c2FsdA$aGFzaA')).toBe(true);
    expect(needsRehash('bcrypt$whatever')).toBe(true);
  });
});
