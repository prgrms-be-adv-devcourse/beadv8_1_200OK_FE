import { HttpResponse, http } from 'msw'
import {
  appleReviewKeywordIds,
  appleReviewKeywords,
  appleReviews,
  MY_MEMBER_ID,
  productDetailOf,
  productSummaries,
  searchProducts,
  searchSuggestions,
} from '@/features/products/fixtures'
import { ProductCategory, ProductCategoryGroup, ProductSort } from '@/shared/api/types'
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

  // 검색어는 상품명·카테고리 이름에서 찾고, 가격 정렬만 흉내 낸다(그 밖의 정렬은 fixtures 순서)
  http.get('*/api/v1/products', ({ request }) => {
    const params = new URL(request.url).searchParams
    const keyword = params.get('keyword')?.trim() ?? ''
    const category = params.get('category')
    const region = params.get('region')
    const sort = params.get('sort')
    const matched = (keyword ? searchProducts(keyword) : productSummaries).filter(
      (product) =>
        (!category || product.category === category) && (!region || product.region === region),
    )
    if (sort === ProductSort.PRICE_ASC || sort === ProductSort.PRICE_DESC) {
      const direction = sort === ProductSort.PRICE_ASC ? 1 : -1
      matched.sort((a, b) => (a.minSalePrice - b.minSalePrice) * direction)
    }
    return HttpResponse.json({
      ...pageOf(matched, params),
      suggestion: searchSuggestions[keyword] ?? null,
    })
  }),

  // 상품 카드 여러 개(찜 목록용). 요청 순서, 중복 한 번, 없는 ID는 빠진다. :productId보다 앞에 둔다
  http.get('*/api/v1/products/summaries', ({ request }) => {
    const ids = (new URL(request.url).searchParams.get('ids') ?? '').split(',').map(Number)
    return HttpResponse.json(
      [...new Set(ids)].flatMap((id) => productSummaries.filter((p) => p.productId === id)),
    )
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

  http.get('*/api/v1/products/:productId/review-keywords', ({ params, request }) => {
    const productId = Number(params.productId)
    if (!productDetailOf(productId)) return notFound(new URL(request.url).pathname)
    return HttpResponse.json(
      productId === 101 ? appleReviewKeywords : { analyzedReviewCount: 0, keywords: [] },
    )
  }),

  http.get('*/api/v1/products/:productId/reviews', ({ params, request }) => {
    const url = new URL(request.url)
    if (!productDetailOf(Number(params.productId))) return notFound(url.pathname)
    const keyword = url.searchParams.get('keyword')
    if (keyword && !appleReviewKeywords.keywords.some((k) => k.keywordId === keyword)) {
      return HttpResponse.json(
        {
          type: 'about:blank',
          title: 'Bad Request',
          status: 400,
          detail: '리뷰 키워드를 찾을 수 없습니다.',
          instance: url.pathname,
          code: 'REVIEW_KEYWORD_NOT_FOUND',
        },
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
      )
    }
    const reviews = appleReviews.filter(
      (review) =>
        review.productId === Number(params.productId) &&
        (!keyword || appleReviewKeywordIds[review.reviewId]?.includes(keyword)),
    )
    return HttpResponse.json(pageOf(reviews, url.searchParams))
  }),
]
