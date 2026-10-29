import { delay, HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { BACKEND, problemJson, setup } from './test/fakeBackend.ts'
import { server } from './test/server.ts'

describe('/api/v1 프록시', () => {
  it('경로·쿼리·상태·본문을 그대로 넘기고 BFF 쿠키는 백엔드로 보내지 않는다', async () => {
    const { request } = setup()
    let seen: { url: string; cookie: string | null } | null = null
    server.use(
      http.get(`${BACKEND}/api/v1/products`, ({ request }) => {
        seen = { url: request.url, cookie: request.headers.get('Cookie') }
        return HttpResponse.json({ content: [], page: 0 }, { status: 200 })
      }),
    )

    const response = await request('/api/v1/products?page=0&size=20', { cookie: 'paldo_sid=abc' })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ content: [], page: 0 })
    expect(seen).toEqual({ url: `${BACKEND}/api/v1/products?page=0&size=20`, cookie: null })
  })

  it('1단계: 브라우저가 보낸 Authorization을 그대로 넘긴다', async () => {
    const { request } = setup()
    let authorization: string | null = null
    server.use(
      http.get(`${BACKEND}/api/v1/members/me`, ({ request }) => {
        authorization = request.headers.get('Authorization')
        return HttpResponse.json({ memberId: 7 })
      }),
    )

    await request('/api/v1/members/me', { headers: { Authorization: 'Bearer browser-token' } })

    expect(authorization).toBe('Bearer browser-token')
  })

  it('세션 쿠키가 있으면 세션 토큰을 붙인다', async () => {
    const { request, login, authenticate } = setup()
    const { cookie } = await login()
    server.use(
      http.get(`${BACKEND}/api/v1/members/me`, ({ request }) =>
        authenticate(request) === 'ok'
          ? HttpResponse.json({ memberId: 7 })
          : problemJson(401, '로그인이 필요합니다.'),
      ),
    )

    const response = await request('/api/v1/members/me', { cookie })

    expect(response.status).toBe(200)
  })

  it('access가 만료된 채 동시에 온 요청 5개는 재발급을 한 번만 한다', async () => {
    const { request, login, authenticate, clock, calls, ACCESS_MS } = setup()
    const { cookie } = await login()
    server.use(
      http.get(`${BACKEND}/api/v1/orders`, ({ request }) =>
        authenticate(request) === 'ok' ? HttpResponse.json([]) : problemJson(401, '만료'),
      ),
    )
    clock.now += ACCESS_MS + 1

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => request('/api/v1/orders', { cookie })),
    )

    expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 200, 200])
    expect(calls.reissue).toBe(1)
  })

  it('백엔드가 만료로 거절하면 재발급 뒤 같은 요청을 본문째 다시 보낸다', async () => {
    const { request, login, authenticate, calls } = setup()
    const { cookie } = await login()
    const bodies: unknown[] = []
    // BFF는 아직 남았다고 보지만 백엔드 시계로는 만료된 경우(서버 간 시계 차이)
    let backendSaysExpired = true
    server.use(
      http.post(`${BACKEND}/api/v1/cart/items`, async ({ request }) => {
        bodies.push(await request.json())
        if (backendSaysExpired) {
          backendSaysExpired = false
          return problemJson(401, '토큰이 만료되었습니다.')
        }
        return authenticate(request) === 'ok'
          ? HttpResponse.json({ ok: true }, { status: 201 })
          : problemJson(401, '유효하지 않은 토큰입니다.')
      }),
    )
    const item = { productOptionId: 3, quantity: 1 }

    const response = await request('/api/v1/cart/items', {
      method: 'POST',
      cookie,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })

    expect(response.status).toBe(201)
    expect(calls.reissue).toBe(1)
    expect(bodies).toEqual([item, item])
    expect(response.headers.getSetCookie().join()).toContain('paldo_sid=')
  })

  it('만료가 아닌 401이면 세션을 끝내고 토큰 없이 한 번 더 보낸다', async () => {
    const { request, login } = setup()
    const { cookie } = await login()
    const sent: (string | null)[] = []
    server.use(
      http.get(`${BACKEND}/api/v1/products/1`, ({ request }) => {
        const authorization = request.headers.get('Authorization')
        sent.push(authorization)
        return authorization
          ? problemJson(401, '유효하지 않은 토큰입니다.')
          : HttpResponse.json({ productId: 1 })
      }),
    )

    const response = await request('/api/v1/products/1', { cookie })

    expect(response.status).toBe(200)
    expect(sent).toEqual([expect.stringMatching(/^Bearer /), null])
    expect(response.headers.getSetCookie().join()).toContain('Max-Age=0')
  })

  it('업로드는 multipart 본문과 Content-Type을 그대로 흘려보낸다', async () => {
    const { request } = setup()
    let contentType: string | null = null
    let size = 0
    server.use(
      http.post(`${BACKEND}/api/v1/media`, async ({ request }) => {
        contentType = request.headers.get('Content-Type')
        size = (await request.arrayBuffer()).byteLength
        return HttpResponse.json({ mediaId: 1, url: 'https://cdn/x.jpg' }, { status: 201 })
      }),
    )
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(1024)]), 'x.jpg')

    const response = await request('/api/v1/media', { method: 'POST', body: form })

    expect(response.status).toBe(201)
    expect(contentType).toMatch(/^multipart\/form-data; boundary=/)
    expect(size).toBeGreaterThan(1024)
  })

  it('백엔드에 닿지 못하면 problem+json 502를 준다', async () => {
    const { request } = setup()
    server.use(http.get(`${BACKEND}/api/v1/products`, () => HttpResponse.error()))

    const response = await request('/api/v1/products')

    expect(response.status).toBe(502)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await response.json()).toMatchObject({
      detail: '서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요',
    })
  })
})

describe('시간 초과', () => {
  it('백엔드 응답이 timeout을 넘기면 504를 준다', async () => {
    const { createApp } = await import('./app.ts')
    const { loadConfig } = await import('./config.ts')
    const app = createApp({
      config: loadConfig({ NODE_ENV: 'test', BACKEND_URL: BACKEND, UPSTREAM_TIMEOUT_MS: '20' }),
    })
    server.use(
      http.get(`${BACKEND}/api/v1/products`, async () => {
        await delay(200)
        return HttpResponse.json([])
      }),
    )

    const response = await app.request('http://localhost:8787/api/v1/products')

    expect(response.status).toBe(504)
  })
})
