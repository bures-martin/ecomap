import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { translateServerMessage } from './serverMessages.js';

/** The repository root: the nearest folder up from here that holds packages/shared. */
function findRepo(): string {
  let dir = process.cwd();
  while (!existsSync(join(dir, 'packages', 'shared'))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error('Repository root not found');
    dir = parent;
  }
  return dir;
}
const repo = findRepo();

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'test' ? [] : sourceFiles(path);
    /* Start-up configuration errors go to the operator's log, never to a visitor. */
    if (name === 'env.ts') return [];
    return name.endsWith('.ts') && !name.endsWith('.test.ts') ? [path] : [];
  });
}

/*
 * Every fixed English sentence the server or the shared rules can send: error
 * helpers (`ApiError.forbidden('...')`), default messages, Zod messages
 * (`.min(2, '...')`, `message: '...'`) and message constants. Messages built
 * with ${...} are covered by the patterns in serverMessages.ts.
 */
function englishMessages(): string[] {
  const found = new Set<string>();
  const patterns = [
    /ApiError\.\w+\(\s*'([^']+)'/g,
    /new ApiError\(\s*'\w+',\s*'([^']+)'/g,
    /\(message = '([^']+)'\)/g,
    /message: '([^']+)'/g,
    /\.(?:min|max|refine|regex|length)\([^'\n]*'([A-Z][^']+)'\)/g,
    /_MESSAGE =\s*'([^']+)'/g,
  ];
  for (const dir of ['apps/api/src', 'packages/shared/src']) {
    for (const file of sourceFiles(join(repo, dir))) {
      const text = readFileSync(file, 'utf8');
      for (const pattern of patterns) {
        for (const match of text.matchAll(pattern)) {
          const message = match[1];
          /* Object names passed to notFound(), e.g. "That layer" - not sentences. */
          if (message && !/^That \w+$/.test(message)) found.add(message);
        }
      }
    }
  }
  return [...found];
}

describe('server messages in Danish', () => {
  it('finds the messages to check', () => {
    expect(englishMessages().length).toBeGreaterThan(30);
  });

  it('has a Danish text for every message the server can send', () => {
    const missing = englishMessages().filter((message) => translateServerMessage(message) === null);
    expect(missing).toEqual([]);
  });

  it('fills in names and numbers', () => {
    expect(translateServerMessage('Use at least 12 characters')).toBe('Brug mindst 12 tegn.');
    expect(translateServerMessage('Opening hours is required')).toBe(
      'Opening hours skal udfyldes.',
    );
    expect(translateServerMessage('Too small: expected string to have >=2 characters')).toBe(
      'Skal være mindst 2 tegn.',
    );
  });

  it('returns nothing for a message it does not know', () => {
    expect(translateServerMessage('Something entirely new')).toBeNull();
  });
});
