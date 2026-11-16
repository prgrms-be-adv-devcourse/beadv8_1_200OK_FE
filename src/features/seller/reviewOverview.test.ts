import { ReviewAspect, type ReviewSentimentSummary, type SentimentCounts } from '@/shared/api/types'
import { formatRate, type SentimentResult, summarizeSellerSentiments } from './reviewOverview'

const counts = (positive = 0, negative = 0, neutral = 0, mixed = 0): SentimentCounts => ({
  positive,
  negative,
  neutral,
  mixed,
})
const sum = (c: SentimentCounts) => c.positive + c.negative + c.neutral + c.mixed

/** 항목은 넘긴 것만 채우고 나머지는 언급 0 */
function summary(
  overall: SentimentCounts,
  aspects: Partial<Record<ReviewAspect, SentimentCounts>> = {},
): ReviewSentimentSummary {
  return {
    analyzedReviewCount: sum(overall),
    overall,
    aspects: Object.values(ReviewAspect).map((aspect) => {
      const sentiments = aspects[aspect] ?? counts()
      return { aspect, mentionedReviewCount: sum(sentiments), sentiments }
    }),
  }
}

const product = (productId: number) => ({ productId, name: `상품 ${productId}` })

function run(entries: [number, SentimentResult][]) {
  return summarizeSellerSentiments(
    entries.map(([id]) => product(id)),
    new Map(entries),
  )
}

const aspectOf = (overview: ReturnType<typeof run>, aspect: ReviewAspect) =>
  overview.aspects.find((a) => a.aspect === aspect)

