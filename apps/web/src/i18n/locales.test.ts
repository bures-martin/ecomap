import { describe, expect, it } from 'vitest';
import da from './locales/da.json';
import en from './locales/en.json';

/** Every key in a translation file, as dotted paths. */
function keys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('translations', () => {
  /*
   * A missing Danish text falls back to English, which a screen reader set to
   * Danish then reads out with Danish pronunciation - and it looks unfinished.
   */
  it('has a Danish text for every English one', () => {
    const danish = new Set(keys(da));
    expect(keys(en).filter((key) => !danish.has(key))).toEqual([]);
  });

  it('has an English text for every Danish one', () => {
    const english = new Set(keys(en));
    expect(keys(da).filter((key) => !english.has(key))).toEqual([]);
  });
});
