import { dayRangeToServer, recentDays } from '@/shared/lib/dateRange'
import { PayoutBlockStatus } from '@/shared/lib/payoutBlockState'
import { rangeErrorOf } from './payoutFilter'
import type {
  BlockedOrder,
  BlockedOrderFilter,
  BlockedOrderParams,
  ResolutionRequestFilter,
  ResolutionRequestParams,
} from './types'

// 막힌 주문 목록 조건(주소 ?status=&orderId=) ↔ API 파라미터, 해결 기록 전체 목록 조건 검사.
// 화면(views)과 페이지·쿼리가 같이 쓴다.

export const BLOCKED_ORDER_PAGE_SIZE = 20
export const RESOLUTION_REQUEST_PAGE_SIZE = 20

export const ALL_BLOCK_STATUSES = Object.values(PayoutBlockStatus)

const isPositiveId = (value: string) => /^\d+$/.test(value.trim()) && Number(value.trim()) > 0

/** 주소 → 조건. status가 없거나 모르는 값뿐이면 셋 다 */
export function parseBlockedOrderFilter(params: URLSearchParams): BlockedOrderFilter {
  const picked = params.getAll('status')
  const statuses = ALL_BLOCK_STATUSES.filter((s) => picked.includes(s))
  const rawOrderId = params.get('orderId') ?? ''
  return {
    statuses: statuses.length > 0 ? statuses : ALL_BLOCK_STATUSES,
    orderId: isPositiveId(rawOrderId) ? Number(rawOrderId) : null,
  }
}

/** 조건 → 주소. 셋 다 고른 상태는 적지 않는다 */
export function blockedOrderSearch(filter: BlockedOrderFilter, page = 1): URLSearchParams {
  const params = new URLSearchParams()
  if (filter.orderId !== null) params.set('orderId', String(filter.orderId))
  if (filter.statuses.length < ALL_BLOCK_STATUSES.length) {
    for (const status of filter.statuses) params.append('status', status)
  }
  if (page > 1) params.set('page', String(page))
  return params
}

/** 조건 → API. 주문 번호로 찾을 때는 상태 조건을 붙이지 않는다(어떤 상태든 그 주문을 찾는다) */
export function toBlockedOrderParams(filter: BlockedOrderFilter, page: number): BlockedOrderParams {
  if (filter.orderId !== null) {
    return { orderId: filter.orderId, page, size: BLOCKED_ORDER_PAGE_SIZE }
  }
  const partial = filter.statuses.length < ALL_BLOCK_STATUSES.length
  return {
    status: partial ? filter.statuses : undefined,
    page,
    size: BLOCKED_ORDER_PAGE_SIZE,
  }
}

/** 주문 번호 입력값 검사. 비었으면 null(전체 보기) */
export function orderIdInputError(value: string): string | null {
  if (!value.trim()) return null
  return isPositiveId(value) ? null : '주문 번호는 1 이상의 숫자로 입력해 주세요'
}

/** 금액·수수료 불일치가 있으면 조정이 필요할 수 있다 (그 밖의 사유는 조정하지 않고 원인을 확인한 뒤 해결) */
export const needsAdjustment = (order: Pick<BlockedOrder, 'reasons'>) =>
  order.reasons.some((reason) => reason === 'AMOUNT_MISMATCH' || reason === 'FEE_MISMATCH')

// ─── 해결 기록 전체 목록 ─────────────────────────────────

export const defaultResolutionRequestFilter = (): ResolutionRequestFilter => ({
  ...recentDays(30),
  adminId: '',
})

/** 관리자 번호 입력값 검사. 비었으면 전체 관리자 */
export function adminIdInputError(value: string): string | null {
  if (!value.trim()) return null
  return isPositiveId(value) ? null : '관리자 회원 번호는 1 이상의 숫자로 입력해 주세요'
}

export const canQueryResolutionRequests = (filter: ResolutionRequestFilter) =>
  rangeErrorOf(filter) === null && adminIdInputError(filter.adminId) === null

/** 날짜(포함~포함) → from(포함)·to(미포함, 다음 날 0시). 관리자 번호가 비면 생략 */
export function toResolutionRequestParams(
  filter: ResolutionRequestFilter,
  page: number,
): ResolutionRequestParams {
  const adminId = filter.adminId.trim()
  return {
    ...dayRangeToServer(filter.from, filter.to),
    adminId: adminId ? Number(adminId) : undefined,
    page,
    size: RESOLUTION_REQUEST_PAGE_SIZE,
  }
}
