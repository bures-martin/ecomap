import { DEFAULT_COMMUNITY_SETTINGS } from '@ecomap/shared';
import { createVuetify, type ThemeInstance } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import 'vuetify/styles';
import { readStoredColorScheme } from '../composables/useColorScheme.js';
import { readableOn, withContrast } from './contrast.js';

/** The surface each scheme's text and coloured buttons sit on. */
const SURFACE = { light: '#ffffff', dark: '#1c2023' } as const;
type Scheme = keyof typeof SURFACE;

/*
 * Vuetify's own status colours are too light for white text (its green is
 * 2.8:1); these start darker and still go through `accessible` below.
 */
const STATUS_COLORS = {
  success: '#2e7d32',
  info: '#1565c0',
  warning: '#b45309',
  error: '#c62828',
} as const;

/**
 * Every colour used for text or behind text, made readable for one scheme:
 * each one reaches 4.5:1 against the surface (so it works as link text, and as
 * a button behind white or black text), and gets an explicit `on-` colour,
 * black or white, whichever reads better on it.
 */
function accessible(scheme: Scheme, colors: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, color] of Object.entries(colors)) {
    const readable = withContrast(color, SURFACE[scheme]);
    result[name] = readable;
    result[`on-${name}`] = readableOn(readable);
  }
  return result;
}

function brandColors(
  scheme: Scheme,
  primaryColor: string,
  accentColor: string,
): Record<string, string> {
  return accessible(scheme, { primary: primaryColor, secondary: accentColor });
}

/**
 * The community's own colours drive the whole palette, which is what makes the
 * "adjust the colours" setting more than skin deep: buttons, focus rings, links
 * and chips all follow from the two values an admin picks - shaded where
 * needed so that no choice of colour can make text hard to read.
 *
 * The values here are only the first paint; `applyCommunityColors` swaps in the
 * real ones once the settings arrive.
 */
export function createEcoMapVuetify(): ReturnType<typeof createVuetify> {
  const { primaryColor, accentColor } = DEFAULT_COMMUNITY_SETTINGS;

  return createVuetify({
    icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
    theme: {
      defaultTheme: readStoredColorScheme(),
      themes: {
        light: {
          dark: false,
          colors: {
            ...brandColors('light', primaryColor, accentColor),
            ...accessible('light', STATUS_COLORS),
            background: '#f7f8f6',
            surface: SURFACE.light,
            /* The header: off-white with a hint of green. */
            header: '#f3f6f2',
            /* Softer than pure black: a deep green-grey for the title and links. */
            'on-header': '#1e2b23',
          },
          /* Vuetify's 0.6 leaves field labels and hints at 4.3:1 on white. */
          variables: { 'medium-emphasis-opacity': 0.7 },
        },
        dark: {
          dark: true,
          colors: {
            ...brandColors('dark', primaryColor, accentColor),
            ...accessible('dark', STATUS_COLORS),
            background: '#14171a',
            surface: SURFACE.dark,
            /* The header: a soft charcoal, a step lighter than the page. */
            header: '#20262a',
            'on-header': '#e6ebe7',
          },
        },
      },
    },
    defaults: {
      VTextField: { variant: 'outlined', density: 'comfortable' },
      VTextarea: { variant: 'outlined', density: 'comfortable' },
      VSelect: { variant: 'outlined', density: 'comfortable' },
    },
  });
}

/** Points both colour schemes at the community's colours, readable in each. */
export function applyCommunityColors(
  themes: ThemeInstance['themes']['value'],
  primaryColor: string,
  accentColor: string,
): void {
  for (const scheme of ['light', 'dark'] as const) {
    const theme = themes[scheme];
    if (!theme) continue;
    Object.assign(theme.colors, brandColors(scheme, primaryColor, accentColor));
  }
}
