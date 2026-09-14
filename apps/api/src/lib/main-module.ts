import { pathToFileURL } from 'node:url';

/**
 * True when `moduleUrl` is the file Node was started with.
 *
 * The naive `import.meta.url === \`file://${process.argv[1]}\`` comparison breaks
 * on Windows, where argv holds `C:\path\to\file.ts` and `import.meta.url` holds
 * `file:///C:/path/to/file.ts`.
 */
export function isMainModule(moduleUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return pathToFileURL(entry).href === moduleUrl;
}
