import { delay, HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { BACKEND, problemJson, setup } from './test/fakeBackend.ts'
import { server } from './test/server.ts'

const PATH = '/api/v1/products/1'
// 백엔드는 모든 응답에 no-store를 준다(Spring Security 기본값). 브라우저로 그대로 간다
const NO_STORE = 'no-cache, no-store, max-age=0, must-revalidate'

/** 부를 때마다 calls가 늘고, 지금 product 값을 돌려주는 가짜 상품 상세 */
function fakeProduct(initial: { productId: number; name: string } = { productId: 1, name: 'v1' }) {
  const state = { product: initial, calls: 0, authorizations: [] as (string | null)[] }
  server.use(
    http.get(`${BACKEND}${PATH}`, ({ request }) => {
      state.calls += 1
      state.authorizations.push(request.headers.get('Authorization'))
      return HttpResponse.json(state.product, { headers: { 'Cache-Control': NO_STORE } })
    }),
  )
  return state
}

describe('상품 상세 캐시', () => {
  it('TTL(5초) 안의 재요청은 백엔드를 부르지 않고 같은 상태·본문·헤더를 준다', async () => {
    const { request, clock } = setup()
    const backend = fakeProduct()

    const first = await request(PATH)
    clock.now += 4_999
    const second = await request(PATH)

    expect(backend.calls).toBe(1)
    expect(first.headers.get('X-Cache')).toBe('MISS')
    expect(second.headers.get('X-Cache')).toBe('HIT')
    for (const response of [first, second]) {
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('Cache-Control')).toBe(NO_STORE)
      expect(await response.json()).toEqual({ productId: 1, name: 'v1' })
    }
  })

  it('TTL이 지나면 백엔드를 다시 부른다', async () => {
    const { request, clock } = setup()
    const backend = fakeProduct()

    await request(PATH)
    backend.product = { productId: 1, name: 'v2' }
    clock.now += 5_000
    const response = await request(PATH)

    expect(backend.calls).toBe(2)
    expect(response.headers.get('X-Cache')).toBe('MISS')
    expect(await response.json()).toEqual({ productId: 1, name: 'v2' })
  })

  it('같은 상품을 동시에 N건 부르면 백엔드는 1번만 부른다', async () => {
    const { request } = setup()
    let calls = 0
    server.use(
      http.get(`${BACKEND}${PATH}`, async () => {
        calls += 1
        await delay(30)
        return HttpResponse.json({ productId: 1 })
      }),
    )

    const responses = await Promise.all(Array.from({ length: 10 }, () => request(PATH)))

    expect(calls).toBe(1)
    expect(responses.map((response) => response.status)).toEqual(Array(10).fill(200))
    expect(responses.filter((r) => r.headers.get('X-Cache') === 'MISS')).toHaveLength(1)
    for (const response of responses) expect(await response.json()).toEqual({ productId: 1 })
  })

  it.each([
    [404, '상품을 찾을 수 없습니다.'],
    [500, '서버 오류가 발생했습니다.'],
  ])('%i는 그대로 돌려주고 담지 않는다', async (status, detail) => {
    const { request } = setup()
    let calls = 0
    server.use(
      http.get(`${BACKEND}${PATH}`, () => {
        calls += 1
        return problemJson(status, detail)
      }),
    )

    const first = await request(PATH)
    const second = await request(PATH)

    expect(calls).toBe(2)
    expect(second.status).toBe(status)
    expect(second.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await first.json()).toMatchObject({ detail })
  })

  it('백엔드에 닿지 못하면 502를 주고 다음 요청은 다시 부른다', async () => {
    const { request } = setup()
    const backend = fakeProduct()
    // 나중에 단 핸들러가 먼저 받는다
    server.use(http.get(`${BACKEND}${PATH}`, () => HttpResponse.error(), { once: true }))

    const failed = await request(PATH)
    const next = await request(PATH)

    expect(failed.status).toBe(502)
    expect(next.status).toBe(200)
    expect(backend.calls).toBe(1)
  })

  it('토큰과 상관없이 하나의 캐시를 쓰고, 백엔드에는 토큰 없이 부른다', async () => {
    const { request, login } = setup()
    const { jar } = await login()
    const backend = fakeProduct()

    const browserToken = await request(PATH, { headers: { Authorization: 'Bearer browser-token' } })
    const anonymous = await request(PATH)
    const cookie = await request(PATH, { jar })

    expect(backend.calls).toBe(1)
    expect(backend.authorizations).toEqual([null])
    expect([browserToken, anonymous, cookie].map((r) => r.status)).toEqual([200, 200, 200])
  })

  it('쿼리가 붙은 상세는 캐시하지 않고 그대로 넘긴다', async () => {
    const { request } = setup()
    const backend = fakeProduct()

    await request(`${PATH}?preview=1`)
    const response = await request(`${PATH}?preview=1`)

    expect(backend.calls).toBe(2)
    expect(response.headers.get('X-Cache')).toBeNull()
  })

  it('상품 수가 상한을 넘으면 가장 오래 안 쓴 상품부터 버린다', async () => {
    const { request } = setup({ env: { PRODUCT_CACHE_MAX_ENTRIES: '2' } })
    const calls = new Map<string, number>()
    server.use(
      http.get(`${BACKEND}/api/v1/products/:id`, ({ params }) => {
        const id = String(params.id)
        calls.set(id, (calls.get(id) ?? 0) + 1)
        return HttpResponse.json({ productId: Number(id) })
      }),
    )

    await request('/api/v1/products/1')
    await request('/api/v1/products/2')
    await request('/api/v1/products/1') // 1을 최근에 씀 → 2가 가장 오래 안 쓴 상품
    await request('/api/v1/products/3') // 2를 버린다
    const one = await request('/api/v1/products/1')
    const two = await request('/api/v1/products/2')

    expect(one.headers.get('X-Cache')).toBe('HIT')
    expect(two.headers.get('X-Cache')).toBe('MISS')
    expect(Object.fromEntries(calls)).toEqual({ '1': 1, '2': 2, '3': 1 })
  })

  it('TTL을 0으로 두면 담지 않는다', async () => {
    const { request } = setup({ env: { PRODUCT_CACHE_TTL_MS: '0' } })
    const backend = fakeProduct()

    await request(PATH)
    await request(PATH)

    expect(backend.calls).toBe(2)
  })

  it('본문 합계가 바이트 상한을 넘으면 오래 안 쓴 상품부터 버리고, 혼자 넘는 본문은 담지 않는다', async () => {
    const { request } = setup({ env: { PRODUCT_CACHE_MAX_BYTES: '250' } })
    const calls = new Map<string, number>()
    server.use(
      http.get(`${BACKEND}/api/v1/products/:id`, ({ params }) => {
        const id = String(params.id)
        calls.set(id, (calls.get(id) ?? 0) + 1)
        // 1·2는 100바이트쯤, 9는 상한보다 크다
        const size = id === '9' ? 300 : 80
        return HttpResponse.json({ productId: Number(id), descriptionHtml: 'x'.repeat(size) })
      }),
    )

    await request('/api/v1/products/1')
    await request('/api/v1/products/2')
    await request('/api/v1/products/3') // 합계가 넘어 1을 버린다
    await request('/api/v1/products/9')
    await request('/api/v1/products/9')
    const three = await request('/api/v1/products/3')
    const one = await request('/api/v1/products/1')

    expect(three.headers.get('X-Cache')).toBe('HIT')
    expect(one.headers.get('X-Cache')).toBe('MISS')
    expect(calls.get('9')).toBe(2)
  })
})

