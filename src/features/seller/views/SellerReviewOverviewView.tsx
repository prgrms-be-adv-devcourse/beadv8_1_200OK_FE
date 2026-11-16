import { Alert, Badge, Button, Skeleton, Stack, Table, VisuallyHidden } from '@mantine/core'
import { ChevronRight, MessageSquareText, PackagePlus, Sparkles, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { formatAmount } from '@/shared/lib/format'
import { reviewAspectLabels } from '@/shared/lib/labels'
import { EmptyView, PageHeader, QueryState } from '@/shared/ui'
import {
  ASPECT_ORDER,
  type AspectStat,
  formatRate,
  MIN_ANALYZED_REVIEWS,
  MIN_MENTIONS_FOR_FOCUS,
  type ProductRow,
  type ReviewOverview,
  type ReviewOverviewState,
} from '../reviewOverview'
import classes from './SellerReviewOverviewView.module.css'
import { SentimentBreakdown } from './SellerReviewSentimentView'

// S-10 리뷰 분석 /seller/reviews. 내 상품 전체의 리뷰 감성을 합쳐 보여 주고 부정 반응이 큰 상품·항목을 위로 올린다.
// 부정 비율 = 부정 / 언급(혼합은 넣지 않음). 막대는 장식이라 숨기고 값은 문구로 읽힌다. 부정 강조는 색 + 아이콘 + 문구.

export type SellerReviewOverviewViewProps = { state: ReviewOverviewState }

const reviewsOf = (productId: number) => `/seller/reviews/${productId}`

export function SellerReviewOverviewView({ state }: SellerReviewOverviewViewProps) {
  return (
    <div className={classes.root}>
      <PageHeader title="리뷰 분석" hideOnMobile />
      <p className={classes.notice}>
        <Sparkles size={16} aria-hidden="true" />
        AI 분석, 참고용이에요. 분석을 마친 리뷰만 세요.
      </p>
      {state.status === 'success' ? (
        <Overview
          overview={state.overview}
          onRetryFailed={state.onRetryFailed}
          retryingFailed={state.retryingFailed}
        />
      ) : (
        <QueryState
          status={state.status}
          loadingLabel="리뷰 분석을 불러오고 있어요"
          skeleton={
            <Stack gap="md">
              <Skeleton h={120} radius="md" />
              <Skeleton h={200} radius="md" />
              <Skeleton h={240} radius="md" />
            </Stack>
          }
          errorMessage={state.status === 'error' ? state.errorMessage : undefined}
          onRetry={state.status === 'error' ? state.onRetry : undefined}
        />
      )}
    </div>
  )
}

function Overview({
  overview,
  onRetryFailed,
  retryingFailed,
}: {
  overview: ReviewOverview
  onRetryFailed: () => void
  retryingFailed: boolean
}) {
  const partial = overview.failed.length > 0
  const noProducts = overview.productCount === 0 && !partial

  return (
    <Stack gap="md">
      {partial && (
        <Alert
          color="warning"
          icon={<TriangleAlert />}
          title={`상품 ${overview.failed.length}개의 반응을 못 불러왔어요`}
        >
          <Stack gap="xs" align="flex-start">
            <span>{overview.failed.map((product) => product.name).join(', ')}</span>
            <Button variant="outline" size="sm" loading={retryingFailed} onClick={onRetryFailed}>
              다시 시도
            </Button>
          </Stack>
        </Alert>
      )}

      {noProducts ? (
        <EmptyView
          icon={<PackagePlus />}
          title="등록한 상품이 없어요"
          description="상품을 등록하고 리뷰가 모이면 여기서 반응을 볼 수 있어요."
          action={{ label: '상품 등록', to: '/seller/products/new' }}
        />
      ) : overview.analyzedReviewCount === 0 ? (
        <EmptyView
          icon={<MessageSquareText />}
          title="아직 분석한 리뷰가 없어요"
          description="구매자가 리뷰를 남기면 분석해서 여기에 보여 드려요."
        />
      ) : (
        <>
          <Summary overview={overview} partial={partial} />
          {overview.focus && <Focus stat={overview.focus} />}
          <Aspects aspects={overview.aspects} />
          <Products rows={overview.ranked} />
        </>
      )}

      {overview.analyzedReviewCount > 0 && overview.thin.length > 0 && (
        <section className={classes.card} aria-labelledby="review-thin">
          <h2 id="review-thin" className={classes.title}>
            리뷰가 더 모이면 보여요
          </h2>
          <p className={classes.help}>
            분석한 리뷰가 {MIN_ANALYZED_REVIEWS}개보다 적은 상품은 비율이 크게 흔들려 순위에서
            뺐어요.
          </p>
          <ul className={classes.links}>
            {overview.thin.map((product) => (
              <li key={product.productId}>
                <Link to={reviewsOf(product.productId)} className={classes.linkRow}>
                  <span className={classes.name}>{product.name}</span>
                  <span className={`pd-num ${classes.muted}`}>
                    분석 리뷰 {formatAmount(product.analyzedReviewCount)}개
                  </span>
                  <ChevronRight size={18} aria-hidden="true" className={classes.chevron} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Stack>
  )
}

function Summary({ overview, partial }: { overview: ReviewOverview; partial: boolean }) {
  return (
    <section className={classes.card} aria-labelledby="review-summary">
      <div className={classes.head}>
        <h2 id="review-summary" className={classes.title}>
          전체 반응
        </h2>
        {partial && <Badge color="warning">불러온 상품 기준</Badge>}
      </div>
      <p className={`pd-num ${classes.totals}`}>
        분석 리뷰 <strong>{formatAmount(overview.analyzedReviewCount)}개</strong> · 상품{' '}
        <strong>{formatAmount(overview.productCount)}개</strong>
      </p>
      <SentimentBreakdown counts={overview.overall} total={overview.analyzedReviewCount} />
    </section>
  )
}

function Focus({ stat }: { stat: AspectStat }) {
  return (
    <section className={`${classes.card} ${classes.focus}`} aria-labelledby="review-focus">
      <h2 id="review-focus" className={classes.focusLabel}>
        <TriangleAlert size={18} aria-hidden="true" />
        먼저 볼 항목
      </h2>
      <p className={classes.focusValue}>
        {reviewAspectLabels[stat.aspect]} · 부정 {formatRate(stat.negativeRate)}
      </p>
      <p className={`pd-num ${classes.help}`}>
        언급한 리뷰 {formatAmount(stat.mentioned)}개 중 {formatAmount(stat.counts.negative)}개가
        부정이에요. 언급 {MIN_MENTIONS_FOR_FOCUS}개 이상인 항목 중 부정 비율이 가장 높아요.
      </p>
    </section>
  )
}

function Aspects({ aspects }: { aspects: AspectStat[] }) {
  return (
    <section className={classes.card} aria-labelledby="review-aspects">
      <h2 id="review-aspects" className={classes.title}>
        항목별 반응
      </h2>
      <ul className={classes.aspects}>
        {aspects.map((stat) => (
          <li key={stat.aspect} className={classes.aspect}>
            <div className={classes.head}>
              <h3 className={classes.subtitle}>{reviewAspectLabels[stat.aspect]}</h3>
              <span className={`pd-num ${classes.muted}`}>
                언급 {formatAmount(stat.mentioned)}개 · 부정 {formatRate(stat.negativeRate)}
              </span>
            </div>
            {stat.mentioned === 0 ? (
              <p className={classes.help}>이 항목을 말한 리뷰가 없어요</p>
            ) : (
              <SentimentBreakdown counts={stat.counts} total={stat.mentioned} />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Worst({ stat }: { stat: AspectStat | null }) {
  if (!stat?.counts.negative) return <span className={classes.muted}>부정 없음</span>
  return (
    <span className={classes.worst}>
      <TriangleAlert size={16} aria-hidden="true" />
      {reviewAspectLabels[stat.aspect]} 부정 {formatRate(stat.negativeRate)}
    </span>
  )
}

function Products({ rows }: { rows: ProductRow[] }) {
  return (
    <section className={classes.card} aria-labelledby="review-products">
      <h2 id="review-products" className={classes.title}>
        상품별 반응
      </h2>
      {rows.length === 0 ? (
        <p className={classes.help}>
          분석한 리뷰가 {MIN_ANALYZED_REVIEWS}개 이상인 상품이 아직 없어요.
        </p>
      ) : (
        <>
          <p className={classes.help}>
            가장 나쁜 항목의 부정 비율이 높은 순이에요. 항목 칸은 부정 비율이고, 언급이 없으면 –로
            보여요.
          </p>
          <div className={classes.tableWrap}>
            <Table aria-label="상품별 반응" verticalSpacing="sm" className={classes.table}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>상품명</Table.Th>
                  <Table.Th className={classes.right}>분석 리뷰</Table.Th>
                  {ASPECT_ORDER.map((aspect) => (
                    <Table.Th key={aspect} className={classes.right}>
                      {reviewAspectLabels[aspect]}
                      <VisuallyHidden> 부정 비율</VisuallyHidden>
                    </Table.Th>
                  ))}
                  <Table.Th>가장 나쁜 항목</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row) => (
                  <Table.Tr key={row.productId} className={classes.row}>
                    <Table.Td>
                      <Link
                        to={reviewsOf(row.productId)}
                        className={`${classes.name} ${classes.rowLink}`}
                      >
                        {row.name}
                      </Link>
                    </Table.Td>
                    <Table.Td className={`pd-num ${classes.right}`}>
                      {formatAmount(row.analyzedReviewCount)}개
                    </Table.Td>
                    {row.aspects.map((stat) => (
                      <Table.Td key={stat.aspect} className={`pd-num ${classes.right}`}>
                        {formatRate(stat.negativeRate)}
                      </Table.Td>
                    ))}
                    <Table.Td>
                      <Worst stat={row.worst} />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>

          <ul className={`${classes.links} ${classes.mobileList}`} aria-label="상품별 반응">
            {rows.map((row) => (
              <li key={row.productId}>
                <Link to={reviewsOf(row.productId)} className={classes.linkRow}>
                  <span className={classes.itemBody}>
                    <span className={classes.name}>{row.name}</span>
                    <span className={`pd-num ${classes.muted}`}>
                      분석 리뷰 {formatAmount(row.analyzedReviewCount)}개
                    </span>
                    <Worst stat={row.worst} />
                  </span>
                  <ChevronRight size={18} aria-hidden="true" className={classes.chevron} />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
