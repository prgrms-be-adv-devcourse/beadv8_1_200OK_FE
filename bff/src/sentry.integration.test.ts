import * as Sentry from '@sentry/hono/node'
import { HttpResponse, http } from 'msw'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { sentryBackendReport } from './backendReport.ts'
import { sentryInitOptions } from './sentry.ts'
import { BACKEND, setup } from './test/fakeBackend.ts'
import { server } from './test/server.ts'

// Sentry를 실제로 켜서 프록시 요청이 어떤 이름·release로 나가는지 본다(이 파일에서만 켠다).
// 서버 span은 node http 서버가 만들지만 테스트는 app.request()라서 같은 모양의 span을 직접 연다
type SpanItem = {
  name: string
  is_segment?: boolean
  attributes?: Record<string, { value: unknown }>
}
type ErrorEvent = {
  message?: string
  exception?: { values?: { type?: string; value?: string }[] }
  tags?: Record<string, unknown>
}
const segments: SpanItem[] = []
const errors: ErrorEvent[] = []
const RELEASE = 'abc1234def5678'

beforeAll(() => {
  Sentry.init({
    dsn: 'http://public@sentry.test/1',
    ...sentryInitOptions({ NODE_ENV: 'test', SENTRY_RELEASE: RELEASE }),
    transport: () => ({
      send: async (envelope) => {
        for (const [header, item] of envelope[1]) {
          if (header.type === 'event') errors.push(item as ErrorEvent)
          if (header.type !== 'span') continue
          for (const span of (item as { items: SpanItem[] }).items) {
            if (span.is_segment) segments.push(span)
          }
        }
        return {}
      },
      flush: async () => true,
    }),
  })
})

afterAll(() => Sentry.close())

async function segmentFor(
  path: string,
  init?: { method?: string },
  request: ReturnType<typeof setup>['request'] = setup().request,
) {
  await Sentry.startSpan(
    { name: init?.method ?? 'GET', op: 'http.server', forceTransaction: true },
    () => request(path, { method: init?.method }),
  )
  await Sentry.flush(1000)
  return segments.at(-1)
}

describe('Sentry 트랜잭션 이름 (A7 자동)', () => {
  it('프록시 요청은 /api/v1/*로 뭉치지 않고 정규화한 경로로 남는다', async () => {
    server.use(http.get(`${BACKEND}/api/v1/products/:id`, () => HttpResponse.json({})))

    const segment = await segmentFor('/api/v1/products/12?page=0')

    expect(segment?.name).toBe('GET /api/v1/products/:id')
    expect(segment?.attributes?.['http.route']?.value).toBe('/api/v1/products/:id')
  })

  it('A12: 이벤트 release가 SENTRY_RELEASE다', async () => {
    server.use(http.get(`${BACKEND}/api/v1/cart`, () => HttpResponse.json({})))

    const segment = await segmentFor('/api/v1/cart/')

    expect(segment?.name).toBe('GET /api/v1/cart')
    expect(segment?.attributes?.['sentry.release']?.value).toBe(RELEASE)
  })
})

describe('상품 상세 캐시 (ADR-0011)', () => {
  it('트랜잭션에 bff.cache(HIT·MISS)를 남겨 Sentry에서 캐시 효과를 나눠 본다', async () => {
    server.use(
      http.get(`${BACKEND}/api/v1/products/:id`, () => HttpResponse.json({ productId: 3 })),
    )
    const { request } = setup()

    const miss = await segmentFor('/api/v1/products/3', undefined, request)
    const hit = await segmentFor('/api/v1/products/3', undefined, request)

    expect(miss?.attributes?.['bff.cache']?.value).toBe('MISS')
    expect(hit?.attributes?.['bff.cache']?.value).toBe('HIT')
  })

  it('캐시를 거치지 않는 요청에는 bff.cache가 없다', async () => {
    server.use(http.get(`${BACKEND}/api/v1/cart`, () => HttpResponse.json({})))

    const segment = await segmentFor('/api/v1/cart')

    expect(segment?.attributes).not.toHaveProperty('bff.cache')
  })
})

describe('백엔드 5xx 보고 (#49)', () => {
  const failure = {
    module: 'order' as const,
    route: 'GET /api/v1/orders/:id',
    status: 500,
    traceId: 't1',
    detail: '주문을 불러오지 못했어요',
  }

  it('같은 5xx가 연달아 나도 모두 보낸다(Dedupe가 traceId가 다른 이벤트를 버리지 않는다)', async () => {
    errors.length = 0

    // 운영처럼 같은 줄에서 부른다. 부르는 줄이 다르면 스택이 달라 Dedupe가 다른 이벤트로 본다
    for (const traceId of ['t1', 't2', 't3']) {
      sentryBackendReport.serverError({ ...failure, traceId })
    }

    // 전송은 비동기라 한 번의 flush로 다 오지 않을 수 있다. Dedupe가 버리면 3건이 끝내 오지 않아 실패한다
    await vi.waitFor(async () => {
      await Sentry.flush(200)
      expect(errors).toHaveLength(3)
    })
    expect(errors.map((event) => event.tags?.['backend.trace_id']).sort()).toEqual([
      't1',
      't2',
      't3',
    ])
  })

  it('이슈 제목이 함수 이름이 아니라 오류 종류와 경로로 읽힌다', async () => {
    errors.length = 0

    sentryBackendReport.serverError(failure)
    await vi.waitFor(async () => {
      await Sentry.flush(200)
      expect(errors).toHaveLength(1)
    })

    expect(errors[0]?.exception?.values?.at(-1)).toMatchObject({
      type: 'BackendServerError',
      value: 'Backend 500 GET /api/v1/orders/:id',
    })
  })
})
