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

    const response = await request('/api/v1/products?page=0&size=20', {
      cookie: 'theme=dark; paldo_at=abc',
    })

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

  it('access 쿠키가 있으면 Bearer로 붙인다', async () => {
    const { request, login, authenticate } = setup()
    const { jar } = await login()
    server.use(
      http.get(`${BACKEND}/api/v1/members/me`, ({ request }) =>
        authenticate(request) === 'ok'
          ? HttpResponse.json({ memberId: 7 })
          : problemJson(401, '로그인이 필요합니다.'),
      ),
    )

    const response = await request('/api/v1/members/me', { jar })

    expect(response.status).toBe(200)
  })

  it('백엔드가 만료로 거절하면 재발급하지 않고 401을 그대로 돌려준다 — 프론트가 재발급한다', async () => {
    const { request, login, calls } = setup()
    const { jar } = await login()
    // BFF 쿠키는 아직 남았지만 백엔드 시계로는 만료된 경우(서버 간 시계 차이)
    server.use(
      http.post(`${BACKEND}/api/v1/cart/items`, () => problemJson(401, '토큰이 만료되었습니다.')),
    )

    const response = await request('/api/v1/cart/items', {
      method: 'POST',
      jar,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productOptionId: 3, quantity: 1 }),
    })

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ detail: '토큰이 만료되었습니다.' })
    expect(calls.reissue).toBe(0)
    expect(response.headers.getSetCookie()).toEqual([])
  })

  it('만료가 아닌 401이면 쿠키를 지우고 토큰 없이 한 번 더 보낸다', async () => {
    const { request, login } = setup()
    const { jar } = await login()
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

    const response = await request('/api/v1/products/1', { jar })

    expect(response.status).toBe(200)
    expect(sent).toEqual([expect.stringMatching(/^Bearer /), null])
    expect(jar.names()).toEqual([])
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
