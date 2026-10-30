import { VisuallyHidden } from '@mantine/core'
import { formatAmount } from '@/shared/lib/format'
import classes from './RatingStars.module.css'

// 별점 표시 (읽기 전용). 5점 만점, 별 그림은 0.5 단위 반올림(4.8 → 별 5개), 숫자는 소수 첫째 자리 그대로.
// 보이는 별·숫자는 aria-hidden, 숨긴 문장 “별점 5점 만점에 4.8점, 리뷰 128개”를 함께 둔다.
// 리뷰 rating(1~10)은 toStarRating으로 바꿔서 넘긴다. 리뷰가 0개인 카드는 이 컴포넌트를 그리지 않는다(A-4).

export type RatingStarsProps = {
  /** 5점 만점 평균 */
  value: number
  /** 14 카드·리뷰 항목 · 16 상세 상단 · 20 리뷰 요약 */
  size?: 14 | 16 | 20
  /** stars: 별 5개 + 점수 / compact: 별 1개 + 점수 + (리뷰 수) — 상품 카드 */
  variant?: 'stars' | 'compact'
  reviewCount?: number
  /** 점수 숫자 표시 */
  withValue?: boolean
}

type Fill = 'full' | 'half' | 'empty'

/** 0.5 단위 반올림한 별 5개의 채움 상태 */
export function starFills(value: number): Fill[] {
  const rounded = Math.round(Math.min(Math.max(value, 0), 5) * 2) / 2
  return Array.from({ length: 5 }, (_, i) => {
    if (rounded >= i + 1) return 'full'
    if (rounded >= i + 0.5) return 'half'
    return 'empty'
  })
}

function Star({ fill, size }: { fill: Fill; size: number }) {
  const polygon =
    '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26'
  return (
    <span className={classes.star} data-fill={fill} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={classes.empty}
        aria-hidden="true"
      >
        <polygon points={polygon} />
      </svg>
      {fill !== 'empty' && (
        <span className={classes.fillClip}>
          <svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            className={classes.full}
            aria-hidden="true"
          >
            <polygon points={polygon} />
          </svg>
        </span>
      )}
    </span>
  )
}

export function RatingStars({
  value,
  size = 14,
  variant = 'stars',
  reviewCount,
  withValue = true,
}: RatingStarsProps) {
  const score = value.toFixed(1)
  const sentence = `별점 5점 만점에 ${score}점${reviewCount === undefined ? '' : `, 리뷰 ${formatAmount(reviewCount)}개`}`

  return (
    <span className={classes.root} data-size={size}>
      <span className={classes.stars} aria-hidden="true">
        {variant === 'compact' ? (
          <Star fill="full" size={size} />
        ) : (
          starFills(value).map((fill, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: 별 5개는 자리로만 구분한다
            <Star key={i} fill={fill} size={size} />
          ))
        )}
      </span>
      {withValue && (
        <span className={classes.value} aria-hidden="true">
          {score}
        </span>
      )}
      {variant === 'compact' && reviewCount !== undefined && (
        <span className={classes.count} aria-hidden="true">
          ({formatAmount(reviewCount)})
        </span>
      )}
      <VisuallyHidden>{sentence}</VisuallyHidden>
    </span>
  )
}
