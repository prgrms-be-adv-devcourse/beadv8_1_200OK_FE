import { PayoutBlockStatus } from '@/shared/lib/payoutBlockState'
import {
  ALL_BLOCK_STATUSES,
  blockedOrderSearch,
  canQueryResolutionRequests,
  parseBlockedOrderFilter,
  toBlockedOrderParams,
  toResolutionRequestParams,
} from './blockedOrderFilter'
import { rangeErrorOf } from './payoutFilter'

const { LOCKED, STOPPED } = PayoutBlockStatus

describe('막힌 주문 조건', () => {
  it('주소의 status 여러 개와 orderId를 읽고, 모르는 값은 버린다', () => {
    expect(
      parseBlockedOrderFilter(new URLSearchParams('status=STOPPED&status=LOCKED&status=PENDING')),
    ).toEqual({ statuses: [LOCKED, STOPPED], orderId: null })
    expect(parseBlockedOrderFilter(new URLSearchParams('orderId=2001'))).toEqual({
      statuses: ALL_BLOCK_STATUSES,
      orderId: 2001,
    })
    expect(parseBlockedOrderFilter(new URLSearchParams('orderId=abc')).orderId).toBeNull()
  })

  it('셋 다면 status를 빼고, 일부면 반복해 적는다. 주문 번호로 찾을 때는 상태를 붙이지 않는다', () => {
    expect(toBlockedOrderParams({ statuses: ALL_BLOCK_STATUSES, orderId: null }, 0).status).toBe(
      undefined,
    )
    expect(toBlockedOrderParams({ statuses: [LOCKED, STOPPED], orderId: null }, 1)).toEqual({
      status: [LOCKED, STOPPED],
      page: 1,
      size: 20,
    })
    expect(toBlockedOrderParams({ statuses: [LOCKED], orderId: 2001 }, 0)).toEqual({
      orderId: 2001,
      page: 0,
      size: 20,
    })
    expect(blockedOrderSearch({ statuses: [LOCKED, STOPPED], orderId: null }, 2).toString()).toBe(
      'status=LOCKED&status=STOPPED&page=2',
    )
  })
})

describe('해결 기록 기간 검증', () => {
  it('끝일 다음 날 0시가 시작 + 1년을 넘으면 막는다 (서버 422와 같은 기준)', () => {
    expect(rangeErrorOf({ from: '2025-11-20', to: '2026-11-19' })).toBeNull()
    expect(rangeErrorOf({ from: '2025-11-20', to: '2026-11-20' })).toBe(
      '기간은 1년까지 볼 수 있어요. 시작일이나 종료일을 바꿔 주세요',
    )
    expect(rangeErrorOf({ from: '2026-11-20', to: '2026-11-19' })).toBe(
      '시작일이 종료일보다 늦어요',
    )
  })

  it('기간이나 관리자 번호가 틀리면 부르지 않는다', () => {
    const ok = { from: '2026-11-01', to: '2026-11-18', adminId: '' }
    expect(canQueryResolutionRequests(ok)).toBe(true)
    expect(canQueryResolutionRequests({ ...ok, from: '2025-10-01' })).toBe(false)
    expect(canQueryResolutionRequests({ ...ok, adminId: '0' })).toBe(false)
    expect(canQueryResolutionRequests({ ...ok, adminId: 'x' })).toBe(false)
  })

  it('날짜(포함~포함)를 from(포함)·to(미포함)로 바꾸고 관리자 번호는 있을 때만 보낸다', () => {
    expect(
      toResolutionRequestParams({ from: '2026-11-01', to: '2026-11-18', adminId: ' 2 ' }, 0),
    ).toEqual({
      from: '2026-11-01T00:00:00',
      to: '2026-11-19T00:00:00',
      adminId: 2,
      page: 0,
      size: 20,
    })
    expect(
      toResolutionRequestParams({ from: '2026-11-01', to: '2026-11-18', adminId: '' }, 0).adminId,
    ).toBeUndefined()
  })
})
