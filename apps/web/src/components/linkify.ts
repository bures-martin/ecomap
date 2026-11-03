/**
 * Splits plain text into text and web links, so a template can render links as
 * real `<a>` elements without ever treating the text as HTML.
 *
 * Only http(s) addresses become links - "https://…", "http://…" or "www.…" -
 * so a `javascript:` or `data:` address in a description stays plain text.
 */
export type TextPart =
  { kind: 'text'; text: string } | { kind: 'link'; text: string; href: string };

const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"']+/giu;

/** Punctuation that usually ends a sentence rather than belongs to the address. */
const TRAILING = /[.,;:!?)\]}'"]+$/u;

export function safeHref(candidate: string): string | null {
  const withScheme = /^www\./iu.test(candidate) ? `https://${candidate}` : candidate;
  try {
    const url = new URL(withScheme);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function linkify(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    let candidate = match[0];
    /* Keep a closing bracket when the address itself opened one, as Wikipedia links do. */
    const trailing = TRAILING.exec(candidate)?.[0] ?? '';
    if (trailing) {
      let keep = 0;
      if (trailing.startsWith(')') && candidate.slice(0, -trailing.length).includes('(')) keep = 1;
      candidate = candidate.slice(0, candidate.length - trailing.length + keep);
    }

    const href = safeHref(candidate);
    if (!href) continue;

    const start = match.index;
    if (start > last) parts.push({ kind: 'text', text: text.slice(last, start) });
    parts.push({ kind: 'link', text: candidate, href });
    last = start + candidate.length;
  }

  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
  return parts;
}
