import { describe, expect, it } from 'vitest';
import { linkify, safeHref } from './linkify.js';

describe('linkify', () => {
  it('leaves text without addresses alone', () => {
    expect(linkify('Open on Saturdays')).toEqual([{ kind: 'text', text: 'Open on Saturdays' }]);
  });

  it('turns an https address into a link', () => {
    expect(linkify('See https://bornholm.info/en for more')).toEqual([
      { kind: 'text', text: 'See ' },
      { kind: 'link', text: 'https://bornholm.info/en', href: 'https://bornholm.info/en' },
      { kind: 'text', text: ' for more' },
    ]);
  });

  it('adds https to a www address', () => {
    expect(linkify('www.bofa.dk')).toEqual([
      { kind: 'link', text: 'www.bofa.dk', href: 'https://www.bofa.dk/' },
    ]);
  });

  it('leaves sentence punctuation outside the link', () => {
    expect(linkify('Visit https://example.com/shop.')).toEqual([
      { kind: 'text', text: 'Visit ' },
      { kind: 'link', text: 'https://example.com/shop', href: 'https://example.com/shop' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('keeps a closing bracket that belongs to the address', () => {
    const [link] = linkify('https://en.wikipedia.org/wiki/Bornholm_(island)');
    expect(link).toMatchObject({ text: 'https://en.wikipedia.org/wiki/Bornholm_(island)' });
  });

  it('finds several links, across lines', () => {
    const parts = linkify('a https://one.dk\nb https://two.dk');
    expect(parts.filter((part) => part.kind === 'link')).toHaveLength(2);
  });

  it('never links other schemes', () => {
    expect(linkify('javascript:alert(1) data:text/html,x')).toEqual([
      { kind: 'text', text: 'javascript:alert(1) data:text/html,x' },
    ]);
  });
});

describe('safeHref', () => {
  it('accepts http and https only', () => {
    expect(safeHref('http://example.com')).toBe('http://example.com/');
    expect(safeHref('ftp://example.com')).toBeNull();
    expect(safeHref('not a url')).toBeNull();
  });
});
