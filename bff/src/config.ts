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
  /** 세션 저장소. 없으면 프로세스 메모리(개발·테스트) — 재시작하면 모두 로그아웃된다 (ADR-0007) */
  REDIS_URL: url.optional(),
  /** Redis에 넣는 세션을 잠그는 키(32바이트 base64, `openssl rand -base64 32`). 바꾸면 모두 다시 로그인한다 */
  SESSION_ENCRYPTION_KEY: z.string().optional(),
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
  /** null이면 메모리 세션 */
  redis: { url: string; encryptionKey: Buffer } | null
  timeouts: { upstream: number; upload: number; optional: number }
}

function encryptionKey(value = ''): Buffer {
  const key = Buffer.from(value, 'base64')
  // Buffer.from은 base64가 아닌 글자를 조용히 건너뛴다. 되돌렸을 때 같아야 오타 난 키를 막는다
  if (key.length !== 32 || key.toString('base64') !== value) {
    throw new Error('REDIS_URL을 쓰려면 SESSION_ENCRYPTION_KEY(32바이트 base64)가 필요하다')
  }
  return key
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const parsed = EnvSchema.parse(env)
  // 설정을 빠뜨려 운영이 조용히 메모리 세션으로 도는 것을 막는다
  if (parsed.NODE_ENV === 'production' && !parsed.REDIS_URL) {
    throw new Error('운영(NODE_ENV=production)에서는 REDIS_URL이 필요하다')
  }
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
    redis: parsed.REDIS_URL
      ? { url: parsed.REDIS_URL, encryptionKey: encryptionKey(parsed.SESSION_ENCRYPTION_KEY) }
      : null,
    timeouts: {
      upstream: parsed.UPSTREAM_TIMEOUT_MS,
      upload: parsed.UPLOAD_TIMEOUT_MS,
      optional: parsed.OPTIONAL_TIMEOUT_MS,
    },
  }
}
