import { describe, expect, it } from 'vitest';
import { TEXT_CONTRAST, contrastRatio, readableOn, withContrast } from './contrast.js';

describe('contrastRatio', () => {
  it('matches the WCAG extremes', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('reads three-digit colours', () => {
    expect(contrastRatio('#fff', '#ffffff')).toBeCloseTo(1, 5);
  });
});

describe('withContrast', () => {
  it('keeps a colour that already reads well', () => {
    expect(withContrast('#1c4532', '#ffffff')).toBe('#1c4532');
  });

  it('darkens a colour that is too light on white', () => {
    const shaded = withContrast('#b7791f', '#ffffff');
    expect(shaded).not.toBe('#b7791f');
    expect(contrastRatio(shaded, '#ffffff')).toBeGreaterThanOrEqual(TEXT_CONTRAST);
  });

  it('lightens a colour that is too dark on a dark surface', () => {
    const shaded = withContrast('#2f855a', '#1c2023');
    expect(contrastRatio(shaded, '#1c2023')).toBeGreaterThanOrEqual(TEXT_CONTRAST);
    expect(contrastRatio(shaded, '#ffffff')).toBeLessThan(contrastRatio('#2f855a', '#ffffff'));
  });
});

describe('readableOn', () => {
  it('picks white on dark colours and black on light ones', () => {
    expect(readableOn('#1c4532')).toBe('#ffffff');
    expect(readableOn('#f6e05e')).toBe('#000000');
  });
});
