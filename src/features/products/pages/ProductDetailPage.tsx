import { useState, useSyncExternalStore } from 'react'
import { useParams } from 'react-router'
import { getAuthSession, subscribeAuth } from '@/shared/api/authToken'
import { type LoginReason, showToast } from '@/shared/ui'
import { sellerOfProduct } from '../fixtures'
import {
  errorMessageOf,
  isNotFound,
  useMyProductReviews,
  useProduct,
  useProductReviews,
} from '../queries'
import { type DetailStatus, ProductDetailView } from '../views/ProductDetailView'

// B-02 상품 상세 라우트 /products/:productId. 상세 + 리뷰 목록(최신순, 더 보기).
// 로그인했으면 이 상품의 내 리뷰(GET /products/{productId}/reviews/me)를 목록 맨 위에 둔다. ‘내 리뷰’ 표시는 리뷰의 memberId와 토큰의 회원 번호로 판단한다.
// 비회원이 담기를 누르면 로그인 안내 모달을 띄운다. TODO(api): 2-3 담기는 features/cart 공개 hook으로.
// TODO(api): 판매자 정보·관심·팔로우는 API가 없어 fixtures·화면 안 상태 유지.

const asProductId = (value: string | undefined) => {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export function ProductDetailPage() {
  const { productId } = useParams()
  const id = asProductId(productId)
  const product = useProduct(id)
  const reviewCount = product.data?.reviewCount ?? 0
  const reviews = useProductReviews(id ?? 0, id !== null && reviewCount > 0)
  const auth = useSyncExternalStore(subscribeAuth, getAuthSession, getAuthSession)
  const myReviews = useMyProductReviews(
    id ?? 0,
    id !== null && reviewCount > 0 ? auth?.memberId : undefined,
  )
  // TODO(api): 상세 API에 판매자가 없다(📝 GET /sellers/{sellerId}). fixtures 상품만 판매자가 보인다
  const seller = id === null ? undefined : sellerOfProduct(id)
  const [loginPrompt, setLoginPrompt] = useState<LoginReason | null>(null)
  const [liked, setLiked] = useState(false)
  const [following, setFollowing] = useState(false)

  // 내 리뷰는 몇 번째 페이지에 있든 수정·삭제할 수 있게 맨 위에 둔다. 못 불러오면 목록만 그린다
  const mine = myReviews.data ?? []
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
      seller={seller}
      liked={liked}
      following={following}
      reviews={reviewList}
      reviewsStatus={
        reviewCount === 0 || reviews.data ? 'success' : reviews.isError ? 'error' : 'pending'
      }
      reviewsErrorMessage={
        // TODO(api): 리뷰 API가 서버에 없을 때의 404 detail은 Spring 내부 문구라 대신 안내한다
        isNotFound(reviews.error)
          ? '지금은 리뷰를 볼 수 없어요. 잠시 뒤 다시 시도해 주세요.'
          : errorMessageOf(reviews.error)
      }
      onRetryReviews={() => reviews.refetch()}
      hasMoreReviews={reviews.hasNextPage}
      loadingMoreReviews={reviews.isFetchingNextPage}
      onLoadMoreReviews={() => reviews.fetchNextPage()}
      currentMemberId={auth?.memberId}
      onRetry={() => product.refetch()}
      errorMessage={errorMessageOf(product.error)}
      onAddToCart={() => {
        if (!auth) return setLoginPrompt('cart')
        showToast({ message: '장바구니에 담았어요' })
      }}
      loginPrompt={loginPrompt}
      onLoginPromptClose={() => setLoginPrompt(null)}
      onToggleLike={() => {
        setLiked(!liked)
        showToast({ message: liked ? '관심 상품에서 뺐어요' : '관심 상품에 담았어요' })
      }}
      onToggleFollow={() => {
        setFollowing(!following)
        showToast({
          message: following ? '팔로우를 취소했어요' : `${seller?.storeName}을 팔로우했어요`,
        })
      }}
    />
  )
}
