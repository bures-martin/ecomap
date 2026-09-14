import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router';
import type { ReactElement, ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { i18next, resources } from '../i18n/index.js';
import { ToastProvider } from '../components/ToastProvider.js';
import { createEcoMapTheme } from '../theme.js';

/**
 * Renders a component with the providers it would have in the real application,
 * so tests exercise the same code path as production rather than a stub.
 */

void i18next.init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function renderWithProviders(
  ui: ReactElement,
  options: RenderOptions & { route?: string } = {},
): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const { route = '/', ...renderOptions } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18next}>
            <ThemeProvider theme={createEcoMapTheme('#2f855a', '#b7791f')}>
              <ToastProvider>{children}</ToastProvider>
            </ThemeProvider>
          </I18nextProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
