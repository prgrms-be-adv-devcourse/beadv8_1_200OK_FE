import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { backendIssue } from './backendReport.ts'
import { BACKEND, problemJson, setup } from './test/fakeBackend.ts'
import { server } from './test/server.ts'

// #49 테스트 시나리오 B1–B10. B11(같은 경로 5xx 100번이 이슈 1개로 묶임)은 로컬 DSN으로 수동 확인한다

const traced = (response: Response, traceId: string) => {
  response.headers.set('X-Trace-Id', traceId)
  return response
}

describe('백엔드 5xx 보고', () => {
  it('B1: 백엔드 500을 그대로 돌려주고 모듈·경로·상태·traceId·detail을 한 번 보고한다', async () => {
    const { request, reported } = setup()
    server.use(
      http.get(`${BACKEND}/api/v1/products/1`, () =>
        traced(problemJson(500, '서버 내부 오류가 발생했습니다.'), 't1'),
      ),
    )

    const response = await request('/api/v1/products/1')

    expect(response.status).toBe(500)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(response.headers.get('X-Trace-Id')).toBe('t1')
    expect(await response.json()).toEqual({
      type: 'about:blank',
      title: 'Error',
      status: 500,
      detail: '서버 내부 오류가 발생했습니다.',
      instance: '/',
    })
    expect(reported.serverErrors).toEqual([
      {
        module: 'product',
        route: 'GET /api/v1/products/:id',
        status: 500,
        traceId: 't1',
        detail: '서버 내부 오류가 발생했습니다.',
      },
    ])
  })

  it.each([502, 503, 504])('B2: 백엔드 %i도 상태를 구분해 한 번 보고한다', async (status) => {
    const { request, reported } = setup()
    server.use(
      http.post(`${BACKEND}/api/v1/orders`, () => traced(problemJson(status, '잠시 뒤'), 't2')),
    )

    const response = await request('/api/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    })

    expect(response.status).toBe(status)
    expect(reported.serverErrors).toEqual([
      { module: 'order', route: 'POST /api/v1/orders', status, traceId: 't2', detail: '잠시 뒤' },
    ])
  })

  it.each([400, 401, 403, 404, 409, 422])('B3: 백엔드 %i는 보고하지 않는다', async (status) => {
    const { request, reported } = setup()
    server.use(http.get(`${BACKEND}/api/v1/cart`, () => traced(problemJson(status, '거절'), 't3')))

    const response = await request('/api/v1/cart')

    expect(response.status).toBe(status)
    expect(reported.serverErrors).toEqual([])
    expect(reported.traceIds).toEqual(['t3'])
  })

  it('B4: 200은 보고하지 않고 span에 traceId만 남긴다', async () => {
    const { request, reported } = setup()
    server.use(
      http.get(`${BACKEND}/api/v1/products`, () =>
        traced(HttpResponse.json({ content: [] }), 't4'),
      ),
    )

    const response = await request('/api/v1/products?page=0')

    expect(response.status).toBe(200)
    expect(reported.serverErrors).toEqual([])
    expect(reported.traceIds).toEqual(['t4'])
  })

  it('B5: X-Trace-Id가 없으면 traceId 없이 보고하고 응답은 그대로 준다', async () => {
    const { request, reported } = setup()
    server.use(http.get(`${BACKEND}/api/v1/members/me`, () => problemJson(500, '오류')))

    const response = await request('/api/v1/members/me')

    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ detail: '오류' })
    expect(reported.traceIds).toEqual([])
    expect(reported.serverErrors).toEqual([
      {
        module: 'member',
        route: 'GET /api/v1/members/me',
        status: 500,
        traceId: null,
        detail: '오류',
      },
    ])
  })

  it('B6: 본문이 JSON이 아니면 detail 없이 보고하고 본문은 손대지 않는다', async () => {
    const { request, reported } = setup()
    const html = '<html><body>Internal Server Error</body></html>'
    server.use(
      http.get(`${BACKEND}/api/v1/wallets/me/charges/CHG-1`, () =>
        traced(
          new HttpResponse(html, { status: 500, headers: { 'Content-Type': 'text/html' } }),
          't6',
        ),
      ),
    )

    const response = await request('/api/v1/wallets/me/charges/CHG-1')

    expect(response.status).toBe(500)
    expect(response.headers.get('Content-Type')).toBe('text/html')
    expect(await response.text()).toBe(html)
    expect(reported.serverErrors).toEqual([
      {
        module: 'wallet',
        route: 'GET /api/v1/wallets/me/charges/:chargeNo',
        status: 500,
        traceId: 't6',
        detail: null,
      },
    ])
  })

  it('B6: JSON이지만 problem이 아니어도 detail 없이 보고한다', async () => {
    const { request, reported } = setup()
    server.use(
      http.get(`${BACKEND}/api/v1/products/1`, () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    )

    const response = await request('/api/v1/products/1')

    expect(await response.json()).toEqual({ error: 'boom' })
    expect(reported.serverErrors).toMatchObject([{ status: 500, detail: null }])
  })

  it('B7: 백엔드에 닿지 못하면 지금처럼 502 problem이고 5xx 보고는 하지 않는다(중복 없음)', async () => {
    const { request, reported } = setup()
    server.use(http.get(`${BACKEND}/api/v1/products`, () => HttpResponse.error()))

    const response = await request('/api/v1/products')

    expect(response.status).toBe(502)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    // 연결 실패는 throw → onError로 가고, sentry() 미들웨어가 그 오류를 한 번 보고한다
    expect(reported.serverErrors).toEqual([])
  })

  it('B8: 상세 라우트에서 상품 호출이 500이면 한 번 보고하고 그대로 relay한다', async () => {
    const { request, reported } = setup()
    server.use(
      http.get(`${BACKEND}/api/v1/products/1`, () => traced(problemJson(500, '상품 오류'), 't8')),
      http.get(`${BACKEND}/api/v1/products/1/reviews`, () => HttpResponse.json({ content: [] })),
    )

    const response = await request('/bff/products/1/detail')

    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ detail: '상품 오류' })
    expect(reported.serverErrors).toEqual([
      {
        module: 'product',
        route: 'GET /api/v1/products/:id',
        status: 500,
        traceId: 't8',
        detail: '상품 오류',
      },
    ])
  })

  it('B9: 상세 라우트에서 리뷰(부가) 호출만 500이면 화면은 200으로 주고 부가 실패도 보고한다', async () => {
    const { request, reported } = setup()
    server.use(
      http.get(`${BACKEND}/api/v1/products/1`, () => HttpResponse.json({ productId: 1 })),
      http.get(`${BACKEND}/api/v1/products/1/reviews`, () =>
        traced(problemJson(500, '리뷰 오류'), 't9'),
      ),
    )

    const response = await request('/bff/products/1/detail')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      product: { productId: 1 },
      reviews: null,
      myReviews: null,
    })
    // 브라우저는 실패를 보지 못하므로 보고가 백엔드 장애를 아는 유일한 길이다
    expect(reported.serverErrors).toEqual([
      {
        module: 'product',
        route: 'GET /api/v1/products/:id/reviews',
        status: 500,
        traceId: 't9',
        detail: '리뷰 오류',
      },
    ])
  })

  it('B10: 보고에 Authorization·쿠키·요청 본문이 들어가지 않는다', async () => {
    const { request, reported } = setup()
    server.use(
      http.post(`${BACKEND}/api/v1/cart/items`, () => traced(problemJson(500, '오류'), 't10')),
    )

    await request('/api/v1/cart/items', {
      method: 'POST',
      cookie: 'paldo_at=cookie-secret; theme=dark',
      headers: { Authorization: 'Bearer token-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ productOptionId: 3, memo: 'body-secret' }),
    })

    expect(reported.serverErrors).toHaveLength(1)
    const [failure] = reported.serverErrors
    expect(Object.keys(failure ?? {}).sort()).toEqual([
      'detail',
      'module',
      'route',
      'status',
      'traceId',
    ])
    const sent = JSON.stringify([failure, failure && backendIssue(failure)])
    for (const secret of ['token-secret', 'cookie-secret', 'body-secret', 'Bearer', 'paldo_at']) {
      expect(sent).not.toContain(secret)
    }
  })
})

