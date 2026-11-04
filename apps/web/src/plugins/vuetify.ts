import { DEFAULT_COMMUNITY_SETTINGS } from '@ecomap/shared';
import { createVuetify, type ThemeInstance } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import 'vuetify/styles';
import { readStoredColorScheme } from '../composables/useColorScheme.js';
import { readableOn, withContrast } from './contrast.js';

/**
 * A deep forest green: the header's text and logo, and the map's main action
 * ("Tilføj til kortet"). On the map it is dark enough to stand out, where the
 * brand green melts into green land and looks like the cluster circles, and no
 * layer uses a green this dark, so the button is not read as a pin.
 *
 * The button sits on the map, which stays light, so it is the same in both
 * schemes. On the dark header the text stays near-white and only the logo is
 * green - a light one, since forest green would not read on charcoal.
 */
const FOREST_GREEN = '#1e4d2b';
const GREEN_ON_DARK = '#8fd1a3';
const CALL_TO_ACTION = { cta: FOREST_GREEN, 'on-cta': '#ffffff' } as const;

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

/**
 * The community colours in two roles. As a fill (buttons, avatars) they are
 * shaded until white text reads on them, in both schemes - a green button with
 * white text. As text on the page (links, text and outlined buttons) they use
 * `link`: on the dark scheme that is a lighter shade, because no single green
 * can carry white text and also stand out on a near-black page.
 */
function brandColors(
  scheme: Scheme,
  primaryColor: string,
  accentColor: string,
): Record<string, string> {
  return {
    ...accessible('light', { primary: primaryColor, secondary: accentColor }),
    link: withContrast(primaryColor, SURFACE[scheme]),
  };
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
            'on-header': FOREST_GREEN,
            logo: FOREST_GREEN,
            ...CALL_TO_ACTION,
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
            logo: GREEN_ON_DARK,
            ...CALL_TO_ACTION,
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
