import { MessageSquareText } from 'lucide-react'
import {
  ReviewSentiment,
  type ReviewSentimentSummary,
  type SentimentCounts,
} from '@/shared/api/types'
import { reviewAspectLabels, reviewSentimentLabels } from '@/shared/lib/labels'
import { QueryState } from '@/shared/ui'
import classes from './SellerReviewSentimentView.module.css'

// S-05 상품 수정 화면의 리뷰 감성 집계. ✅ GET /sellers/me/products/{id}/review-sentiments
// 비율은 막대 색과 함께 감성 이름 · 개수 · 퍼센트 문구로 읽힌다. 막대는 장식이라 보조기기에서 숨긴다.

export type SellerReviewSentimentViewProps = {
  status: 'pending' | 'error' | 'success'
  summary?: ReviewSentimentSummary
  errorMessage?: string
  onRetry?: () => void
}

/** 화면 순서. 응답의 소문자 키와 감성 이름(라벨)을 잇는다 */
const sentimentKeys = [
  [ReviewSentiment.POSITIVE, 'positive'],
  [ReviewSentiment.NEGATIVE, 'negative'],
  [ReviewSentiment.NEUTRAL, 'neutral'],
  [ReviewSentiment.MIXED, 'mixed'],
] as const satisfies ReadonlyArray<readonly [ReviewSentiment, keyof SentimentCounts]>

const percentOf = (count: number, total: number) => Math.round((count / total) * 100)

export function SellerReviewSentimentView({
  status,
  summary,
  errorMessage,
  onRetry,
}: SellerReviewSentimentViewProps) {
  const empty = status === 'success' && (!summary || summary.analyzedReviewCount === 0)
  return (
    <section className={classes.root} aria-labelledby="review-sentiments">
      <h2 id="review-sentiments" className={classes.title}>
        리뷰 반응
      </h2>
      <QueryState
        status={empty ? 'empty' : status}
        loadingLabel="리뷰 반응을 불러오고 있어요"
        errorMessage={errorMessage}
        onRetry={onRetry}
        empty={{
          icon: <MessageSquareText />,
          title: '아직 분석한 리뷰가 없어요',
          description: '구매자가 리뷰를 남기면 분석해서 여기에 보여 드려요.',
        }}
      >
        {summary && <Summary summary={summary} />}
      </QueryState>
    </section>
  )
}

function Summary({ summary }: { summary: ReviewSentimentSummary }) {
  return (
    <>
      <p className={classes.help}>
        분석을 마친 리뷰 {summary.analyzedReviewCount}개 기준이에요. 분석 중인 리뷰는 세지 않아요.
      </p>
      <div className={classes.overall}>
        <h3 className={classes.subtitle}>전체</h3>
        <Breakdown counts={summary.overall} total={summary.analyzedReviewCount} />
      </div>
      <ul className={classes.aspects} aria-label="항목별 반응">
        {summary.aspects.map(({ aspect, mentionedReviewCount, sentiments }) => (
          <li key={aspect} className={classes.aspect}>
            <div className={classes.aspectHead}>
              <h3 className={classes.subtitle}>{reviewAspectLabels[aspect]}</h3>
              <span className={classes.mentioned}>언급 {mentionedReviewCount}개</span>
            </div>
            {mentionedReviewCount === 0 ? (
              <p className={classes.help}>이 항목을 말한 리뷰가 없어요</p>
            ) : (
              <Breakdown counts={sentiments} total={mentionedReviewCount} />
            )}
          </li>
        ))}
      </ul>
    </>
  )
}

function Breakdown({ counts, total }: { counts: SentimentCounts; total: number }) {
  return (
    <>
      <div className={classes.bar} aria-hidden="true">
        {sentimentKeys.map(([sentiment, key]) =>
          counts[key] > 0 ? (
            <span
              key={key}
              className={classes.segment}
              data-sentiment={sentiment}
              style={{ flexGrow: counts[key] }}
            />
          ) : null,
        )}
      </div>
      <ul className={classes.legend}>
        {sentimentKeys.map(([sentiment, key]) => (
          <li key={key} className={classes.legendItem}>
            <span className={classes.swatch} data-sentiment={sentiment} aria-hidden="true" />
            <span className={classes.legendLabel}>{reviewSentimentLabels[sentiment]}</span>
            <span>
              {counts[key]}개 · {percentOf(counts[key], total)}%
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
