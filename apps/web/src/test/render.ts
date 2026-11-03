import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { render, type RenderResult } from '@testing-library/vue';
import I18NextVue from 'i18next-vue';
import type { Component } from 'vue';
import { createAuth } from '../auth/auth.js';
import { createToaster } from '../composables/useToast.js';
import { i18next, resources } from '../i18n/index.js';
import { createEcoMapVuetify } from '../plugins/vuetify.js';
import { createEcoMapRouter } from '../router.js';

/**
 * Renders a component with the plugins it would have in the real application,
 * so tests exercise the same code path as production rather than a stub.
 */

await i18next.init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  showSupportNotice: false,
});

export async function renderWithProviders(
  component: Component,
  options: { props?: Record<string, unknown>; route?: string } = {},
): Promise<RenderResult> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createEcoMapRouter({ memory: true });
  await router.push(options.route ?? '/about');
  await router.isReady();

  return render(component, {
    ...(options.props ? { props: options.props } : {}),
    global: {
      plugins: [
        [VueQueryPlugin, { queryClient }],
        [I18NextVue, { i18next }],
        createEcoMapVuetify(),
        router,
        createToaster(),
        /* No session to restore: the tests run signed out unless they sign in. */
        createAuth(queryClient, { restoreSession: false }),
      ],
    },
  });
}
