/// <reference types="vitest/config" />
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import vuetify from 'vite-plugin-vuetify';

export default defineConfig({
  /*
   * Where the app is served from: "/" normally; e.g. "/ecomap/" for the read-only
   * demo on GitHub Pages (see .github/workflows/demo.yml).
   */
  base: process.env['VITE_BASE'] ?? '/',
  /* Imports only the Vuetify components a template actually uses. */
  plugins: [vue(), vuetify({ autoImport: true })],
  server: {
    port: 5173,
    /*
     * Proxying `/api` in development means the browser sees one origin, so the
     * refresh cookie is first-party and SameSite=Strict behaves exactly as it
     * will in production behind a single domain.
     */
    proxy: {
      '/api': {
        target: process.env['VITE_API_URL'] ?? 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        /*
         * Keep the big third-party libraries in their own chunks: they change far
         * less often than our code, so a deploy does not invalidate them.
         */
        manualChunks: (id) => {
          if (id.includes('/node_modules/vuetify/')) return 'vuetify';
          if (id.includes('/node_modules/leaflet/')) return 'leaflet';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    /* Vuetify ships CSS imports inside its ESM, which Vitest must transform. */
    server: { deps: { inline: ['vuetify'] } },
  },
});
