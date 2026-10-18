import { HttpResponse, http } from 'msw'
import {
  appleReviews,
  MY_MEMBER_ID,
  productDetailOf,
  productSummaries,
} from '@/features/products/fixtures'
import { ProductCategory, ProductCategoryGroup } from '@/shared/api/types'
import { categoryLabels } from '@/shared/lib/labels'

// 상품 조회 기본 응답 (products fixtures). 실패 시나리오는 테스트에서 server.use(...)로 덮는다.

const notFound = (instance: string) =>
  HttpResponse.json(
    {
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: '상품을 찾을 수 없습니다.',
      instance,
    },
    { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
  )

const pageOf = <T>(all: T[], searchParams: URLSearchParams) => {
  const page = Number(searchParams.get('page') ?? 0)
  const size = Number(searchParams.get('size') ?? 20)
  return {
    content: all.slice(page * size, page * size + size),
    page,
    size,
    totalElements: all.length,
    totalPages: Math.ceil(all.length / size),
  }
}

export const productHandlers = [
  http.get('*/api/v1/products/categories', () =>
    HttpResponse.json([
      {
        group: ProductCategoryGroup.AGRICULTURE,
        description: '농산물',
        categories: Object.values(ProductCategory).map((code) => ({
          code,
          description: categoryLabels[code],
        })),
      },
    ]),
  ),

  http.get('*/api/v1/products', ({ request }) => {
    const params = new URL(request.url).searchParams
    const category = params.get('category')
    const region = params.get('region')
    const matched = productSummaries.filter(
      (product) =>
        (!category || product.category === category) && (!region || product.region === region),
    )
    return HttpResponse.json(pageOf(matched, params))
  }),

  http.get('*/api/v1/products/:productId', ({ params, request }) => {
    const detail = productDetailOf(Number(params.productId))
    return detail ? HttpResponse.json(detail) : notFound(new URL(request.url).pathname)
  }),

  // 토큰을 확인하지 않고 fixtures의 ‘나’(MY_MEMBER_ID) 리뷰를 준다
  http.get('*/api/v1/products/:productId/reviews/me', ({ params }) =>
    HttpResponse.json(
      appleReviews.filter(
        (review) =>
          review.productId === Number(params.productId) && review.memberId === MY_MEMBER_ID,
      ),
    ),
  ),

  http.get('*/api/v1/products/:productId/reviews', ({ params, request }) => {
    const url = new URL(request.url)
    if (!productDetailOf(Number(params.productId))) return notFound(url.pathname)
    const reviews = appleReviews.filter((review) => review.productId === Number(params.productId))
    return HttpResponse.json(pageOf(reviews, url.searchParams))
  }),
]
