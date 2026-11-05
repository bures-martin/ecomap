/// <reference types="vite/client" />

/**
 * Declaring the variables we actually read turns them into real properties, so
 * `strict` TypeScript does not force bracket access through Vite's catch-all
 * index signature - and a typo in the name becomes a compile error.
 */
interface ImportMetaEnv {
  /** Absolute API origin. Empty in development, where Vite proxies `/api`. */
  readonly VITE_API_URL?: string;
  /** "true" offers the Danish/English switch; off while the map is Danish only. */
  readonly VITE_LANGUAGE_SWITCH?: string;
  /** "true" builds the read-only demo: data from JSON files, no server (see src/demo). */
  readonly VITE_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
