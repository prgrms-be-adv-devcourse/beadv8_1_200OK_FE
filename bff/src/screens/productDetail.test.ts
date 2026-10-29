import { delay, HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { BACKEND, problemJson, setup } from '../test/fakeBackend.ts'
import { server } from '../test/server.ts'

const product = { productId: 1, name: '해남 꿀고구마' }
const reviews = { content: [{ reviewId: 3 }], page: 0, size: 20, totalElements: 1, totalPages: 1 }

describe('GET /bff/products/:id/detail', () => {
  it('비회원이면 상품과 리뷰를 합치고 내 리뷰는 부르지 않는다', async () => {
    const { request } = setup()
    const reviewQueries: string[] = []
    server.use(
      http.get(`${BACKEND}/api/v1/products/1`, () => HttpResponse.json(product)),
      http.get(`${BACKEND}/api/v1/products/1/reviews`, ({ request }) => {
        reviewQueries.push(new URL(request.url).search)
        return HttpResponse.json(reviews)
      }),
    )

    const response = await request('/bff/products/1/detail')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ product, reviews, myReviews: null })
    expect(reviewQueries).toEqual(['?page=0&size=20'])
  })

  it('로그인했으면 내 리뷰도 세션 토큰으로 불러 합친다', async () => {
    const { request, login, authenticate } = setup()
    const { cookie } = await login()
    server.use(
      http.get(`${BACKEND}/api/v1/products/1`, () => HttpResponse.json(product)),
      http.get(`${BACKEND}/api/v1/products/1/reviews`, () => HttpResponse.json(reviews)),
      http.get(`${BACKEND}/api/v1/products/1/reviews/me`, ({ request }) =>
        authenticate(request) === 'ok'
          ? HttpResponse.json([{ reviewId: 3 }])
          : problemJson(401, '로그인이 필요합니다.'),
      ),
    )

    const response = await request('/bff/products/1/detail', { cookie })

    expect(await response.json()).toMatchObject({ myReviews: [{ reviewId: 3 }] })
  })

  it('리뷰 서비스가 실패하거나 늦으면 리뷰만 null로 두고 상품은 보여 준다', async () => {
    const { createApp } = await import('../app.ts')
    const { loadConfig } = await import('../config.ts')
    const app = createApp({
      config: loadConfig({ NODE_ENV: 'test', BACKEND_URL: BACKEND, OPTIONAL_TIMEOUT_MS: '20' }),
    })
    server.use(
      http.get(`${BACKEND}/api/v1/products/1`, () => HttpResponse.json(product)),
      http.get(`${BACKEND}/api/v1/products/1/reviews`, async () => {
        await delay(200)
        return HttpResponse.json(reviews)
      }),
    )

    const response = await app.request('http://localhost:8787/bff/products/1/detail')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ product, reviews: null, myReviews: null })
  })

  it('상품이 없으면 백엔드 404를 그대로 돌려준다', async () => {
    const { request } = setup()
    server.use(
      http.get(`${BACKEND}/api/v1/products/9`, () => problemJson(404, '상품을 찾을 수 없습니다.')),
      http.get(`${BACKEND}/api/v1/products/9/reviews`, () => HttpResponse.json(reviews)),
    )

    const response = await request('/bff/products/9/detail')

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ detail: '상품을 찾을 수 없습니다.' })
  })
})
