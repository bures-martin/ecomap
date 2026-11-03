import { computed, type ComputedRef } from 'vue';
import { useTheme } from 'vuetify';

/** Light / dark / follow-the-system, remembered in localStorage. */

export const COLOR_SCHEMES = ['light', 'dark', 'system'] as const;
export type ColorScheme = (typeof COLOR_SCHEMES)[number];

const STORAGE_KEY = 'ecomap.colorScheme';

function isColorScheme(value: unknown): value is ColorScheme {
  return COLOR_SCHEMES.some((scheme) => scheme === value);
}

export function readStoredColorScheme(): ColorScheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isColorScheme(stored) ? stored : 'system';
  } catch {
    /* Storage can be blocked (private mode, strict settings); follow the system. */
    return 'system';
  }
}

export function useColorScheme(): {
  mode: ComputedRef<ColorScheme>;
  setMode: (mode: ColorScheme) => void;
} {
  const theme = useTheme();

  const mode = computed<ColorScheme>(() =>
    theme.isSystem.value ? 'system' : theme.name.value === 'dark' ? 'dark' : 'light',
  );

  const setMode = (next: ColorScheme): void => {
    void theme.change(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Not remembered across visits, but it still applies now. */
    }
  };

  return { mode, setMode };
}
