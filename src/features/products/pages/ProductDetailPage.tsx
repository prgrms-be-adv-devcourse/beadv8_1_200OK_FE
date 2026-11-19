import { useState, useSyncExternalStore } from 'react'
import { useParams } from 'react-router'
import { useAddToCart } from '@/features/cart'
import { isApiError } from '@/shared/api/ApiError'
import { getAuthSession, subscribeAuth } from '@/shared/api/authToken'
import type { LoginReason } from '@/shared/ui'
import {
  errorMessageOf,
  isNotFound,
  useMyProductReviews,
  useProduct,
  useProductReviewKeywords,
  useProductReviews,
} from '../queries'
import { type DetailStatus, ProductDetailView } from '../views/ProductDetailView'

// B-02 상품 상세 라우트 /products/:productId. 상세 + 리뷰 목록(최신순, 더 보기).
// 리뷰 키워드 칩을 누르면 목록을 그 키워드로 거르고, 다시 누르면 전체 목록으로 돌아간다.
// 로그인했으면 이 상품의 내 리뷰(GET /products/{productId}/reviews/me)를 목록 맨 위에 둔다. ‘내 리뷰’ 표시는 리뷰의 memberId와 토큰의 회원 번호로 판단한다.
// 담기는 features/cart 공개 hook(products → cart 예외). 비회원이면 로그인 안내 모달을 띄운다.
// TODO(api): 📝 판매자 정보(GET /sellers/{sellerId}, 상세에 sellerId 없음)·관심·팔로우 API가 없다.
//   판매자는 넘기지 않고(‘연결 전’ 안내), 관심·팔로우 핸들러도 넘기지 않아 버튼을 막고 이유를 보인다.

const asProductId = (value: string | undefined) => {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export function ProductDetailPage() {
  const { productId } = useParams()
  const id = asProductId(productId)
  const product = useProduct(id)
  const reviewCount = product.data?.reviewCount ?? 0
  // 상품을 옮겨 다니면 이 페이지가 그대로 남으므로, 고른 키워드는 고른 상품에서만 쓴다
  const [keywordSelection, setKeywordSelection] = useState<{
    productId: number
    keywordId: string
  } | null>(null)
  const keywordId =
    keywordSelection !== null && keywordSelection.productId === id
      ? keywordSelection.keywordId
      : undefined
  const reviews = useProductReviews(id ?? 0, keywordId, id !== null && reviewCount > 0)
  // 키워드를 못 불러오면(404 포함) 칩만 빼고 리뷰는 그대로 그린다
  const keywords = useProductReviewKeywords(id ?? 0, id !== null && reviewCount > 0)
  const auth = useSyncExternalStore(subscribeAuth, getAuthSession, getAuthSession)
  const myReviews = useMyProductReviews(
    id ?? 0,
    id !== null && reviewCount > 0 ? auth?.memberId : undefined,
  )
  const { addToCart, adding } = useAddToCart()
  const [loginPrompt, setLoginPrompt] = useState<LoginReason | null>(null)

  // 내 리뷰는 몇 번째 페이지에 있든 수정·삭제할 수 있게 맨 위에 둔다. 못 불러오면 목록만 그린다.
  // 키워드로 거를 때는 내 리뷰가 그 키워드를 표현했는지 모르므로 올리지 않는다
  const mine = keywordId === undefined ? (myReviews.data ?? []) : []
  const mineIds = new Set(mine.map((review) => review.reviewId))
  const reviewList = [
    ...mine,
    ...(reviews.data?.pages.flatMap((page) => page.content) ?? []).filter(
      (review) => !mineIds.has(review.reviewId),
    ),
  ]

  const status: DetailStatus =
    id === null || isNotFound(product.error)
      ? 'notFound'
      : product.data
        ? 'success'
        : product.status

  return (
    <ProductDetailView
      // 옵션 선택 초기값은 상품을 받은 뒤 정해지므로 받기 전·후를 다른 화면으로 그린다
      key={`${id}-${product.data ? 'loaded' : 'loading'}`}
      status={status}
      product={product.data}
      reviews={reviewList}
      reviewsStatus={
        reviewCount === 0 || reviews.data ? 'success' : reviews.isError ? 'error' : 'pending'
      }
      reviewsErrorMessage={
        // TODO(api): 리뷰 API가 서버에 없을 때의 404 detail은 Spring 내부 문구라 대신 안내한다
        isNotFound(reviews.error)
          ? '지금은 리뷰를 볼 수 없어요. 잠시 뒤 다시 시도해 주세요.'
          : // 400은 키워드가 목록에서 빠졌을 때(REVIEW_KEYWORD_NOT_FOUND). 다시 시도해도 같아 선택을 풀게 한다
            keywordId !== undefined && isApiError(reviews.error) && reviews.error.status === 400
            ? '이 리뷰 키워드로는 리뷰를 거르지 못했어요. 키워드 선택을 풀고 전체 리뷰를 봐 주세요.'
            : errorMessageOf(reviews.error)
      }
      onRetryReviews={() => reviews.refetch()}
      hasMoreReviews={reviews.hasNextPage}
      loadingMoreReviews={reviews.isFetchingNextPage}
      onLoadMoreReviews={() => reviews.fetchNextPage()}
      reviewKeywords={keywords.data?.keywords ?? []}
      selectedReviewKeywordId={keywordId}
      onSelectReviewKeyword={(next) =>
        setKeywordSelection(
          next === undefined || id === null ? null : { productId: id, keywordId: next },
        )
      }
      currentMemberId={auth?.memberId}
      onRetry={() => product.refetch()}
      errorMessage={errorMessageOf(product.error)}
      adding={adding}
      onAddToCart={({ optionId, quantity }) => {
        if (!auth) return setLoginPrompt('cart')
        if (id !== null) addToCart({ productId: id, optionId, quantity })
      }}
      loginPrompt={loginPrompt}
      onLoginPromptClose={() => setLoginPrompt(null)}
    />
  )
}
