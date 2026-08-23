/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