describe('backendIssue — Sentry로 보내는 이벤트', () => {
  const failure = {
    module: 'product' as const,
    route: 'GET /api/v1/products/:id',
    status: 500,
    traceId: 't1',
    detail: '서버 내부 오류가 발생했습니다.',
  }

  it('fingerprint는 [모듈, 경로, 상태]라 traceId·detail이 달라도 한 이슈로 묶인다', () => {
    const first = backendIssue(failure)
    const second = backendIssue({ ...failure, traceId: 't2', detail: '다른 문구' })

    expect(first.context.fingerprint).toEqual(['product', 'GET /api/v1/products/:id', '500'])
    expect(second.context.fingerprint).toEqual(first.context.fingerprint)
    expect(first.message).toBe(second.message)
    expect(backendIssue({ ...failure, status: 503 }).context.fingerprint).toEqual([
      'product',
      'GET /api/v1/products/:id',
      '503',
    ])
  })

  it('traceId는 태그로, 전체 내용은 backend 컨텍스트로 남기고 traceId가 없으면 태그를 뺀다', () => {
    expect(backendIssue(failure).context).toMatchObject({
      level: 'error',
      tags: { 'backend.trace_id': 't1', 'backend.status': 500, 'backend.module': 'product' },
      contexts: { backend: failure },
    })
    expect(backendIssue({ ...failure, traceId: null }).context.tags).not.toHaveProperty(
      'backend.trace_id',
    )
  })
})
