import { useState } from 'react'
import { useParams } from 'react-router'
import { isApiError } from '@/shared/api/ApiError'
import { ProductVisibility } from '@/shared/api/types'
import { QueryState } from '@/shared/ui'
import {
  useMyProductReviewSentiments,
  useSellerProductDetail,
  useSellerProductReviewKeywords,
  useSellerProductReviews,
  useSellerReviewOverview,
} from '../queries'
import { SellerProductReviewsView } from '../views/SellerProductReviewsView'
import { SellerReviewOverviewView } from '../views/SellerReviewOverviewView'

// S-10 · S-11 리뷰 분석 라우트 (판매자 센터 청크).
// S-10: ✅ GET /sellers/me/products(전부) + 상품마다 GET /sellers/me/products/{id}/review-sentiments를 합친다.
// S-11: ✅ 상품명·노출은 GET /sellers/me/products/{id}, 감성은 위와 같은 쿼리(캐시 공유),
//   키워드 GET /products/{id}/review-keywords · 리뷰 GET /products/{id}/reviews?keyword(공개 API, 숨긴 상품은 404).

const isNotFound = (error: unknown) => isApiError(error) && error.status === 404

export function SellerReviewsPage() {
  return <SellerReviewOverviewView state={useSellerReviewOverview()} />
}

export function SellerProductReviewsPage() {
  const { productId } = useParams()
  return <ProductReviews key={productId} productId={Number(productId)} />
}

function ProductReviews({ productId }: { productId: number }) {
  const detail = useSellerProductDetail(productId)
  const sentiments = useMyProductReviewSentiments(productId)
  const [keywordId, setKeywordId] = useState<string | undefined>()
  const visible = detail.data?.visibility === ProductVisibility.VISIBLE
  const keywords = useSellerProductReviewKeywords(productId, visible)
  const reviews = useSellerProductReviews(productId, keywordId)

  const missing = (title: string) => (
    <QueryState
      status="notFound"
      notFound={{
        title,
        description: '삭제됐거나 주소가 잘못됐을 수 있어요. 리뷰 분석에서 다시 골라 주세요.',
        action: { label: '리뷰 분석', to: '/seller/reviews' },
      }}
    />
  )
  if (!Number.isInteger(productId)) return missing('상품을 찾을 수 없어요')
  if (detail.isPending) {
    return <QueryState status="pending" loadingLabel="상품 정보를 불러오고 있어요" />
  }
  if (detail.isError) {
    if (detail.error.status === 404) return missing('상품을 찾을 수 없어요')
    if (detail.error.status === 403) return missing('내 상품이 아니라서 볼 수 없어요')
    return (
      <QueryState
        status="error"
        errorMessage={detail.error.detail}
        onRetry={() => void detail.refetch()}
      />
    )
  }

  const reviewsHidden = isNotFound(reviews.error)
  return (
    <SellerProductReviewsView
      productId={productId}
      productName={detail.data.name}
      sentiments={{
        status: sentiments.data ? 'success' : sentiments.isError ? 'error' : 'pending',
        summary: sentiments.data,
        errorMessage: sentiments.error?.detail,
        onRetry: () => void sentiments.refetch(),
      }}
      keywordStatus={
        !visible || isNotFound(keywords.error)
          ? 'hidden'
          : keywords.data
            ? 'success'
            : keywords.isError
              ? 'error'
              : 'pending'
      }
      keywords={keywords.data?.keywords ?? []}
      selectedKeywordId={keywordId}
      onSelectKeyword={setKeywordId}
      reviewStatus={
        reviewsHidden ? 'hidden' : reviews.data ? 'success' : reviews.isError ? 'error' : 'pending'
      }
      reviews={reviews.data?.pages.flatMap((page) => page.content) ?? []}
      reviewTotal={reviews.data?.pages[0]?.totalElements}
      hasMore={reviews.hasNextPage}
      loadingMore={reviews.isFetchingNextPage}
      onLoadMore={() => void reviews.fetchNextPage()}
      reviewErrorMessage={isApiError(reviews.error) ? reviews.error.detail : undefined}
      onRetryReviews={() => void reviews.refetch()}
    />
  )
}
