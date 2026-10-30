import { z } from 'zod'

// 백엔드 모듈(Spring Modulith 패키지) 단위. 서비스로 나뉘면 모듈별 주소 env만 바꾼다 (ADR-0006)
export const upstreamModules = [
  'member',
  'product',
  'order',
  'delivery',
  'wallet',
  'payout',
  'media',
] as const
export type UpstreamModule = (typeof upstreamModules)[number]

const url = z.url().transform((value) => value.replace(/\/+$/, ''))
const commaList = z.string().transform((value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
)

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(8787),
  /** 모듈별 주소를 따로 주지 않으면 모두 여기로 보낸다. 지금은 모놀리스 하나다 */
  BACKEND_URL: url.default('http://localhost:8080'),
  MEMBER_API_URL: url.optional(),
  PRODUCT_API_URL: url.optional(),
  ORDER_API_URL: url.optional(),
  DELIVERY_API_URL: url.optional(),
  WALLET_API_URL: url.optional(),
  PAYOUT_API_URL: url.optional(),
  MEDIA_API_URL: url.optional(),
  /** 상태를 바꾸는 요청을 받아 줄 Origin (CSRF). 개발 환경은 포트와 상관없이 localhost도 받는다 */
  ALLOWED_ORIGINS: commaList.default(['http://localhost:5173']),
  /** 기본은 운영에서만 Secure. 개발 서버(http://localhost)에서 Safari는 Secure 쿠키를 저장하지 않는다 */
  COOKIE_SECURE: z.stringbool().optional(),
  UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  /** multipart 업로드(최대 30MB)는 스트리밍이라 더 기다린다 */
  UPLOAD_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  /** 화면용 집계에서 없어도 되는 부가 정보 호출은 짧게 끊는다 */
  OPTIONAL_TIMEOUT_MS: z.coerce.number().int().positive().default(3_000),
})

export type Config = {
  port: number
  backendUrl: string
  upstreams: Record<UpstreamModule, string>
  allowedOrigins: string[]
  /** vite는 5173이 차 있으면 5174로 뜬다. 그때도 개발이 막히지 않게 한다 */
  allowAnyLocalhostOrigin: boolean
  cookieSecure: boolean
  timeouts: { upstream: number; upload: number; optional: number }
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const parsed = EnvSchema.parse(env)
  const moduleUrl = (value: string | undefined) => value ?? parsed.BACKEND_URL
  return {
    port: parsed.PORT,
    backendUrl: parsed.BACKEND_URL,
    upstreams: {
      member: moduleUrl(parsed.MEMBER_API_URL),
      product: moduleUrl(parsed.PRODUCT_API_URL),
      order: moduleUrl(parsed.ORDER_API_URL),
      delivery: moduleUrl(parsed.DELIVERY_API_URL),
      wallet: moduleUrl(parsed.WALLET_API_URL),
      payout: moduleUrl(parsed.PAYOUT_API_URL),
      media: moduleUrl(parsed.MEDIA_API_URL),
    },
    allowedOrigins: parsed.ALLOWED_ORIGINS,
    allowAnyLocalhostOrigin: parsed.NODE_ENV === 'development',
    cookieSecure: parsed.COOKIE_SECURE ?? parsed.NODE_ENV === 'production',
    timeouts: {
      upstream: parsed.UPSTREAM_TIMEOUT_MS,
      upload: parsed.UPLOAD_TIMEOUT_MS,
      optional: parsed.OPTIONAL_TIMEOUT_MS,
    },
  }
}
