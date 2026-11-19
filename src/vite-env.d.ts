/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_BFF_PROXY_TARGET?: string
  readonly VITE_PG_CLIENT_KEY?: string
  readonly VITE_SENTRY_DSN?: string
  /** 비우면 vite mode(development·production) */
  readonly VITE_SENTRY_ENVIRONMENT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
