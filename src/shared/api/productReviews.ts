import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { apiClient } from './client'
import { queryKeyPrefix } from './queryKeys'
import type { ProductPage, ProductReview, ProductReviewKeywords } from './types'

// 상품 리뷰 목록·키워드(공개 API). 구매자 상품 상세(products)와 판매자 리뷰 분석(seller)이 같이 써서 shared로 올렸다(ADR-0003).
// 키는 [reviews, 'product', productId, ...]라 리뷰를 쓰거나 지운 쪽이 [reviews] 접두어로 함께 비운다.

const REVIEW_STALE_TIME = 60_000
export const REVIEW_PAGE_SIZE = 20

export const productReviewKeys = {
  all: [queryKeyPrefix.reviews, 'product'] as const,
  // 접두어 [reviews, 'product', productId, 'list']로 키워드와 상관없이 모두 무효화한다
  list: (productId: number, keyword?: string) =>
    [queryKeyPrefix.reviews, 'product', productId, 'list', keyword ?? null] as const,
  keywords: (productId: number) =>
    [queryKeyPrefix.reviews, 'product', productId, 'keywords'] as const,
  mine: (productId: number, memberId: number) =>
    [queryKeyPrefix.reviews, 'product', productId, 'me', memberId] as const,
}

// GET /api/v1/products/{productId}/reviews?page&size&keyword. 최신순.
// keyword는 리뷰 키워드 ID. 목록에 없는 ID면 400(REVIEW_KEYWORD_NOT_FOUND). undefined는 axios가 보내지 않는다
// TODO(api): 2026-10-18 로컬 서버에는 리뷰 API가 아직 없어 404(No static resource). Bruno 계약대로 연결해 둔다
export async function fetchProductReviews(
  productId: number,
  params: { page: number; size: number; keyword?: string },
): Promise<ProductPage<ProductReview>> {
  const { data } = await apiClient.get<ProductPage<ProductReview>>(
    `/api/v1/products/${productId}/reviews`,
    { params },
  )
  return data
}

// GET /api/v1/products/{productId}/review-keywords. 상품이 없거나 숨겨졌거나 삭제됐으면 404.
// TODO(api): 백엔드 #387. 2026-11-06 dev에 아직 없어 이슈 #10의 계약대로 연결해 둔다
export async function fetchProductReviewKeywords(
  productId: number,
): Promise<ProductReviewKeywords> {
  const { data } = await apiClient.get<ProductReviewKeywords>(
    `/api/v1/products/${productId}/review-keywords`,
  )
  return data
}

// 키워드가 키에 있어 키워드를 바꾸면 다른 목록이 되어 0페이지부터 다시 부른다
export const productReviewsQueryOptions = (productId: number, keyword: string | undefined) =>
  infiniteQueryOptions({
    queryKey: productReviewKeys.list(productId, keyword),
    queryFn: ({ pageParam }) =>
      fetchProductReviews(productId, { page: pageParam, size: REVIEW_PAGE_SIZE, keyword }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    staleTime: REVIEW_STALE_TIME,
  })

export const productReviewKeywordsQueryOptions = (productId: number) =>
  queryOptions({
    queryKey: productReviewKeys.keywords(productId),
    queryFn: () => fetchProductReviewKeywords(productId),
    staleTime: REVIEW_STALE_TIME,
  })
