import { createTheme, type Theme } from '@mui/material/styles';

/**
 * The community's own colours drive the whole palette, which is what makes the
 * "adjust the colours" setting more than skin deep: buttons, focus rings, links
 * and chips all follow from the two values an admin picks.
 *
 * `contrastThreshold: 4.5` asks MUI to pick black or white text by the WCAG AA
 * ratio, so a community that chooses a pale green still gets readable buttons.
 */
export function createEcoMapTheme(primaryColor: string, accentColor: string): Theme {
  return createTheme({
    cssVariables: { colorSchemeSelector: 'data-mui-color-scheme' },
    colorSchemes: {
      light: {
        palette: {
          primary: { main: primaryColor },
          secondary: { main: accentColor },
          background: { default: '#f7f8f6', paper: '#ffffff' },
          contrastThreshold: 4.5,
        },
      },
      dark: {
        palette: {
          primary: { main: primaryColor },
          secondary: { main: accentColor },
          background: { default: '#14171a', paper: '#1c2023' },
          contrastThreshold: 4.5,
        },
      },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily:
        '"Inter", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
      h1: { fontSize: '2rem', fontWeight: 700 },
      h2: { fontSize: '1.5rem', fontWeight: 700 },
      h3: { fontSize: '1.25rem', fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      /*
       * A visible focus ring on every interactive element. MUI only shows one
       * for keyboard focus by default, which is the behaviour we want, but the
       * default outline is easy to lose against a coloured surface.
       */
      MuiButtonBase: {
        styleOverrides: {
          root: {
            '&.Mui-focusVisible': {
              outline: '3px solid currentColor',
              outlineOffset: 2,
            },
          },
        },
      },
      MuiLink: {
        defaultProps: { underline: 'always' },
      },
      MuiTextField: {
        defaultProps: { size: 'small', fullWidth: true },
      },
    },
  });
}
