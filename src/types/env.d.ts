/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REVIEW_PAGES?: string;
}

/** Set from package.json at build time (vite.config.ts). */
declare const __APP_VERSION__: string;
