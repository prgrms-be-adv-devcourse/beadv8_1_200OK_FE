import dayjs from 'dayjs'
import type { AdminPayoutListParams } from '@/shared/api/types'
import { dayRangeToServer, recentDays } from '@/shared/lib/dateRange'
import type { PayoutFilter } from './types'

// 정산 목록 필터(화면 값) ↔ GET /admin/payouts 파라미터. 화면과 쿼리가 같이 쓴다.

export const PAYOUT_PAGE_SIZE = 20

/** API 최대 조회 기간 */
const MAX_RANGE_DAYS = 366

export const defaultPayoutFilter = (): PayoutFilter => ({
  payee: 'all',
  payeeId: '',
  ...recentDays(30),
})

export function rangeErrorOf({ from, to }: Pick<PayoutFilter, 'from' | 'to'>) {
  if (from > to) return '시작일이 종료일보다 늦어요'
  if (dayjs(to).diff(dayjs(from), 'day') >= MAX_RANGE_DAYS) {
    return '기간은 1년까지 볼 수 있어요. 시작일이나 종료일을 바꿔 주세요'
  }
  return null
}

const isMemberId = (value: string) => /^\d+$/.test(value.trim())

/** 판매자 지정인데 회원 번호가 아직 없으면 조회하지 않는다 */
export const payeeIdMissing = (filter: PayoutFilter) =>
  filter.payee === 'seller' && !isMemberId(filter.payeeId)

/** 기간 · 받는 사람이 모두 갖춰져 조회할 수 있는지 */
export const canQueryPayouts = (filter: PayoutFilter) =>
  rangeErrorOf(filter) === null && !payeeIdMissing(filter)

/** 완료일(포함~포함) → from(포함)·to(미포함, 다음 날 0시). 전체면 payeeId·system 생략 */
export function toAdminPayoutParams(filter: PayoutFilter, page: number): AdminPayoutListParams {
  const { from, to } = dayRangeToServer(filter.from, filter.to)
  return {
    from,
    to,
    page,
    size: PAYOUT_PAGE_SIZE,
    system: filter.payee === 'system' ? true : undefined,
    payeeId:
      filter.payee === 'seller' && isMemberId(filter.payeeId)
        ? Number(filter.payeeId.trim())
        : undefined,
  }
}
