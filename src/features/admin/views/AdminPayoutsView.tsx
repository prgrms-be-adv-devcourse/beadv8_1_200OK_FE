import {
  Button,
  NativeSelect,
  Pagination,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  VisuallyHidden,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
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
import { payeeIdMissing, rangeErrorOf } from '../payoutFilter'
import type { PayoutFilter, PayoutPayeeFilter } from '../types'
import classes from './AdminPayoutsView.module.css'

// M-03 정산 관리 /admin/payouts, 상세 /admin/payouts/:payoutId (목록 위 모달). 시안: admin/AdminSettlements
// 정산 실행 · 1건 정산 · 정산 조정 · 전체 정산(받는 사람 · 완료일 필터, 상세 모달).
// 목록 API는 정산 금액만 준다 → 건수·판매 대금·수수료·배송비 나눔은 상세에서 보여 준다.
// ✅ GET /api/v1/admin/payouts?payeeId&system&from&to&page&size, 상세·항목. 실행 ✅, 1건·조정은 서버 501.
// TODO(api): ❌ 판매자 이름 목록 API 없음 → 받는 사람은 ‘판매자 {회원 번호}’로 보여 주고, 판매자 지정은 회원 번호를 직접 입력한다

export type AdminPayoutsViewProps = {
  run: PayoutRunCardProps
  single: SinglePayoutCardProps
  adjustment: AdjustmentPanelProps
  status: 'pending' | 'error' | 'success'
  payouts: PayoutSummary[]
  filter: PayoutFilter
  onFilterChange: (filter: PayoutFilter) => void
  /** 조건에 맞는 전체 정산 수 (모든 페이지) */
  totalElements: number
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onRetry?: () => void
  /** 목록 오류 문구 (서버 detail) */
  errorMessage?: string
  /** 열린 정산 상세. null이면 닫힘 */
  detail: Omit<PayoutDetailModalProps, 'opened'> | null
  /** 상세 주소 (필터를 주소에 남기려면 바꾼다) */
  getDetailLink?: (payoutId: number) => string
}

const payeeOptions: { value: PayoutPayeeFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'system', label: '플랫폼 수수료' },
  { value: 'seller', label: '판매자 지정' },
]

/** 받는 사람 표시. 시스템 몫은 플랫폼 수수료, 판매자는 회원 번호로 부른다 */
export const payeeNameOf = (payout: Pick<PayoutSummary, 'payeeId' | 'system'>) =>
  payout.system || payout.payeeId === null ? '플랫폼 수수료' : `판매자 ${payout.payeeId}`

export function AdminPayoutsView({
  run,
  single,
  adjustment,
  status,
  payouts,
  filter,
  onFilterChange,
  totalElements,
  page = 1,
  totalPages = 1,
  onPageChange,
  onRetry,
  errorMessage,
  detail,
  getDetailLink = (payoutId) => `/admin/payouts/${payoutId}`,
}: AdminPayoutsViewProps) {
  const rangeError = rangeErrorOf(filter)
  const needPayeeId = payeeIdMissing(filter)
  const detailLabel = (payout: PayoutSummary) =>
    `정산 ${payout.payoutId} ${payeeNameOf(payout)} 상세 보기`
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
              value={filter.payee}
              onChange={(e) =>
                onFilterChange({ ...filter, payee: e.currentTarget.value as PayoutPayeeFilter })
              }
              data={payeeOptions}
            />
            {filter.payee === 'seller' && (
              <TextInput
                className={classes.payee}
                label="판매자 회원 번호"
                placeholder="예: 7"
                inputMode="numeric"
                classNames={{ input: 'pd-num' }}
                value={filter.payeeId}
                onChange={(e) => onFilterChange({ ...filter, payeeId: e.currentTarget.value })}
                description={
                  needPayeeId ? '회원 번호를 입력하면 그 판매자 정산만 보여요' : undefined
                }
              />
            )}
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

        {!rangeError && !needPayeeId && (
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
            errorMessage={errorMessage}
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
                      <Table.Td className={classes.strong}>{payeeNameOf(payout)}</Table.Td>
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
                      <strong>{payeeNameOf(payout)}</strong>
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
