import {
  ReviewAspect,
  type ReviewSentimentSummary,
  type SellerProductSummary,
  type SentimentCounts,
} from '@/shared/api/types'

// S-10 리뷰 분석: 상품별 감성 집계(개수)를 판매자 전체로 더하고, 먼저 볼 항목과 상품 순서를 정한다.
// 개수를 더하므로 판매자 전체 값이 정확하다. 키워드는 상품별 상위 10개만 와서 더하면 틀리므로 여기서 다루지 않는다.
// TODO(api): 판매자 전체 요약 API가 생기면 이 합산을 걷어낸다.

/** 이보다 분석 리뷰가 적은 상품은 비율이 흔들려 순위에 넣지 않고 따로 묶는다 */
export const MIN_ANALYZED_REVIEWS = 5
/** 판매자 전체에서 이만큼 언급된 항목만 ‘먼저 볼 항목’ 후보가 된다 */
export const MIN_MENTIONS_FOR_FOCUS = 10

export const ASPECT_ORDER: readonly ReviewAspect[] = Object.values(ReviewAspect)

export type AspectStat = {
  aspect: ReviewAspect
  mentioned: number
  counts: SentimentCounts
  /** negative / mentioned. 혼합(mixed)은 부정에 넣지 않는다. 언급 0이면 null */
  negativeRate: number | null
}

export type ProductRef = Pick<SellerProductSummary, 'productId' | 'name'>

export type ProductRow = ProductRef & {
  analyzedReviewCount: number
  aspects: AspectStat[]
  /** 부정 비율이 가장 높은 항목. 언급된 항목이 없으면 null */
  worst: AspectStat | null
}

export type ThinProduct = ProductRef & { analyzedReviewCount: number }

export type ReviewOverview = {
  /** 반응을 불러온 상품 수(실패 제외) */
  productCount: number
  analyzedReviewCount: number
  overall: SentimentCounts
  aspects: AspectStat[]
  /** 언급 MIN_MENTIONS_FOR_FOCUS개 이상 항목 중 부정 비율 최대. 부정이 하나도 없으면 null */
  focus: AspectStat | null
  /** 분석 리뷰 MIN_ANALYZED_REVIEWS개 이상. 가장 나쁜 항목의 부정 비율 높은 순 */
  ranked: ProductRow[]
  /** 분석 리뷰가 모자란 상품(0개 포함) */
  thin: ThinProduct[]
  failed: ProductRef[]
}

export type SentimentResult = ReviewSentimentSummary | 'error'

const zeroCounts = (): SentimentCounts => ({ positive: 0, negative: 0, neutral: 0, mixed: 0 })

const addCounts = (a: SentimentCounts, b: SentimentCounts): SentimentCounts => ({
  positive: a.positive + b.positive,
  negative: a.negative + b.negative,
  neutral: a.neutral + b.neutral,
  mixed: a.mixed + b.mixed,
})

const toStat = (aspect: ReviewAspect, mentioned: number, counts: SentimentCounts): AspectStat => ({
  aspect,
  mentioned,
  counts,
  negativeRate: mentioned === 0 ? null : counts.negative / mentioned,
})

/** 응답 순서를 믿지 않고 항목 이름으로 찾아 ASPECT_ORDER로 맞춘다 */
function aspectStatsOf(summary: ReviewSentimentSummary): AspectStat[] {
  return ASPECT_ORDER.map((aspect) => {
    const found = summary.aspects.find((a) => a.aspect === aspect)
    return toStat(aspect, found?.mentionedReviewCount ?? 0, found?.sentiments ?? zeroCounts())
  })
}

/** 부정 비율 최대 항목. 같으면 ASPECT_ORDER 앞쪽 */
function worstOf(stats: AspectStat[]): AspectStat | null {
  let worst: AspectStat | null = null
  for (const stat of stats) {
    if (stat.negativeRate === null) continue
    if (worst === null || stat.negativeRate > (worst.negativeRate ?? -1)) worst = stat
  }
  return worst
}

export function summarizeSellerSentiments(
  products: readonly ProductRef[],
  results: ReadonlyMap<number, SentimentResult>,
): ReviewOverview {
  const loaded: { product: ProductRef; summary: ReviewSentimentSummary }[] = []
  const failed: ProductRef[] = []
  for (const product of products) {
    const result = results.get(product.productId)
    if (result === undefined || result === 'error') failed.push(product)
    else loaded.push({ product, summary: result })
  }

  const rows: ProductRow[] = loaded.map(({ product, summary }) => {
    const aspects = aspectStatsOf(summary)
    return {
      productId: product.productId,
      name: product.name,
      analyzedReviewCount: summary.analyzedReviewCount,
      aspects,
      worst: worstOf(aspects),
    }
  })

  const aspects = ASPECT_ORDER.map((aspect) => {
    const stats = rows.flatMap((row) => row.aspects.filter((a) => a.aspect === aspect))
    return toStat(
      aspect,
      stats.reduce((sum, stat) => sum + stat.mentioned, 0),
      stats.reduce((sum, stat) => addCounts(sum, stat.counts), zeroCounts()),
    )
  })

  const focusCandidate = worstOf(aspects.filter((a) => a.mentioned >= MIN_MENTIONS_FOR_FOCUS))

  const ranked = rows
    .filter((row) => row.analyzedReviewCount >= MIN_ANALYZED_REVIEWS)
    .sort(
      (a, b) =>
        (b.worst?.negativeRate ?? -1) - (a.worst?.negativeRate ?? -1) ||
        b.analyzedReviewCount - a.analyzedReviewCount,
    )

  return {
    productCount: loaded.length,
    analyzedReviewCount: loaded.reduce((sum, { summary }) => sum + summary.analyzedReviewCount, 0),
    overall: loaded.reduce((sum, { summary }) => addCounts(sum, summary.overall), zeroCounts()),
    aspects,
    focus: focusCandidate && focusCandidate.counts.negative > 0 ? focusCandidate : null,
    ranked,
    thin: rows
      .filter((row) => row.analyzedReviewCount < MIN_ANALYZED_REVIEWS)
      .map(({ productId, name, analyzedReviewCount }) => ({
        productId,
        name,
        analyzedReviewCount,
      })),
    failed,
  }
}

/** 0.4 → '40%', null → '–' */
export const formatRate = (rate: number | null) =>
  rate === null ? '–' : `${Math.round(rate * 100)}%`

/** S-10 화면 상태. 상품 목록을 못 받으면 error, 상품별 반응이 다 끝날 때까지 pending */
export type ReviewOverviewState =
  | { status: 'pending' }
  | { status: 'error'; errorMessage?: string; onRetry: () => void }
  | {
      status: 'success'
      overview: ReviewOverview
      /** 못 불러온 상품의 반응만 다시 받는다 */
      onRetryFailed: () => void
      retryingFailed: boolean
    }
