import { VueQueryPlugin } from '@tanstack/vue-query';
import I18NextVue from 'i18next-vue';
import 'leaflet/dist/leaflet.css';
import { createApp } from 'vue';
import App from './App.vue';
import { createQueryClient } from './api/queryClient.js';
import { createAuth } from './auth/auth.js';
import { createToaster } from './composables/useToast.js';
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
  .use(createAuth(queryClient))
  .mount('#app');
