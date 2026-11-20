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
  /**
   * multipart가 아닌 요청 본문 상한. proxy.ts가 메모리에 통째로 담아서 둔다. 업로드는 대상이 아니다.
   * 가장 큰 본문은 상품 상세설명(백엔드 @Size(max = 200_000))이다. 한글이면 UTF-8로 약 600KB라 2MB 안이다
   */
  REQUEST_BODY_LIMIT_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(2 * 1024 * 1024),
  /** 상품 상세 응답을 BFF 메모리에 두는 시간(ADR-0011). 0이면 담지 않고 동시 요청 합치기만 한다 */
  PRODUCT_CACHE_TTL_MS: z.coerce.number().int().nonnegative().default(5_000),
  /** 상품 상세 캐시에 둘 상품 수. 넘으면 가장 오래 안 쓴 것부터 버린다 */
  PRODUCT_CACHE_MAX_ENTRIES: z.coerce.number().int().positive().default(500),
  /**
   * 상품 상세 캐시 본문 합계 상한(바이트). 상세 설명은 최대 20만 자라 개수만으로는 메모리를 묶지 못한다.
   * 운영 컨테이너 mem_limit이 256MB라 기본 16MB. 넘으면 오래 안 쓴 것부터 버린다
   */
  PRODUCT_CACHE_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(16 * 1024 * 1024),
})

export type Config = {
  port: number
  backendUrl: string
  upstreams: Record<UpstreamModule, string>
  allowedOrigins: string[]
  /** vite는 5173이 차 있으면 5174로 뜬다. 그때도 개발이 막히지 않게 한다 */
  allowAnyLocalhostOrigin: boolean
  /** 개발 환경 전용 경로(devRoutes.ts: Sentry 테스트 오류)를 열지 */
  devRoutes: boolean
  cookieSecure: boolean
  requestBodyLimitBytes: number
  timeouts: { upstream: number; upload: number; optional: number }
  productCache: { ttlMs: number; maxEntries: number; maxBytes: number }
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
    devRoutes: parsed.NODE_ENV === 'development',
    cookieSecure: parsed.COOKIE_SECURE ?? parsed.NODE_ENV === 'production',
    requestBodyLimitBytes: parsed.REQUEST_BODY_LIMIT_BYTES,
    timeouts: {
      upstream: parsed.UPSTREAM_TIMEOUT_MS,
      upload: parsed.UPLOAD_TIMEOUT_MS,
      optional: parsed.OPTIONAL_TIMEOUT_MS,
    },
    productCache: {
      ttlMs: parsed.PRODUCT_CACHE_TTL_MS,
      maxEntries: parsed.PRODUCT_CACHE_MAX_ENTRIES,
      maxBytes: parsed.PRODUCT_CACHE_MAX_BYTES,
    },
  }
}
