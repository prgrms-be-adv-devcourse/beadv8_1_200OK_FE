import { Hono } from 'hono'
import type { AppEnv } from '../auth.ts'
import { problem, problemDetail } from '../problem.ts'
import { type JsonResult, relay, type Upstream } from '../upstream.ts'

// 상품 상세 화면 한 번에: 상품 + 리뷰 첫 페이지 + 내 리뷰.
// 상품이 없으면 화면이 없으니 오류로 돌려주고, 리뷰는 못 받아도 null로 두고 화면을 그린다.
// 1단계에서는 프론트가 아직 쓰지 않는다 (ADR-0006).
// 백엔드 응답 모양은 프론트 shared/api/types.ts가 기준이라 여기서는 다시 정의하지 않는다
// TODO(bff-2단계): 프론트가 hono/client로 이 응답을 받을 때 공용 타입으로 좁힌다

// 프론트 REVIEW_PAGE_SIZE와 같게 둔다. 다음 페이지부터는 /api/v1 그대로 부른다
const REVIEW_PAGE_SIZE = 20

export function productDetailRoutes(deps: {
  upstream: Upstream
  timeouts: { upstream: number; optional: number }
}) {
  return new Hono<AppEnv>().get('/bff/products/:productId/detail', async (c) => {
    const productId = Number(c.req.param('productId'))
    if (!Number.isInteger(productId) || productId <= 0) {
      return problem(404, problemDetail.notFound, c.req.path)
    }
    const authorization = c.var.auth.authorization
    const signal = c.req.raw.signal
    const get = (path: string, timeoutMs: number) =>
      deps.upstream.getJson<unknown>('product', path, { authorization, timeoutMs, signal })

    const [product, reviews, myReviews] = await Promise.allSettled([
      get(`/api/v1/products/${productId}`, deps.timeouts.upstream),
      get(
        `/api/v1/products/${productId}/reviews?page=0&size=${REVIEW_PAGE_SIZE}`,
        deps.timeouts.optional,
      ),
      // 상세는 비회원도 본다. 로그인하지 않았으면 내 리뷰를 부르지 않는다
      authorization
        ? get(`/api/v1/products/${productId}/reviews/me`, deps.timeouts.optional)
        : Promise.resolve(null),
    ])

    if (product.status === 'rejected') throw product.reason
    if (!product.value.ok) return relay(product.value.response)
    return c.json({
      product: product.value.data,
      reviews: optional(reviews),
      myReviews: optional(myReviews),
    })
  })
}

function optional(result: PromiseSettledResult<JsonResult<unknown> | null>): unknown {
  if (result.status === 'rejected' || result.value === null) return null
  if (!result.value.ok) {
    // 본문을 읽지 않은 응답은 연결을 붙잡고 있으므로 버린다
    void result.value.response.body?.cancel()
    return null
  }
  return result.value.data
}
