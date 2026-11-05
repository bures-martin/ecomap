import { VueQueryPlugin } from '@tanstack/vue-query';
import I18NextVue from 'i18next-vue';
import 'leaflet/dist/leaflet.css';
import { createApp } from 'vue';
import App from './App.vue';
import { createQueryClient } from './api/queryClient.js';
import { createAuth } from './auth/auth.js';
import { createToaster } from './composables/useToast.js';
import { IS_DEMO } from './demo/demo.js';
import { i18next, initI18n } from './i18n/index.js';
import './index.css';
import { createEcoMapVuetify } from './plugins/vuetify.js';
import { createEcoMapRouter } from './router.js';

/* Translations load before the first paint, so nothing flashes in the wrong language. */
await initI18n();

const queryClient = createQueryClient();

createApp(App)
  .use(VueQueryPlugin, { queryClient })
  .use(I18NextVue, { i18next })
  .use(createEcoMapVuetify())
  .use(createEcoMapRouter())
  .use(createToaster())
  /* The demo has no accounts, so there is no session to restore. */
  .use(createAuth(queryClient, { restoreSession: !IS_DEMO }))
  .mount('#app');

/*
 * Makes the app installable on a phone and able to open offline (see
 * public/sw.js). Not in development: a cached page would hide Vite's updates.
 * Not in the demo either: on a shared host like GitHub Pages a cached shell
 * would only get in the way of the next update.
 */
if (import.meta.env.PROD && !IS_DEMO && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* Without it the app simply works online only. */
    });
  });
}
