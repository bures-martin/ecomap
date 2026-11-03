import { DEFAULT_COMMUNITY_SETTINGS } from '@ecomap/shared';
import { createVuetify, type ThemeInstance } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import 'vuetify/styles';
import { readStoredColorScheme } from '../composables/useColorScheme.js';

/**
 * The community's own colours drive the whole palette, which is what makes the
 * "adjust the colours" setting more than skin deep: buttons, focus rings, links
 * and chips all follow from the two values an admin picks. Vuetify derives the
 * readable `on-*` text colour for each of them itself.
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
            primary: primaryColor,
            secondary: accentColor,
            background: '#f7f8f6',
            surface: '#ffffff',
          },
        },
        dark: {
          dark: true,
          colors: {
            primary: primaryColor,
            secondary: accentColor,
            background: '#14171a',
            surface: '#1c2023',
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

/** Points both colour schemes at the community's colours. */
export function applyCommunityColors(
  themes: ThemeInstance['themes']['value'],
  primaryColor: string,
  accentColor: string,
): void {
  for (const name of ['light', 'dark']) {
    const theme = themes[name];
    if (!theme) continue;
    theme.colors.primary = primaryColor;
    theme.colors.secondary = accentColor;
  }
}
