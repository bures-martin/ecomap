/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
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
        /*
         * Only the two heavyweights get their own chunk. React itself stays with
         * the app entry: pulling it out as well made the chunks import each other
         * in a cycle, which Rollup warns about and which buys nothing.
         */
        manualChunks: {
          mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          leaflet: ['leaflet'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: false,
  },
});