describe('판매자 변경 뒤 캐시 삭제', () => {
  it.each([
    ['PUT', PATH, 200],
    ['PATCH', `${PATH}/status`, 204],
    ['PATCH', `${PATH}/visibility`, 204],
    ['DELETE', PATH, 204],
  ])('%s %s가 성공하면 다음 상세는 바로 새 값이다', async (method, path, status) => {
    const { request } = setup({ roles: ['SELLER'] })
    const backend = fakeProduct()
    server.use(
      http.all(`${BACKEND}${path}`, ({ request }) => {
        if (request.method !== method) return undefined
        backend.product = { productId: 1, name: 'v2' }
        return new HttpResponse(status === 204 ? null : '{}', { status })
      }),
    )

    await request(PATH)
    const change = await request(path, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer seller-token' },
      body: method === 'DELETE' ? undefined : '{}',
    })
    const after = await request(PATH)

    expect(change.status).toBe(status)
    expect(after.headers.get('X-Cache')).toBe('MISS')
    expect(await after.json()).toEqual({ productId: 1, name: 'v2' })
  })

  it('변경이 실패하면 캐시를 그대로 둔다', async () => {
    const { request } = setup({ roles: ['SELLER'] })
    const backend = fakeProduct()
    server.use(
      http.put(`${BACKEND}${PATH}`, () => problemJson(409, '다른 곳에서 먼저 수정했어요.')),
    )

    await request(PATH)
    await request(PATH, { method: 'PUT', body: '{}' })
    const after = await request(PATH)

    expect(after.headers.get('X-Cache')).toBe('HIT')
    expect(backend.calls).toBe(1)
  })

  it('불러오는 중에 변경이 끝나면 그 결과는 담지 않는다 — 바뀌기 전 값일 수 있다', async () => {
    const { request } = setup({ roles: ['SELLER'] })
    let release = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let calls = 0
    let name = 'v1'
    server.use(
      http.get(`${BACKEND}${PATH}`, async () => {
        calls += 1
        const seen = name // 변경 전에 DB에서 읽은 값
        if (calls === 1) await gate
        return HttpResponse.json({ productId: 1, name: seen })
      }),
      http.put(`${BACKEND}${PATH}`, () => {
        name = 'v2'
        return HttpResponse.json({})
      }),
    )

    const slow = request(PATH)
    await delay(10)
    await request(PATH, { method: 'PUT', body: '{}' })
    release()
    expect(await (await slow).json()).toEqual({ productId: 1, name: 'v1' })
    const after = await request(PATH)

    expect(calls).toBe(2)
    expect(await after.json()).toEqual({ productId: 1, name: 'v2' })
  })
})

describe('BFF 상세 라우트와 캐시 공유', () => {
  it('/bff/products/:id/detail의 상품 부분도 같은 캐시를 쓴다', async () => {
    const { request } = setup()
    const backend = fakeProduct()
    server.use(http.get(`${BACKEND}${PATH}/reviews`, () => HttpResponse.json({ content: [] })))

    await request(PATH)
    const screen = await request('/bff/products/1/detail')

    expect(backend.calls).toBe(1)
    expect(screen.headers.get('X-Cache')).toBe('HIT')
    expect(await screen.json()).toMatchObject({ product: { productId: 1, name: 'v1' } })
  })
})