describe('summarizeSellerSentiments', () => {
  it('상품별 개수를 더해 판매자 전체 · 항목별 값을 만든다', () => {
    const overview = run([
      [1, summary(counts(6, 2, 1, 1), { [ReviewAspect.TASTE]: counts(4, 1, 0, 1) })],
      [2, summary(counts(3, 3, 0, 0), { [ReviewAspect.TASTE]: counts(1, 2, 0, 0) })],
    ])

    expect(overview.productCount).toBe(2)
    expect(overview.analyzedReviewCount).toBe(16)
    expect(overview.overall).toEqual(counts(9, 5, 1, 1))
    expect(aspectOf(overview, ReviewAspect.TASTE)).toEqual({
      aspect: ReviewAspect.TASTE,
      mentioned: 9,
      counts: counts(5, 3, 0, 1),
      negativeRate: 3 / 9,
    })
  })

  it('항목은 응답 순서와 상관없이 맛 · 신선도 · 상품 상태 · 포장 · 배송 · 가격 순이다', () => {
    const shuffled = summary(counts(5), { [ReviewAspect.PRICE]: counts(1) })
    shuffled.aspects.reverse()
    const overview = run([[1, shuffled]])

    expect(overview.aspects.map((a) => a.aspect)).toEqual([
      ReviewAspect.TASTE,
      ReviewAspect.FRESHNESS,
      ReviewAspect.CONDITION,
      ReviewAspect.PACKAGING,
      ReviewAspect.DELIVERY,
      ReviewAspect.PRICE,
    ])
    expect(aspectOf(overview, ReviewAspect.PRICE)?.mentioned).toBe(1)
  })

  it('혼합은 부정에 넣지 않고, 언급 0인 항목의 부정 비율은 없다(null)', () => {
    const overview = run([
      [1, summary(counts(0, 1, 0, 9), { [ReviewAspect.PACKAGING]: counts(0, 1, 0, 9) })],
    ])

    expect(aspectOf(overview, ReviewAspect.PACKAGING)?.negativeRate).toBe(0.1)
    expect(aspectOf(overview, ReviewAspect.TASTE)?.negativeRate).toBeNull()
  })

  it('먼저 볼 항목은 판매자 전체 언급 10개 이상 중 부정 비율이 가장 높은 항목이다', () => {
    const overview = run([
      [
        1,
        summary(counts(20, 5), {
          // 언급 9개라 부정 비율이 더 높아도 후보가 아니다
          [ReviewAspect.PACKAGING]: counts(1, 8),
          [ReviewAspect.TASTE]: counts(8, 2),
          [ReviewAspect.DELIVERY]: counts(6, 4),
        }),
      ],
    ])

    expect(overview.focus?.aspect).toBe(ReviewAspect.DELIVERY)
    expect(overview.focus?.negativeRate).toBe(0.4)
  })

  it('언급 10개는 후보에 들고, 후보가 없거나 부정이 하나도 없으면 먼저 볼 항목이 없다', () => {
    const exactlyTen = run([[1, summary(counts(10), { [ReviewAspect.TASTE]: counts(9, 1) })]])
    expect(exactlyTen.focus?.aspect).toBe(ReviewAspect.TASTE)

    const nine = run([[1, summary(counts(10), { [ReviewAspect.TASTE]: counts(8, 1) })]])
    expect(nine.focus).toBeNull()

    const allPositive = run([[1, summary(counts(10), { [ReviewAspect.TASTE]: counts(10) })]])
    expect(allPositive.focus).toBeNull()
  })

  it('분석 리뷰 5개 미만(0개 포함) 상품은 순위 대신 따로 묶는다. 합계에는 넣는다', () => {
    const overview = run([
      [1, summary(counts(5))],
      [2, summary(counts(3, 1))],
      [3, summary(counts())],
    ])

    expect(overview.ranked.map((row) => row.productId)).toEqual([1])
    expect(overview.thin).toEqual([
      { productId: 2, name: '상품 2', analyzedReviewCount: 4 },
      { productId: 3, name: '상품 3', analyzedReviewCount: 0 },
    ])
    expect(overview.analyzedReviewCount).toBe(9)
  })

  it('상품은 가장 나쁜 항목의 부정 비율 높은 순, 같으면 분석 리뷰 많은 순이다', () => {
    const overview = run([
      [1, summary(counts(10), { [ReviewAspect.TASTE]: counts(9, 1) })],
      [2, summary(counts(6), { [ReviewAspect.PACKAGING]: counts(1, 1) })],
      [3, summary(counts(8))],
      [4, summary(counts(20), { [ReviewAspect.DELIVERY]: counts(1, 1) })],
      [5, summary(counts(6), { [ReviewAspect.PRICE]: counts(0, 0, 3) })],
    ])

    expect(overview.ranked.map((row) => row.productId)).toEqual([4, 2, 1, 5, 3])
    expect(overview.ranked.at(0)?.worst?.aspect).toBe(ReviewAspect.DELIVERY)
    expect(overview.ranked.at(-1)?.worst).toBeNull()
  })

  it('반응을 못 불러온 상품은 실패로 따로 두고 합계에서 뺀다', () => {
    const overview = summarizeSellerSentiments(
      [product(1), product(2), product(3)],
      new Map<number, SentimentResult>([
        [1, summary(counts(5, 1))],
        [2, 'error'],
      ]),
    )

    expect(overview.failed).toEqual([product(2), product(3)])
    expect(overview.productCount).toBe(1)
    expect(overview.analyzedReviewCount).toBe(6)
  })

  it('상품이 없으면 모두 0이고 비율은 없다', () => {
    const overview = run([])

    expect(overview.productCount).toBe(0)
    expect(overview.overall).toEqual(counts())
    expect(overview.aspects.every((a) => a.negativeRate === null)).toBe(true)
    expect(overview.focus).toBeNull()
  })
})

describe('formatRate', () => {
  it('반올림한 퍼센트, 분모가 0이면 – 로 쓴다', () => {
    expect(formatRate(1 / 3)).toBe('33%')
    expect(formatRate(0)).toBe('0%')
    expect(formatRate(null)).toBe('–')
  })
})
