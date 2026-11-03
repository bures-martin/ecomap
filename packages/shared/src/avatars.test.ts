import { describe, expect, it } from 'vitest';
import { avatarPath, isAvatarContentType, sniffAvatarContentType } from './avatars.js';

const bytes = (...values: number[]): Uint8Array => Uint8Array.from(values);
/* Test strings are plain ASCII, so one byte per character is exact. */
const ascii = (text: string): number[] =>
  Array.from({ length: text.length }, (_, index) => text.charCodeAt(index));

describe('sniffAvatarContentType', () => {
  it('recognises PNG', () => {
    expect(sniffAvatarContentType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe(
      'image/png',
    );
  });

  it('recognises JPEG', () => {
    expect(sniffAvatarContentType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
  });

  it('recognises WebP by both its RIFF header and WEBP tag', () => {
    expect(sniffAvatarContentType(bytes(...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WEBPVP8 ')))).toBe(
      'image/webp',
    );
  });

  it('refuses a RIFF file that is not WebP, such as WAV audio', () => {
    expect(
      sniffAvatarContentType(bytes(...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WAVE'))),
    ).toBeNull();
  });

  it('refuses markup dressed up as an image', () => {
    expect(sniffAvatarContentType(Uint8Array.from(ascii('<svg onload=alert(1)>')))).toBeNull();
  });

  it('refuses a truncated header instead of reading past the end', () => {
    expect(sniffAvatarContentType(bytes(0x89, 0x50))).toBeNull();
    expect(sniffAvatarContentType(new Uint8Array())).toBeNull();
  });
});

describe('isAvatarContentType', () => {
  it('accepts only the stored formats', () => {
    expect(isAvatarContentType('image/webp')).toBe(true);
    expect(isAvatarContentType('image/svg+xml')).toBe(false);
    expect(isAvatarContentType(undefined)).toBe(false);
  });
});

describe('avatarPath', () => {
  it('changes whenever the picture is replaced', () => {
    const id = '11111111-2222-4333-8444-555555555555';
    const first = avatarPath(id, '2026-01-01T00:00:00.000Z');
    const second = avatarPath(id, '2026-01-01T00:00:01.000Z');
    expect(first).toBe(`/api/users/${id}/avatar?v=1767225600000`);
    expect(second).not.toBe(first);
  });
});
