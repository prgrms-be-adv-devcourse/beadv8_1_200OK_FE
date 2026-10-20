import { apiClient } from '@/shared/api/client'
import { fetchProductDetail } from '@/shared/api/productDetail'
import type {
  ProductPage,
  ProductReview,
  ProductReviewCreateRequest,
  ProductReviewCreateResponse,
  ProductReviewUpdateRequest,
} from '@/shared/api/types'

// 리뷰 작성·수정·삭제와 내 리뷰 조회(08 Review). 모두 로그인 필요.
// 2026-10-20 로컬 서버(dev)에 리뷰 API가 모두 있다(GET /reviews/me 200 확인).
// 오류: 401 로그인 필요, 403 내 리뷰 아님, 404 상품·옵션·리뷰 없음, 409 이 주문에서 이미 쓴 상품(DUPLICATE_REVIEW),
//   422 검증 실패(errors[].path: rating·content·mediaUrls…) · 업로드하지 않은 첨부 URL · 영상 2개 이상(errors 없이 detail만)

// POST /api/v1/products/{productId}/reviews → 201 { reviewId }
export async function createReview(
  productId: number,
  body: ProductReviewCreateRequest,
): Promise<ProductReviewCreateResponse> {
  const { data } = await apiClient.post<ProductReviewCreateResponse>(
    `/api/v1/products/${productId}/reviews`,
    body,
  )
  return data
}

// PUT /api/v1/reviews/{reviewId} → 204. mediaUrls는 보낸 목록으로 전체 교체(빈 배열이면 첨부 전부 삭제)
export async function updateReview(
  reviewId: number,
  body: ProductReviewUpdateRequest,
): Promise<void> {
  await apiClient.put(`/api/v1/reviews/${reviewId}`, body)
}

// DELETE /api/v1/reviews/{reviewId} → 204
export async function deleteReview(reviewId: number): Promise<void> {
  await apiClient.delete(`/api/v1/reviews/${reviewId}`)
}

// GET /api/v1/reviews/me?page&size → ProductPage<ProductReview>. 최신순(reviewId 내림차순), size 1~100
export async function fetchMyReviews(params: {
  page: number
  size: number
}): Promise<ProductPage<ProductReview>> {
  const { data } = await apiClient.get<ProductPage<ProductReview>>('/api/v1/reviews/me', { params })
  return data
}

const FIND_PAGE_SIZE = 100

/**
 * 내 리뷰 한 건. 단건 조회 API가 없어 내 리뷰 목록을 넘기며 찾는다.
 * 목록이 reviewId 내림차순이라 찾는 번호보다 작은 번호가 나오면 더 보지 않는다. 없으면 null(삭제했거나 내 리뷰 아님).
 * TODO(api): 단건 조회 GET /reviews/{reviewId}가 생기면 바꾼다
 */
export async function findMyReview(reviewId: number): Promise<ProductReview | null> {
  for (let page = 0; ; page += 1) {
    const { content, totalPages } = await fetchMyReviews({ page, size: FIND_PAGE_SIZE })
    const found = content.find((review) => review.reviewId === reviewId)
    if (found) return found
    const last = content.at(-1)
    if (!last || last.reviewId < reviewId || page + 1 >= totalPages) return null
  }
}

// ✅ GET /api/v1/products/{productId}. 리뷰할 상품의 이름·대표 사진·옵션 이름을 보여 줄 때만 쓴다. 숨김·삭제는 404
export const fetchReviewProduct = fetchProductDetail
