import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import { queryKeyPrefix } from '@/shared/api/queryKeys'
import type {
  ProductReviewCreateRequest,
  ProductReviewCreateResponse,
  ProductReviewUpdateRequest,
} from '@/shared/api/types'
import { createReview, deleteReview, fetchReviewProduct, findMyReview, updateReview } from './api'

// 리뷰 쿼리 키·훅. 키는 [reviews, ...]로 시작한다(상품 리뷰 목록은 products feature가 [reviews, 'product', …]로 쓴다).
// 쓰기·수정·삭제가 끝나면 두 접두어로 무효화한다: 리뷰 목록·내 리뷰 + 상품의 reviewCount·averageRating

export const reviewKeys = {
  all: [queryKeyPrefix.reviews] as const,
  mine: (reviewId: number) => [queryKeyPrefix.reviews, 'me', reviewId] as const,
  target: (productId: number) => [queryKeyPrefix.reviews, 'target', productId] as const,
}

/** 수정할 내 리뷰. 없으면 data가 null */
export function useMyReview(reviewId: number) {
  return useQuery({
    queryKey: reviewKeys.mine(reviewId),
    queryFn: () => findMyReview(reviewId),
    enabled: Number.isInteger(reviewId) && reviewId > 0,
  })
}

/** 리뷰할 상품의 이름·사진. 실패해도 화면은 그린다(숨긴 상품도 내 리뷰는 고칠 수 있다) */
export function useReviewProduct(productId: number) {
  return useQuery({
    queryKey: reviewKeys.target(productId),
    queryFn: () => fetchReviewProduct(productId),
    staleTime: 60_000,
  })
}

function useInvalidateReviews() {
  const queryClient = useQueryClient()
  // 기다리지 않는다. 삭제 뒤 이 화면의 내 리뷰가 다시 불려 ‘없음’이 잠깐 보이지 않게 먼저 이동한다
  return () => {
    void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.reviews] })
    void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.products] })
  }
}

export function useCreateReview() {
  const invalidate = useInvalidateReviews()
  return useMutation<
    ProductReviewCreateResponse,
    ApiError | Error,
    { productId: number; body: ProductReviewCreateRequest }
  >({
    mutationFn: ({ productId, body }) => createReview(productId, body),
    onSuccess: invalidate,
  })
}

export function useUpdateReview() {
  const invalidate = useInvalidateReviews()
  return useMutation<
    void,
    ApiError | Error,
    { reviewId: number; body: ProductReviewUpdateRequest }
  >({
    mutationFn: ({ reviewId, body }) => updateReview(reviewId, body),
    onSuccess: invalidate,
  })
}

export function useDeleteReview() {
  const invalidate = useInvalidateReviews()
  return useMutation<void, ApiError | Error, number>({
    mutationFn: deleteReview,
    onSuccess: invalidate,
  })
}
