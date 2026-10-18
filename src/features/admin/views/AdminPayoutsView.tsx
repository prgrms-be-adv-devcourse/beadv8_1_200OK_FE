import {
  Button,
  NativeSelect,
  Pagination,
  Skeleton,
  Stack,
  Table,
  Text,
  VisuallyHidden,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import dayjs from 'dayjs'
import { Wallet } from 'lucide-react'
import { Link } from 'react-router'
import type { PayoutSummary } from '@/shared/api/types'
import { formatAmount, formatDate, formatPrice } from '@/shared/lib/format'
import {
  PageHeader,
  PayoutDetailModal,
  type PayoutDetailModalProps,
  PriceText,
  QueryState,
} from '@/shared/ui'
import { AdjustmentPanel, type AdjustmentPanelProps } from '../components/AdjustmentPanel'
import { PayoutRunCard, type PayoutRunCardProps } from '../components/PayoutRunCard'
import { SinglePayoutCard, type SinglePayoutCardProps } from '../components/SinglePayoutCard'
import type { Payee, PayeeFilter, PayoutFilter } from '../types'
import classes from './AdminPayoutsView.module.css'

// M-03 정산 관리 /admin/payouts, 상세 /admin/payouts/:payoutId (목록 위 모달). 시안: admin/AdminSettlements
// 정산 실행 · 1건 정산 · 정산 조정 · 전체 정산(받는 사람 · 완료일 필터, 상세 모달).
// 목록 API는 정산 금액만 준다 → 건수·판매 대금·수수료·배송비 나눔은 상세에서 보여 준다.
// ✅ GET /payouts?payeeId&system&from&to (ADMIN), 상세·항목. 실행·1건·조정은 📝

export type AdminPayoutsViewProps = {
  run: PayoutRunCardProps
  single: SinglePayoutCardProps
  adjustment: AdjustmentPanelProps
  status: 'pending' | 'error' | 'success'
  payouts: PayoutSummary[]
  payees: Payee[]
  filter: PayoutFilter
  onFilterChange: (filter: PayoutFilter) => void
  /** 조건에 맞는 전체 정산 수 (모든 페이지) */
  totalElements: number
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onRetry?: () => void
  /** 열린 정산 상세. null이면 닫힘 */
  detail: Omit<PayoutDetailModalProps, 'opened'> | null
  /** 상세 주소 (필터를 주소에 남기려면 바꾼다) */
  getDetailLink?: (payoutId: number) => string
}

/** API 최대 조회 기간 */
const MAX_RANGE_DAYS = 366

function rangeErrorOf({ from, to }: PayoutFilter) {
  if (from > to) return '시작일이 종료일보다 늦어요'
  if (dayjs(to).diff(dayjs(from), 'day') >= MAX_RANGE_DAYS) {
    return '기간은 1년까지 볼 수 있어요. 시작일이나 종료일을 바꿔 주세요'
  }
  return null
}

const payeeValue = (payee: PayeeFilter) => String(payee)
const parsePayee = (value: string): PayeeFilter =>
  value === 'all' || value === 'system' ? value : Number(value)

export function AdminPayoutsView({
  run,
  single,
  adjustment,
  status,
  payouts,
  payees,
  filter,
  onFilterChange,
  totalElements,
  page = 1,
  totalPages = 1,
  onPageChange,
  onRetry,
  detail,
  getDetailLink = (payoutId) => `/admin/payouts/${payoutId}`,
}: AdminPayoutsViewProps) {
  const rangeError = rangeErrorOf(filter)
  const payeeName = (payout: PayoutSummary) =>
    payout.system || payout.payeeId === null
      ? '플랫폼 수수료'
      : (payees.find((p) => p.payeeId === payout.payeeId)?.name ?? `판매자 ${payout.payeeId}`)
  const detailLabel = (payout: PayoutSummary) =>
    `정산 ${payout.payoutId} ${payeeName(payout)} 상세 보기`
  const pageSum = payouts.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className={classes.root}>
      <PageHeader title="정산 관리" hideOnMobile />

      <div className={classes.topGrid}>
        <PayoutRunCard {...run} />
        <SinglePayoutCard {...single} />
      </div>

      <AdjustmentPanel {...adjustment} />

      <section className={classes.list} aria-labelledby="all-payouts-title">
        <div className={classes.listHead}>
          <h2 id="all-payouts-title" className={classes.title}>
            전체 정산
          </h2>
          <div className={classes.filters}>
            <NativeSelect
              className={classes.payee}
              label="받는 사람"
              value={payeeValue(filter.payee)}
              onChange={(e) =>
                onFilterChange({ ...filter, payee: parsePayee(e.currentTarget.value) })
              }
              data={[
                { value: 'all', label: '전체' },
                { value: 'system', label: '플랫폼 수수료' },
                ...payees.map((p) => ({ value: String(p.payeeId), label: p.name })),
              ]}
            />
            <DatePickerInput
              className={classes.date}
              label="완료일 시작"
              value={filter.from}
              onChange={(value) => value && onFilterChange({ ...filter, from: value })}
              valueFormat="YYYY.MM.DD"
              error={rangeError}
            />
            <DatePickerInput
              className={classes.date}
              label="완료일 끝"
              value={filter.to}
              onChange={(value) => value && onFilterChange({ ...filter, to: value })}
              valueFormat="YYYY.MM.DD"
            />
          </div>
        </div>

        {!rangeError && (
          <QueryState
            status={status === 'success' && payouts.length === 0 ? 'empty' : status}
            skeleton={
              <Stack gap="sm" p="md">
                <Skeleton h={52} radius="md" />
                <Skeleton h={52} radius="md" />
                <Skeleton h={52} radius="md" />
              </Stack>
            }
            loadingLabel="정산 목록을 불러오고 있어요"
            onRetry={onRetry}
            empty={{
              icon: <Wallet />,
              title: '조건에 맞는 정산이 없어요',
              description: '받는 사람이나 기간을 바꿔 보세요.',
            }}
          >
            <div className={classes.tableWrap}>
              <Table aria-label="정산 목록">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>완료일</Table.Th>
                    <Table.Th>정산번호</Table.Th>
                    <Table.Th>받는 사람</Table.Th>
                    <Table.Th className={classes.right}>정산 금액</Table.Th>
                    <Table.Th className={classes.actionCol}>
                      <VisuallyHidden>상세</VisuallyHidden>
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {payouts.map((payout) => (
                    <Table.Tr key={payout.payoutId}>
                      <Table.Td className="pd-num">
                        {formatDate(payout.createdAt, 'short')}
                      </Table.Td>
                      <Table.Td className="pd-num">{payout.payoutId}</Table.Td>
                      <Table.Td className={classes.strong}>{payeeName(payout)}</Table.Td>
                      <Table.Td className={`${classes.right} ${classes.strong}`}>
                        <PriceText amount={payout.amount} size="S" />
                      </Table.Td>
                      <Table.Td className={classes.right}>
                        <Button
                          component={Link}
                          to={getDetailLink(payout.payoutId)}
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
                      <strong>{payeeName(payout)}</strong>
                      <span className={`pd-num ${classes.help}`}>
                        {formatDate(payout.createdAt, 'short')} · 정산번호 {payout.payoutId}
                      </span>
                    </div>
                    <PriceText amount={payout.amount} size="M" />
                  </div>
                  <Button
                    component={Link}
                    to={getDetailLink(payout.payoutId)}
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

            <Text className={`pd-num ${classes.sum}`}>
              정산 {formatAmount(totalElements)}건
              {totalPages > 1 ? ' · 이 페이지 합계 ' : ' · 합계 '}
              {formatPrice(pageSum)}
            </Text>
          </QueryState>
        )}
      </section>

      {detail && <PayoutDetailModal opened {...detail} />}
    </div>
  )
}
