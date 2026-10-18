import { Badge, Button } from '@mantine/core'
import { Image as ImageIcon, MessageSquareText, Play } from 'lucide-react'
import { Link } from 'react-router'
import { type ProductReview, ReviewMediaType } from '@/shared/api/types'
import { formatAmount, formatDate } from '@/shared/lib/format'
import { toStarRating } from '@/shared/lib/rating'
import { EmptyView, RatingStars } from '@/shared/ui'
import classes from './ReviewSection.module.css'

// 상품 상세의 리뷰: 요약(평균 26 + 별 20 + 리뷰 수) → 목록(최신순) → 더 보기. 리뷰 0개면 “아직 리뷰가 없어요”(A-4)
// 리뷰 별점 rating은 1~10이라 /2로 바꿔 그린다. 작성자 닉네임은 API에 없어 ‘구매자’로 쓴다(TODO(api)).

export type ReviewSectionProps = {
  headingId: string
  averageRating: number
  reviewCount: number
  reviews: ProductReview[]
  /** 내 리뷰 표시(수정·삭제)에 쓰는 로그인 회원 ID */
  currentMemberId?: number
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  onDeleteReview?: (reviewId: number) => void
}

function ReviewMedia({ media }: { media: ProductReview['media'] }) {
  if (media.length === 0) return null
  return (
    <ul className={classes.media} aria-label="첨부">
      {media.map((item, i) => {
        const label = `${item.type === ReviewMediaType.VIDEO ? '리뷰 영상' : '리뷰 사진'} ${i + 1}`
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: 첨부는 순서로 구분한다
          <li key={i} className={classes.mediaItem}>
            {item.type === ReviewMediaType.IMAGE && item.url ? (
              <img src={item.url} alt={label} />
            ) : (
              <span role="img" aria-label={label} className={classes.mediaPlaceholder}>
                {item.type === ReviewMediaType.VIDEO ? (
                  <Play size={20} aria-hidden="true" />
                ) : (
                  <ImageIcon size={20} aria-hidden="true" />
                )}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function ReviewSection({
  headingId,
  averageRating,
  reviewCount,
  reviews,
  currentMemberId,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onDeleteReview,
}: ReviewSectionProps) {
  return (
    <>
      <div className={classes.heading}>
        <h2 id={headingId} className={`pd-num ${classes.title}`}>
          리뷰 {formatAmount(reviewCount)}
        </h2>
        <span className={classes.help}>구매확정한 분만 리뷰를 남길 수 있어요</span>
      </div>

      {reviewCount === 0 ? (
        <div className={`${classes.card} ${classes.emptyCard}`}>
          <EmptyView
            icon={<MessageSquareText />}
            title="아직 리뷰가 없어요"
            description="구매확정 후 첫 리뷰를 남겨 주세요."
          />
        </div>
      ) : (
        <>
          <div className={classes.summary}>
            <span className={`pd-num ${classes.average}`} aria-hidden="true">
              {averageRating.toFixed(1)}
            </span>
            <RatingStars
              value={averageRating}
              size={20}
              withValue={false}
              reviewCount={reviewCount}
            />
            <span className={`pd-num ${classes.help}`} aria-hidden="true">
              리뷰 {formatAmount(reviewCount)}개
            </span>
          </div>

          <div className={classes.card}>
            {reviews.map((review) => {
              const mine = currentMemberId !== undefined && review.memberId === currentMemberId
              return (
                <article key={review.reviewId} className={classes.review}>
                  <div className={classes.reviewHead}>
                    <div className={classes.author}>
                      <strong>구매자</strong>
                      {mine && (
                        <Badge color="neutral" variant="light">
                          내 리뷰
                        </Badge>
                      )}
                      <span className={`pd-num ${classes.help}`}>
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                    {mine && (
                      <div className={classes.mineActions}>
                        <Button
                          component={Link}
                          to={`/reviews/${review.reviewId}/edit`}
                          variant="subtle"
                          size="sm"
                        >
                          수정
                        </Button>
                        {onDeleteReview && (
                          <Button
                            variant="subtle"
                            size="sm"
                            onClick={() => onDeleteReview(review.reviewId)}
                          >
                            삭제
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <RatingStars value={toStarRating(review.rating)} size={14} />
                  <span className={classes.help}>구매 옵션 · {review.optionName}</span>
                  <p className={classes.content}>{review.content}</p>
                  <ReviewMedia media={review.media} />
                </article>
              )
            })}
          </div>

          {hasMore && onLoadMore && (
            <div className={classes.more}>
              <Button variant="outline" loading={loadingMore} onClick={onLoadMore}>
                리뷰 더 보기
              </Button>
            </div>
          )}
        </>
      )}
    </>
  )
}
