import * as Sentry from '@sentry/hono/node'
import { HttpResponse, http } from 'msw'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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
const segments: SpanItem[] = []
const RELEASE = 'abc1234def5678'

beforeAll(() => {
  Sentry.init({
    dsn: 'http://public@sentry.test/1',
    ...sentryInitOptions({ NODE_ENV: 'test', SENTRY_RELEASE: RELEASE }),
    transport: () => ({
      send: async (envelope) => {
        for (const [header, item] of envelope[1]) {
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

async function segmentFor(path: string, init?: { method?: string }) {
  const { request } = setup()
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
