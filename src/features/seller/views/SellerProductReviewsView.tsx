import { Button, Chip, Skeleton, Stack } from '@mantine/core'
import { EyeOff, MessageSquareText, PencilLine } from 'lucide-react'
import { Link } from 'react-router'
import type { ProductReview, ReviewKeyword } from '@/shared/api/types'
import { formatAmount, formatDate } from '@/shared/lib/format'
import { toStarRating } from '@/shared/lib/rating'
import { PageHeader, QueryState, RatingStars } from '@/shared/ui'
import classes from './SellerProductReviewsView.module.css'
import {
  SellerReviewSentimentView,
  type SellerReviewSentimentViewProps,
} from './SellerReviewSentimentView'

// S-11 상품 리뷰 분석 /seller/reviews/:productId. 감성 집계 · 리뷰 키워드 · 리뷰 목록(최신순, 키워드로 거르기).
// 키워드·리뷰 목록은 구매자 공개 API라 숨긴 상품이면 404 → 오류 대신 안내 문구를 보인다.

/** hidden = 숨긴 상품이라 공개 API로 볼 수 없음 */
type SectionStatus = 'pending' | 'error' | 'success' | 'hidden'

export type SellerProductReviewsViewProps = {
  productId: number
  productName: string
  sentiments: SellerReviewSentimentViewProps
  keywordStatus: SectionStatus
  keywords: ReviewKeyword[]
  selectedKeywordId?: string
  /** 고른 칩을 다시 누르면 undefined로 선택을 푼다 */
  onSelectKeyword: (keywordId: string | undefined) => void
  reviewStatus: SectionStatus
  reviews: ReviewProps[]
  reviewTotal?: number
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  reviewErrorMessage?: string
  onRetryReviews?: () => void
}

type ReviewProps = Pick<
  ProductReview,
  'reviewId' | 'rating' | 'optionName' | 'content' | 'media' | 'createdAt'
>

export function SellerProductReviewsView({
  productId,
  productName,
  sentiments,
  keywordStatus,
  keywords,
  selectedKeywordId,
  onSelectKeyword,
  reviewStatus,
  reviews,
  reviewTotal,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  reviewErrorMessage,
  onRetryReviews,
}: SellerProductReviewsViewProps) {
  return (
    <div className={classes.root}>
      <PageHeader
        title={productName}
        hideOnMobile
        breadcrumbs={[{ label: '리뷰 분석', to: '/seller/reviews' }, { label: productName }]}
      />
      <div className={classes.productBar}>
        <strong className={classes.mobileName}>{productName}</strong>
        <Button
          component={Link}
          to={`/seller/products/${productId}/edit`}
          variant="outline"
          size="sm"
          leftSection={<PencilLine size={16} aria-hidden="true" />}
        >
          상품 수정
        </Button>
      </div>

      <SellerReviewSentimentView {...sentiments} />

      <section className={classes.card} aria-labelledby="review-keywords">
        <h2 id="review-keywords" className={classes.title}>
          리뷰 키워드
        </h2>
        {keywordStatus === 'hidden' ? (
          <HiddenNote>숨긴 상품은 키워드를 볼 수 없어요. 노출로 바꾸면 보여요.</HiddenNote>
        ) : keywordStatus === 'pending' ? (
          <Skeleton h={32} w="60%" />
        ) : keywordStatus === 'error' ? (
          <p className={classes.help}>
            키워드를 불러오지 못했어요. 리뷰 목록은 그대로 볼 수 있어요.
          </p>
        ) : keywords.length === 0 ? (
          <p className={classes.help}>
            아직 키워드가 없어요. 여러 구매자가 같은 장점을 말하면 여기에 모아 보여 드려요.
          </p>
        ) : (
          <>
            <p className={classes.help}>키워드를 누르면 그 키워드를 말한 리뷰만 보여요.</p>
            <fieldset aria-label="리뷰 키워드로 거르기" className={classes.keywords}>
              {keywords.map((keyword) => (
                <Chip
                  key={keyword.keywordId}
                  checked={keyword.keywordId === selectedKeywordId}
                  onChange={() =>
                    onSelectKeyword(
                      keyword.keywordId === selectedKeywordId ? undefined : keyword.keywordId,
                    )
                  }
                >
                  {keyword.phrase}{' '}
                  <span className="pd-num">{formatAmount(keyword.reviewCount)}</span>
                </Chip>
              ))}
            </fieldset>
          </>
        )}
      </section>

      <section className={classes.card} aria-labelledby="review-list">
        <h2 id="review-list" className={`pd-num ${classes.title}`}>
          리뷰{reviewTotal !== undefined && ` ${formatAmount(reviewTotal)}`}
        </h2>
        {reviewStatus === 'hidden' ? (
          <HiddenNote>숨긴 상품은 리뷰 목록을 볼 수 없어요. 노출로 바꾸면 보여요.</HiddenNote>
        ) : (
          <QueryState
            status={reviewStatus === 'success' && reviews.length === 0 ? 'empty' : reviewStatus}
            loadingLabel="리뷰를 불러오고 있어요"
            skeleton={
              <Stack gap="sm">
                <Skeleton h={14} w="30%" />
                <Skeleton h={48} />
              </Stack>
            }
            errorMessage={reviewErrorMessage}
            onRetry={onRetryReviews}
            empty={{
              icon: <MessageSquareText />,
              title: selectedKeywordId ? '이 키워드를 말한 리뷰가 없어요' : '아직 리뷰가 없어요',
              layout: 'inline',
            }}
          >
            <ul className={classes.reviews}>
              {reviews.map((review) => (
                <li key={review.reviewId} className={classes.review}>
                  <div className={classes.reviewHead}>
                    <RatingStars value={toStarRating(review.rating)} size={14} />
                    <span className={`pd-num ${classes.help}`}>{formatDate(review.createdAt)}</span>
                  </div>
                  <span className={classes.help}>
                    구매 옵션 · {review.optionName}
                    {review.media.length > 0 && ` · 사진·영상 ${review.media.length}개`}
                  </span>
                  <p className={classes.content}>{review.content}</p>
                </li>
              ))}
            </ul>
            {hasMore && onLoadMore && (
              <Button
                variant="outline"
                className={classes.more}
                loading={loadingMore}
                onClick={onLoadMore}
              >
                리뷰 더 보기
              </Button>
            )}
          </QueryState>
        )}
      </section>
    </div>
  )
}

function HiddenNote({ children }: { children: string }) {
  return (
    <p className={classes.hidden}>
      <EyeOff size={16} aria-hidden="true" />
      {children}
    </p>
  )
}
