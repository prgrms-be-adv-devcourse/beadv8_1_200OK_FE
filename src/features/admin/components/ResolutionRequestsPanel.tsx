import { Pagination, Skeleton, Stack, Text, TextInput } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { History } from 'lucide-react'
import { formatAmount } from '@/shared/lib/format'
import { QueryState } from '@/shared/ui'
import { adminIdInputError } from '../blockedOrderFilter'
import { rangeErrorOf } from '../payoutFilter'
import type { ResolutionRequest, ResolutionRequestFilter } from '../types'
import classes from '../views/PayoutReviewViews.module.css'
import { RequestItem } from './ResolutionHistoryModal'

// 해결 기록 전체 목록: 기간 안에 ‘다시 처리’로 푼 해결 요청 1번 = 1줄, 해결 시각 최신순.
// ✅ GET /api/v1/admin/payouts/resolution-requests?from&to&adminId&page&size. 기간 필수 · 최대 1년(해결 시각 기준).
// 해결됨(RESOLVED) 줄은 다음 정산 실행이 끝나면 막힌 주문 목록에서 빠져서, 지난 해결은 여기서 돌아본다.
// 관리자 이름과 막혔던 이유는 응답에 없다 → 회원 번호로 보여 주고, 이유는 ‘주문 기록 보기’(주문별 해결 기록)에서 본다.

export type ResolutionRequestsPanelProps = {
  filter: ResolutionRequestFilter
  onFilterChange: (filter: ResolutionRequestFilter) => void
  status: 'pending' | 'error' | 'success'
  errorMessage?: string
  onRetry?: () => void
  rows: ResolutionRequest[]
  totalElements: number
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  /** 그 주문의 해결 기록(실패 기록별)을 연다 */
  onShowOrder: (orderId: number) => void
}

export function ResolutionRequestsPanel({
  filter,
  onFilterChange,
  status,
  errorMessage,
  onRetry,
  rows,
  totalElements,
  page = 1,
  totalPages = 1,
  onPageChange,
  onShowOrder,
}: ResolutionRequestsPanelProps) {
  const rangeError = rangeErrorOf(filter)
  const adminError = adminIdInputError(filter.adminId)

  return (
    <section className={classes.panel} aria-labelledby="resolution-requests-title">
      <div className={classes.panelHead}>
        <h2 id="resolution-requests-title" className={classes.title}>
          해결 기록
        </h2>
        <Text className={classes.desc}>
          기간 안에 관리자가 ‘해결’로 다시 처리한 기록이에요. 해결한 주문은 다음 정산 실행이 끝나면
          막힌 주문 목록에서 빠져서 여기서 돌아봐요.
        </Text>
      </div>

      <div className={classes.filters}>
        <DatePickerInput
          className={classes.dateInput}
          label="해결일 시작"
          value={filter.from}
          onChange={(value) => value && onFilterChange({ ...filter, from: value })}
          valueFormat="YYYY.MM.DD"
          error={rangeError}
        />
        <DatePickerInput
          className={classes.dateInput}
          label="해결일 끝"
          value={filter.to}
          onChange={(value) => value && onFilterChange({ ...filter, to: value })}
          valueFormat="YYYY.MM.DD"
        />
        <TextInput
          className={classes.orderSearchInput}
          label="관리자 회원 번호"
          placeholder="비우면 전체"
          inputMode="numeric"
          classNames={{ input: 'pd-num' }}
          value={filter.adminId}
          onChange={(e) => onFilterChange({ ...filter, adminId: e.currentTarget.value })}
          error={adminError}
        />
      </div>

      {!rangeError && !adminError && (
        <QueryState
          status={status === 'success' && rows.length === 0 ? 'empty' : status}
          skeleton={
            <Stack gap="sm" p="md">
              <Skeleton h={120} radius="md" />
              <Skeleton h={120} radius="md" />
            </Stack>
          }
          loadingLabel="해결 기록을 불러오고 있어요"
          onRetry={onRetry}
          errorMessage={errorMessage}
          empty={{
            icon: <History />,
            title: '기간 안에 해결한 기록이 없어요',
            description: '기간이나 관리자 회원 번호를 바꿔 보세요.',
          }}
        >
          <ul className={classes.list} aria-label="해결 기록 전체 목록">
            {rows.map((row) => (
              <RequestItem key={row.resolutionRequestId} row={row} onShowOrder={onShowOrder} />
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
          <Text className={`pd-num ${classes.sum}`}>해결 요청 {formatAmount(totalElements)}건</Text>
        </QueryState>
      )}
    </section>
  )
}
