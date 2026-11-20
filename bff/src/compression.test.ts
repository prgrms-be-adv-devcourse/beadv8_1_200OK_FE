import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { BACKEND, setup } from './test/fakeBackend.ts'
import { server } from './test/server.ts'

const gzip = { 'Accept-Encoding': 'gzip, deflate, br' }

const products = {
  content: Array.from({ length: 50 }, (_, i) => ({
    productId: i + 1,
    name: `청송 햇살농원 부사 사과 ${i + 1}kg`,
    price: 23_900,
    thumbnailUrl: `https://cdn.example/products/${i + 1}.jpg`,
  })),
  page: 0,
}

const gunzip = (response: Response) =>
  new Response(response.body?.pipeThrough(new DecompressionStream('gzip'))).text()

describe('응답 압축', () => {
  it('C6: Accept-Encoding에 gzip이 있으면 큰 JSON을 gzip으로 보내고 풀면 원래 본문과 같다', async () => {
    const { request } = setup()
    server.use(http.get(`${BACKEND}/api/v1/products`, () => HttpResponse.json(products)))

    const response = await request('/api/v1/products?page=0', { headers: gzip })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Encoding')).toBe('gzip')
    expect(response.headers.get('Content-Length')).toBeNull()
    expect(response.headers.get('Vary')).toMatch(/Accept-Encoding/)
    expect(JSON.parse(await gunzip(response))).toEqual(products)
  })

  it('C7: Accept-Encoding이 없으면 압축하지 않는다', async () => {
    const { request } = setup()
    server.use(http.get(`${BACKEND}/api/v1/products`, () => HttpResponse.json(products)))

    const response = await request('/api/v1/products?page=0')

    expect(response.headers.get('Content-Encoding')).toBeNull()
    expect(await response.json()).toEqual(products)
  })

  it('C8: 1KB 미만 응답은 길이를 모르는 chunked여도 압축하지 않는다', async () => {
    const { request } = setup()
    const small = { productId: 1, name: '청송 사과' }
    server.use(
      // Spring처럼 Content-Length 없이 스트림으로 준다
      http.get(
        `${BACKEND}/api/v1/products/1`,
        () =>
          new HttpResponse(new Blob([JSON.stringify(small)]).stream(), {
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    )

    const response = await request('/api/v1/products/1', { headers: gzip })

    expect(response.headers.get('Content-Encoding')).toBeNull()
    expect(response.headers.get('Content-Length')).toBe(
      String(new TextEncoder().encode(JSON.stringify(small)).byteLength),
    )
    expect(await response.json()).toEqual(small)
  })

  it('C9: /api/v1/auth/* 응답은 커도 압축하지 않는다 — 토큰이 담긴다(BREACH)', async () => {
    const { request } = setup()
    const tokens = { accessToken: 'a'.repeat(2000), refreshToken: 'r'.repeat(2000) }
    server.use(http.post(`${BACKEND}/api/v1/auth/reissue`, () => HttpResponse.json(tokens)))

    const response = await request('/api/v1/auth/reissue', {
      method: 'POST',
      headers: { ...gzip, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'refresh-1' }),
    })

    expect(response.headers.get('Content-Encoding')).toBeNull()
    expect(await response.json()).toEqual(tokens)
  })

  it('C9: /bff/session/* 응답은 커도 압축하지 않는다', async () => {
    const { request } = setup()
    const detail = `아이디 또는 비밀번호가 일치하지 않습니다.${' '.repeat(2000)}`
    server.use(
      http.post(`${BACKEND}/api/v1/auth/login`, () =>
        HttpResponse.json(
          { status: 401, detail },
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )

    const response = await request('/bff/session/login', {
      method: 'POST',
      headers: { ...gzip, 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId: 'buyer01', password: 'wrong' }),
    })

    expect(response.status).toBe(401)
    expect(response.headers.get('Content-Encoding')).toBeNull()
    expect(await response.json()).toMatchObject({ detail })
  })

  it('C10: 204·304·HEAD는 본문 없이 오류 없이 돌려준다', async () => {
    const { request } = setup()
    server.use(
      http.delete(`${BACKEND}/api/v1/cart/items/1`, () => new HttpResponse(null, { status: 204 })),
      http.get(`${BACKEND}/api/v1/products`, ({ request }) =>
        request.headers.get('If-None-Match') === '"v1"'
          ? new HttpResponse(null, { status: 304, headers: { ETag: '"v1"' } })
          : HttpResponse.json(products),
      ),
      http.head(`${BACKEND}/api/v1/products`, () => new HttpResponse(null, { status: 200 })),
    )

    const noContent = await request('/api/v1/cart/items/1', { method: 'DELETE', headers: gzip })
    const notModified = await request('/api/v1/products', {
      headers: { ...gzip, 'If-None-Match': '"v1"' },
    })
    const head = await request('/api/v1/products', { method: 'HEAD', headers: gzip })

    for (const [response, status] of [
      [noContent, 204],
      [notModified, 304],
      [head, 200],
    ] as const) {
      expect(response.status).toBe(status)
      expect(response.headers.get('Content-Encoding')).toBeNull()
      expect(await response.text()).toBe('')
    }
  })

  it('C12: 큰 problem+json 오류도 압축돼 오고, 풀면 프론트가 detail을 그대로 읽는다', async () => {
    const { request } = setup()
    const problem = {
      type: 'about:blank',
      title: 'Unprocessable Entity',
      status: 422,
      detail: '입력값을 확인해 주세요.',
      errors: Array.from({ length: 40 }, (_, i) => ({
        field: `options[${i}].price`,
        message: '가격은 0원 이상이어야 합니다.',
      })),
    }
    server.use(
      http.post(`${BACKEND}/api/v1/sellers/me/products`, () =>
        HttpResponse.json(problem, {
          status: 422,
          headers: { 'Content-Type': 'application/problem+json' },
        }),
      ),
    )

    const response = await request('/api/v1/sellers/me/products', {
      method: 'POST',
      headers: { ...gzip, 'Content-Type': 'application/json' },
      body: '{}',
    })

    expect(response.status).toBe(422)
    expect(response.headers.get('Content-Type')).toBe('application/problem+json')
    expect(response.headers.get('Content-Encoding')).toBe('gzip')
    expect(JSON.parse(await gunzip(response))).toMatchObject({ detail: '입력값을 확인해 주세요.' })
  })
})
