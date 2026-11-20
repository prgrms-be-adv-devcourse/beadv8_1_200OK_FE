// Sentry 설정과 트랜잭션 이름. instrument.ts(init)와 proxy.ts(이름)가 쓴다.
// Sentry가 꺼져 있으면(getClient 없음) 여기 함수들은 아무것도 보내지 않는다
import * as Sentry from '@sentry/hono/node'
import type { CacheStatus } from './productCache.ts'
import { routeName } from './routeName.ts'

type InitOptions = NonNullable<Parameters<typeof Sentry.init>[0]>
type TracesSampler = NonNullable<InitOptions['tracesSampler']>

/** 트래픽이 적은 동안은 운영도 모두 남긴다. 늘면 SENTRY_TRACES_SAMPLE_RATE로 낮춘다 (이슈 #48) */
export const DEFAULT_TRACES_SAMPLE_RATE = 1

/** Docker HEALTHCHECK가 10초마다 부른다(bff/Dockerfile). 트레이스로 남기면 실제 요청보다 많아진다 */
const HEALTH_PATH = '/health'

/**
 * 잘못된 값(숫자가 아니거나 0~1 밖)은 경고하고 기본값을 쓴다. 관측 설정 때문에 BFF가 뜨지 못하면
 * API 전체가 502가 되므로 시작을 막지 않는다
 */
export function parseTracesSampleRate(
  raw: string | undefined,
  warn: (message: string) => void = console.warn,
): number {
  if (raw === undefined || raw.trim() === '') return DEFAULT_TRACES_SAMPLE_RATE
  const rate = Number(raw)
  if (Number.isFinite(rate) && rate >= 0 && rate <= 1) return rate
  warn(
    `[sentry] SENTRY_TRACES_SAMPLE_RATE="${raw}"는 0~1 사이 숫자가 아니라 기본값 ${DEFAULT_TRACES_SAMPLE_RATE}을 써요`,
  )
  return DEFAULT_TRACES_SAMPLE_RATE
}

/**
 * v11의 서버 span은 샘플링할 때 이름이 메서드뿐("GET")이라 경로는 `url.path` 속성으로 본다.
 * 브라우저가 보낸 트레이스(sentry-trace)는 프론트의 결정을 따라 트레이스가 끊기지 않게 한다
 */
export function createTracesSampler(rate: number): TracesSampler {
  return (context) => {
    if (context.attributes?.['url.path'] === HEALTH_PATH) return 0
    return context.inheritOrSampleWith(rate)
  }
}

/**
 * 기본 Dedupe는 직전 이벤트와 메시지·fingerprint·스택이 같으면 버린다. 백엔드 5xx 보고(#49)는
 * 장애가 이어질 때 바로 그런 이벤트가 연달아 나고 이벤트마다 backend.trace_id가 달라서, 켜 두면
 * 장애 횟수가 줄고 백엔드 로그로 가는 단서가 사라진다(로컬 검증에서 6건 중 3건만 남음)
 */
const DEDUPE = 'Dedupe'

export function sentryInitOptions(
  env: Record<string, string | undefined>,
  warn?: (message: string) => void,
): Pick<InitOptions, 'environment' | 'release' | 'tracesSampler' | 'integrations'> {
  return {
    integrations: (defaults) => [
      ...defaults.filter((integration) => integration.name !== DEDUPE),
      Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
    ],
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV ?? 'development',
    // 이미지 빌드 때 커밋 SHA가 들어간다(bff/Dockerfile ARG, bff-image.yml). 로컬은 없어도 된다
    release: env.SENTRY_RELEASE || undefined,
    tracesSampler: createTracesSampler(parseTracesSampleRate(env.SENTRY_TRACES_SAMPLE_RATE, warn)),
  }
}

/**
 * 프록시는 /api/v1/* 하나라 Sentry Hono가 이름을 모두 `GET /api/v1/*`로 짓는다.
 * 실제 경로를 정규화한 이름으로 바꿔 API별로 나눠 본다
 */
export function nameTransaction(method: string, pathname: string): void {
  const name = routeName(method, pathname)
  const span = Sentry.getActiveSpan()
  if (span) {
    const root = Sentry.getRootSpan(span)
    Sentry.updateSpanName(root, name)
    root.setAttribute('http.route', name.slice(name.indexOf(' ') + 1))
  }
  // 오류 이벤트의 transaction 태그
  Sentry.getIsolationScope().setTransactionName(name)
}

/**
 * 상품 상세 캐시 결과(X-Cache와 같은 값)를 요청 트랜잭션에 남긴다 (ADR-0011).
 * Sentry에서 `bff.cache`로 나눠 HIT·MISS의 지연과 비율을 본다
 */
export function tagCache(cache: CacheStatus): void {
  const span = Sentry.getActiveSpan()
  if (span) Sentry.getRootSpan(span).setAttribute('bff.cache', cache)
}
