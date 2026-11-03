import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown } from './markdown.js';

describe('parseMarkdown', () => {
  it('reads headings, paragraphs and lists', () => {
    const blocks = parseMarkdown(
      '## Hvorfor\nSmå valg.\nGør en forskel.\n\n- Køb lokalt\n- Reparér',
    );
    expect(blocks.map((block) => block.kind)).toEqual(['heading', 'paragraph', 'list']);
    expect(blocks[1]).toEqual({
      kind: 'paragraph',
      content: [{ kind: 'text', text: 'Små valg. Gør en forskel.' }],
    });
    expect(blocks[2]).toMatchObject({
      kind: 'list',
      items: [[{ text: 'Køb lokalt' }], [{ text: 'Reparér' }]],
    });
  });

  it('keeps plain text plain', () => {
    expect(parseMarkdown('Just text')).toEqual([
      { kind: 'paragraph', content: [{ kind: 'text', text: 'Just text' }] },
    ]);
  });
});

describe('parseInline', () => {
  it('turns [text](url) and bare addresses into links, and **bold** into strong', () => {
    expect(parseInline('Se [BOFA](https://bofa.dk) og **sorter** på https://dn.dk')).toEqual([
      { kind: 'text', text: 'Se ' },
      { kind: 'link', text: 'BOFA', href: 'https://bofa.dk/' },
      { kind: 'text', text: ' og ' },
      { kind: 'strong', text: 'sorter' },
      { kind: 'text', text: ' på ' },
      { kind: 'link', text: 'https://dn.dk', href: 'https://dn.dk/' },
    ]);
  });

  it('never links a javascript: address, and never reads HTML', () => {
    expect(parseInline('[klik](javascript:alert(1)) <b>x</b>')).toEqual([
      { kind: 'text', text: '[klik](javascript:alert(1)) <b>x</b>' },
    ]);
  });
});
