/**
 * Colour contrast by the WCAG 2 formula, so the palette stays readable whatever
 * colours an admin picks: text needs 4.5:1 against what is behind it.
 */

/** WCAG AA for normal-size text. */
export const TEXT_CONTRAST = 4.5;

const BLACK = '#000000';
const WHITE = '#ffffff';

function channels(hex: string): [number, number, number] {
  let value = hex.replace('#', '');
  /* "#abc" is short for "#aabbcc". */
  if (value.length === 3) value = value.replace(/./g, (digit) => digit + digit);
  const number = Number.parseInt(value.slice(0, 6), 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

function toHex([red, green, blue]: [number, number, number]): string {
  return `#${[red, green, blue]
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')}`;
}

function luminance(hex: string): number {
  const [red, green, blue] = channels(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.039_28 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** From 1 (identical) to 21 (black on white). */
export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a) as [
    number,
    number,
  ];
  return (lighter + 0.05) / (darker + 0.05);
}

function mix(color: string, toward: string, amount: number): string {
  const from = channels(color);
  const to = channels(toward);
  const step = (start: number, end: number): number => start + (end - start) * amount;
  return toHex([step(from[0], to[0]), step(from[1], to[1]), step(from[2], to[2])]);
}

/**
 * The colour itself when it already reads well on `background`, otherwise the
 * nearest shade that does: darker on a light background, lighter on a dark one.
 * The hue stays, so the community's green is still its green.
 */
export function withContrast(color: string, background: string, minimum = TEXT_CONTRAST): string {
  if (contrastRatio(color, background) >= minimum) return color;
  const toward = luminance(background) > 0.18 ? BLACK : WHITE;
  for (let step = 1; step <= 20; step += 1) {
    const candidate = mix(color, toward, step * 0.05);
    if (contrastRatio(candidate, background) >= minimum) return candidate;
  }
  return toward;
}

/**
 * The text colour for `background`: white whenever it is readable - the usual
 * look of a coloured button - and black only on colours too light for white.
 */
export function readableOn(background: string): string {
  if (contrastRatio(WHITE, background) >= TEXT_CONTRAST) return WHITE;
  return contrastRatio(BLACK, background) > contrastRatio(WHITE, background) ? BLACK : WHITE;
}
