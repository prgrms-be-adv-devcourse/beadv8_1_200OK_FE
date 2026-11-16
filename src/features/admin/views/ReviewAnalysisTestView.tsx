import { Alert, Button, Loader, Select, Stack, Text, Textarea } from '@mantine/core'
import {
  CircleCheck,
  CircleSlash,
  CircleX,
  Frown,
  type LucideIcon,
  Meh,
  Minus,
  Scale,
  Smile,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { ProductOption } from '@/shared/api/types'
import { formatAmount } from '@/shared/lib/format'
import { DisabledReason, PageHeader } from '@/shared/ui'
import { reviewAspectLabels, reviewKeywordAspectLabels, reviewSentimentLabels } from '../labels'
import {
  type AnalysisPanel,
  type AnalyzedKeyword,
  type KeywordAnalysis,
  ReviewAspect,
  ReviewSentiment,
  type SentimentAnalysis,
} from '../types'
import classes from './ReviewAnalysisTestView.module.css'

// M-04 리뷰 분석 테스트 /admin/review-analysis-test. 리뷰를 남기지 않고 본문 하나의 키워드 · 감성 분석을 바로 본다.
// 운영 분석과 같은 입력이 되도록 실제 상품 · 옵션을 고른다. 별점 · 사진은 받지 않는다.

export const REVIEW_CONTENT_MAX = 2000

export type ProductChoice = { productId: number; name: string }

export type ReviewAnalysisTestViewProps = {
  products:
    | { status: 'pending' }
    | { status: 'error'; message: string; onRetry: () => void }
    | { status: 'success'; items: ProductChoice[]; truncated: boolean }
  productId: number | null
  onProductChange: (productId: number | null) => void
  /** 고른 상품의 옵션. 상품을 고르기 전이면 idle */
  options:
    | { status: 'idle' }
    | { status: 'pending' }
    | { status: 'error'; message: string }
    | { status: 'success'; items: ProductOption[] }
  optionId: number | null
  onOptionChange: (optionId: number) => void
  content: string
  onContentChange: (content: string) => void
  onAnalyze: () => void
  keywords: AnalysisPanel<KeywordAnalysis>
  sentiment: AnalysisPanel<SentimentAnalysis>
}

const NOT_ANALYZED = '내용 없는 리뷰라 분석하지 않았어요'

function analyzeBlocker({ productId, optionId, content }: ReviewAnalysisTestViewProps) {
  if (productId === null) return '상품을 골라 주세요'
  if (optionId === null) return '옵션을 골라 주세요'
  if (content.trim() === '') return '리뷰 본문을 입력해 주세요'
  return null
}

export function ReviewAnalysisTestView(props: ReviewAnalysisTestViewProps) {
  const { products, productId, options, optionId, content, keywords, sentiment } = props
  const blocker = analyzeBlocker(props)
  const analyzing = keywords.status === 'pending' || sentiment.status === 'pending'

  return (
    <div className={classes.root}>
      <PageHeader title="리뷰 분석 테스트" hideOnMobile />
      <Text c="dimmed" fz="sm">
        리뷰를 남기지 않고 본문 하나가 어떻게 분석되는지 확인해요. 별점과 사진은 받지 않아요.
      </Text>

      <form
        className={classes.form}
        aria-label="분석할 리뷰"
        onSubmit={(event) => {
          event.preventDefault()
          if (!blocker && !analyzing) props.onAnalyze()
        }}
      >
        <div className={classes.pickers}>
          <Select
            label="상품"
            placeholder={
              products.status === 'pending' ? '상품을 불러오는 중이에요' : '상품 이름으로 찾기'
            }
            searchable
            clearable
            nothingFoundMessage="이름이 맞는 상품이 없어요"
            data={
              products.status === 'success'
                ? products.items.map((p) => ({ value: String(p.productId), label: p.name }))
                : []
            }
            value={productId === null ? null : String(productId)}
            onChange={(value) => props.onProductChange(value === null ? null : Number(value))}
            disabled={products.status !== 'success'}
            error={products.status === 'error' ? products.message : undefined}
            description={
              products.status === 'success' && products.truncated
                ? '상품이 많아 최근 등록한 100개만 목록에 보여요'
                : undefined
            }
          />
          {products.status === 'error' && (
            <Button variant="default" onClick={products.onRetry} className={classes.retry}>
              상품 다시 불러오기
            </Button>
          )}
          <Select
            label="옵션"
            placeholder={
              options.status === 'pending' ? '옵션을 불러오는 중이에요' : '상품을 먼저 골라 주세요'
            }
            data={
              options.status === 'success'
                ? options.items.map((o) => ({ value: String(o.optionId), label: o.name }))
                : []
            }
            value={optionId === null ? null : String(optionId)}
            onChange={(value) => value !== null && props.onOptionChange(Number(value))}
            allowDeselect={false}
            disabled={options.status !== 'success'}
            error={options.status === 'error' ? options.message : undefined}
          />
        </div>

        <Textarea
          label="리뷰 본문"
          placeholder="예: 달고 아삭해요. 포장도 꼼꼼했어요"
          autosize
          minRows={4}
          maxRows={12}
          maxLength={REVIEW_CONTENT_MAX}
          value={content}
          onChange={(event) => props.onContentChange(event.currentTarget.value)}
          description={`${formatAmount(content.length)} / ${formatAmount(REVIEW_CONTENT_MAX)}자`}
        />

        <DisabledReason reason={blocker}>
          <Button type="submit" disabled={blocker !== null} loading={analyzing}>
            분석
          </Button>
        </DisabledReason>
      </form>

      <div className={classes.panels}>
        <ResultPanel title="키워드" panel={keywords}>
          {(data) => <KeywordResult data={data} />}
        </ResultPanel>
        <ResultPanel title="감성" panel={sentiment}>
          {(data) => <SentimentResult data={data} />}
        </ResultPanel>
      </div>
    </div>
  )
}

function ResultPanel<T>({
  title,
  panel,
  children,
}: {
  title: string
  panel: AnalysisPanel<T>
  children: (data: T) => ReactNode
}) {
  return (
    <section className={classes.panel} aria-label={`${title} 분석 결과`}>
      <h2 className={classes.panelTitle}>{title}</h2>
      {panel.status === 'idle' && (
        <Text c="dimmed" fz="sm">
          분석을 누르면 결과가 여기에 나와요
        </Text>
      )}
      {panel.status === 'pending' && (
        <div className={classes.pending} role="status">
          <Loader size="sm" />
          분석하는 중이에요
        </div>
      )}
      {panel.status === 'error' && (
        <Alert color="red" icon={<CircleX size={20} aria-hidden="true" />} role="alert">
          {panel.message}
        </Alert>
      )}
      {panel.status === 'success' && children(panel.data)}
    </section>
  )
}

function Meta({ items }: { items: [label: string, value: string][] }) {
  return (
    <dl className={classes.meta}>
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

const byProbability = (a: AnalyzedKeyword, b: AnalyzedKeyword) => b.probability - a.probability

function KeywordResult({ data }: { data: KeywordAnalysis }) {
  if (!data.analyzed) return <Text fz="sm">{NOT_ANALYZED}</Text>
  // 서버 순서를 믿지 않고 확률 높은 순으로 다시 정렬한다
  const keywords = [...data.keywords].sort(byProbability)
  return (
    <Stack gap="sm">
      <Meta
        items={[
          ['목록 버전', data.keywordVersion],
          ['모델', data.model],
        ]}
      />
      <ul className={classes.keywords} aria-label="키워드 확률 높은 순">
        {keywords.map((keyword) => (
          <KeywordRow key={keyword.keywordId} keyword={keyword} />
        ))}
      </ul>
    </Stack>
  )
}

function KeywordRow({ keyword }: { keyword: AnalyzedKeyword }) {
  return (
    <li className={classes.keyword} data-expressed={keyword.expressed || undefined}>
      <span className={classes.phrase}>{keyword.phrase}</span>
      <span className={classes.aspect}>{reviewKeywordAspectLabels[keyword.aspect]}</span>
      <span className={classes.probability}>{Math.round(keyword.probability * 100)}%</span>
      {keyword.expressed && (
        <span className={classes.expressed}>
          <CircleCheck size={16} aria-hidden="true" />
          표현한 키워드
        </span>
      )}
      {keyword.excludedByTextureRule && (
        <span className={classes.excluded}>
          <CircleSlash size={16} aria-hidden="true" />
          식감 규칙으로 제외
        </span>
      )}
    </li>
  )
}

const sentimentIcons: Record<ReviewSentiment, LucideIcon> = {
  [ReviewSentiment.POSITIVE]: Smile,
  [ReviewSentiment.NEGATIVE]: Frown,
  [ReviewSentiment.NEUTRAL]: Meh,
  [ReviewSentiment.MIXED]: Scale,
  [ReviewSentiment.NOT_MENTIONED]: Minus,
}

function SentimentValue({ value }: { value: ReviewSentiment }) {
  const Icon = sentimentIcons[value]
  return (
    <span className={classes.sentiment} data-sentiment={value}>
      <Icon size={16} aria-hidden="true" />
      {reviewSentimentLabels[value]}
    </span>
  )
}

function SentimentResult({ data }: { data: SentimentAnalysis }) {
  if (!data.analyzed) return <Text fz="sm">{NOT_ANALYZED}</Text>
  return (
    <Stack gap="sm">
      <Meta
        items={[
          ['분류 기준 버전', data.criteriaVersion],
          ['모델', data.model],
        ]}
      />
      <dl className={classes.sentiments}>
        <div className={classes.overall}>
          <dt>전체</dt>
          <dd>
            <SentimentValue value={data.overall} />
          </dd>
        </div>
        {Object.values(ReviewAspect).map((aspect) => (
          <div key={aspect}>
            <dt>{reviewAspectLabels[aspect]}</dt>
            <dd>
              <SentimentValue value={data.aspects[aspect]} />
            </dd>
          </div>
        ))}
      </dl>
    </Stack>
  )
}
