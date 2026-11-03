import { linkify, safeHref } from './linkify.js';

/**
 * A deliberately small Markdown subset for admin-written pages such as About:
 * headings (`#`, `##`, `###`), bullet lists (`-` or `*`), paragraphs, bold
 * (`**text**`) and links - `[text](https://…)` or a bare address.
 *
 * It produces plain data that a template renders as elements, never HTML, so
 * nothing typed into the settings can inject markup. Anything else stays text.
 */
export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'link'; text: string; href: string };

export type Block =
  | { kind: 'heading'; level: 2 | 3; content: Inline[] }
  | { kind: 'paragraph'; content: Inline[] }
  | { kind: 'list'; items: Inline[][] };

const LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/gu;
const STRONG = /\*\*([^*\n]+)\*\*/gu;

/** Bare addresses and bold inside a piece of text with no Markdown links. */
function plainInline(text: string): Inline[] {
  const parts: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(STRONG)) {
    if (match.index > last) parts.push(...linkify(text.slice(last, match.index)));
    parts.push({ kind: 'strong', text: match[1] ?? '' });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(...linkify(text.slice(last)));
  return parts;
}

export function parseInline(text: string): Inline[] {
  const parts: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    const href = safeHref(match[2] ?? '');
    if (!href) continue;
    if (match.index > last) parts.push(...plainInline(text.slice(last, match.index)));
    parts.push({ kind: 'link', text: match[1] ?? '', href });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(...plainInline(text.slice(last)));
  return parts;
}

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flush = (): void => {
    if (paragraph.length > 0) {
      /* As in Markdown, the lines of one paragraph run together. */
      blocks.push({ kind: 'paragraph', content: parseInline(paragraph.join(' ')) });
      paragraph = [];
    }
    if (list.length > 0) {
      blocks.push({ kind: 'list', items: list.map(parseInline) });
      list = [];
    }
  };

  for (const rawLine of source.replace(/\r\n?/gu, '\n').split('\n')) {
    const line = rawLine.trim();
    const heading = /^(#{1,3})\s+(.+)$/u.exec(line);
    const item = /^[-*]\s+(.+)$/u.exec(line);

    if (line === '') {
      flush();
    } else if (heading) {
      flush();
      const level = (heading[1]?.length ?? 2) >= 3 ? 3 : 2;
      blocks.push({ kind: 'heading', level, content: parseInline(heading[2] ?? '') });
    } else if (item) {
      if (paragraph.length > 0) flush();
      list.push(item[1] ?? '');
    } else {
      if (list.length > 0) flush();
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}
