import { Alert, Button, Pagination, Skeleton, Stack, Table, VisuallyHidden } from '@mantine/core'
import { Info, Wallet } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import type { PayoutSummary } from '@/shared/api/types'
import { PAYOUT_FEE_RATE } from '@/shared/lib/constants'
import { formatAmount, formatDate } from '@/shared/lib/format'
import {
  PageHeader,
  PayoutDetailModal,
  type PayoutDetailModalProps,
  PriceText,
  QueryState,
} from '@/shared/ui'
import type { PayoutOutlook } from '../types'
import classes from './SellerPayoutsView.module.css'

// S-08 정산 내역 /seller/payouts, 상세 /seller/payouts/:payoutId (목록 위 모달). 시안: seller/SellerSettlements, SellerSettlementsMobile
// 요약(정산 예정 금액 · 이번 달 정산 완료 · 다음 정산 예정일) + 목록. 데스크톱 표, 모바일 카드.
// 목록 API는 정산 금액만 준다 → 판매 대금·수수료·배송비 나눔은 상세에서 보여 준다.
// ✅ GET /payouts?payeeId&from&to, GET /payouts/{id}, GET /payouts/{id}/items (임시 헤더)

export type SellerPayoutsViewProps = {
  status: 'pending' | 'error' | 'success'
  payouts: PayoutSummary[]
  /** TODO(api): 정산 예정 금액·다음 정산 예정일 API 없음(❌). null이면 칸을 비워 둔다 */
  outlook: PayoutOutlook | null
  /** 이번 달(month가 속한 달) 정산 완료 합계 */
  monthSummary: { month: string; amount: number; count: number }
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onRetry?: () => void
  /** 목록 오류 문구 (서버 detail) */
  errorMessage?: string
  /** 열린 정산 상세. null이면 닫힘 */
  detail: Omit<PayoutDetailModalProps, 'opened'> | null
}

function Summary({
  outlook,
  monthSummary,
}: Pick<SellerPayoutsViewProps, 'outlook' | 'monthSummary'>) {
  const blank = (
    <>
      <span aria-hidden="true">–</span>
      <VisuallyHidden>정보 없음</VisuallyHidden>
    </>
  )
  return (
    <section className={classes.summary} aria-label="정산 요약">
      <div className={`${classes.stat} ${classes.wide}`}>
        <span className={classes.statLabel}>정산 예정 금액</span>
        <strong className={classes.statValue}>
          {outlook ? <PriceText amount={outlook.expectedAmount} size="L" /> : blank}
        </strong>
        <span className={classes.help}>구매확정됐고 아직 정산 전인 금액</span>
      </div>
      <div className={classes.stat}>
        <span className={classes.statLabel}>이번 달 정산 완료</span>
        <strong className={classes.statValue}>
          <PriceText amount={monthSummary.amount} size="L" />
        </strong>
        <span className={`pd-num ${classes.help}`}>
          {formatDate(monthSummary.month, 'month')} · 정산 {formatAmount(monthSummary.count)}건
        </span>
      </div>
      <div className={classes.stat}>
        <span className={classes.statLabel}>다음 정산 예정일</span>
        <strong className={`pd-num ${classes.statValue}`}>
          {outlook ? formatDate(outlook.nextPayoutDate, 'monthDayWeek') : blank}
        </strong>
        <span className={classes.help}>새벽 2시에 판매자 지갑으로 입금돼요</span>
      </div>
    </section>
  )
}

const detailLabel = (payout: PayoutSummary) =>
  `${formatDate(payout.createdAt, 'monthDay')} 정산 ${payout.payoutId} 상세 보기`

export function SellerPayoutsView({
  status,
  payouts,
  outlook,
  monthSummary,
  page = 1,
  totalPages = 1,
  onPageChange,
  onRetry,
  errorMessage,
  detail,
}: SellerPayoutsViewProps) {
  // 상세를 열어도 목록 쪽(?page=)을 그대로 둔다
  const { search } = useLocation()
  const detailLink = (payout: PayoutSummary) => `/seller/payouts/${payout.payoutId}${search}`

  return (
    <div className={classes.root}>
      <PageHeader title="정산 내역" hideOnMobile />

      <Summary outlook={outlook} monthSummary={monthSummary} />

      <Alert color="info" icon={<Info />}>
        구매확정된 상품만 정산돼요. 매일 새벽 2시에 정산돼요. 정산 금액 = 판매 대금 − 판매 수수료(
        {PAYOUT_FEE_RATE}%) + 배송비
      </Alert>

      <section aria-labelledby="payout-list-title" className={classes.list}>
        <h2 id="payout-list-title" className={classes.sectionTitle}>
          정산 목록
        </h2>
        <QueryState
          status={status === 'success' && payouts.length === 0 ? 'empty' : status}
          skeleton={
            <Stack gap="sm">
              <Skeleton h={52} radius="md" />
              <Skeleton h={52} radius="md" />
              <Skeleton h={52} radius="md" />
            </Stack>
          }
          loadingLabel="정산 내역을 불러오고 있어요"
          onRetry={onRetry}
          errorMessage={errorMessage}
          empty={{
            icon: <Wallet />,
            title: '아직 정산된 내역이 없어요',
            description:
              '구매확정된 상품은 매일 새벽 2시에 정산돼요. 정산되면 이곳에 날짜별로 모여요.',
            action: { label: '주문·출고로 가기', to: '/seller/orders' },
          }}
        >
          <div className={classes.tableWrap}>
            <Table aria-label="정산 목록">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>정산일</Table.Th>
                  <Table.Th>정산번호</Table.Th>
                  <Table.Th className={classes.right}>정산 금액</Table.Th>
                  <Table.Th className={classes.actionCol}>
                    <VisuallyHidden>상세</VisuallyHidden>
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {payouts.map((payout) => (
                  <Table.Tr key={payout.payoutId}>
                    <Table.Td className="pd-num">{formatDate(payout.createdAt)}</Table.Td>
                    <Table.Td className="pd-num">{payout.payoutId}</Table.Td>
                    <Table.Td className={`${classes.right} ${classes.strong}`}>
                      <PriceText amount={payout.amount} size="S" />
                    </Table.Td>
                    <Table.Td className={classes.right}>
                      <Button
                        component={Link}
                        to={detailLink(payout)}
                        variant="subtle"
                        size="sm"
                        aria-label={detailLabel(payout)}
                      >
                        상세
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>

          <ul className={classes.cards} aria-label="정산 목록">
            {payouts.map((payout) => (
              <li key={payout.payoutId} className={classes.card}>
                <div className={classes.cardHead}>
                  <div className={classes.cardTitle}>
                    <strong className="pd-num">{formatDate(payout.createdAt)}</strong>
                    <span className={`pd-num ${classes.help}`}>정산번호 {payout.payoutId}</span>
                  </div>
                  <PriceText amount={payout.amount} size="M" />
                </div>
                <Button
                  component={Link}
                  to={detailLink(payout)}
                  variant="subtle"
                  fullWidth
                  aria-label={detailLabel(payout)}
                >
                  상세 보기
                </Button>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <Pagination
              className={classes.pagination}
              total={totalPages}
              value={page}
              onChange={onPageChange}
              getControlProps={(control) => ({
                'aria-label': control === 'previous' ? '이전 페이지' : '다음 페이지',
              })}
            />
          )}
        </QueryState>
      </section>

      {detail && <PayoutDetailModal opened {...detail} />}
    </div>
  )
}
