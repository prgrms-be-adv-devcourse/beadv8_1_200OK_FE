import { ChargeStatus } from '@/shared/api/types'
import { ChargeReviewState } from '@/shared/lib/chargeReviewState'
import {
  type AdminChargeDetail,
  ChargeAction,
  chargeActionsOf,
  chargeReviewStateOf,
  splitChargeTargets,
  TOSS_UNKNOWN_REASON,
  TossLookup,
  TossPaymentStatus,
} from './charges'
import {
  adminCharges,
  CHARGE_AFTER_FAILURE,
  CHARGE_CANCEL_REQUESTED,
  CHARGE_DONE,
  CHARGE_NOT_FOUND,
  findChargeDetail,
} from './fixtures'

const detailOf = (chargeNo: string) => findChargeDetail(chargeNo) as AdminChargeDetail
const held = detailOf(CHARGE_DONE)
const toss = (status: TossPaymentStatus | null, amount: number | null = held.charge.amount) =>
  ({
    ...held,
    tossLookup: status === null ? TossLookup.NOT_FOUND : TossLookup.FOUND,
    tossStatus: status,
    tossTotalAmount: status === null ? null : amount,
  }) satisfies AdminChargeDetail

/** 켠 버튼만 */
const enabled = (detail: AdminChargeDetail) =>
  Object.entries(chargeActionsOf(detail))
    .filter(([, reason]) => reason === null)
    .map(([action]) => action)

const { COMPLETE, FAIL, CANCEL_PAYMENT } = ChargeAction

describe('chargeActionsOf — 이슈 #42 버튼 조건', () => {
  it('멈춘 처리 중 건 · 토스 DONE 같은 금액 → 잔액 반영 · 결제 취소', () => {
    expect(enabled(held)).toEqual([COMPLETE, CANCEL_PAYMENT])
  })

  it('DONE이어도 금액이 다르면 모두 끈다', () => {
    const actions = chargeActionsOf(toss(TossPaymentStatus.DONE, 9_000))
    expect(enabled(toss(TossPaymentStatus.DONE, 9_000))).toEqual([])
    expect(actions[COMPLETE]).toBe('토스 결제 금액이 충전 금액과 달라요')
  })

  it.each([
    [null, [FAIL]],
    [TossPaymentStatus.ABORTED, [FAIL]],
    [TossPaymentStatus.EXPIRED, [FAIL]],
    [TossPaymentStatus.CANCELED, [FAIL, CANCEL_PAYMENT]],
    [TossPaymentStatus.READY, []],
    [TossPaymentStatus.IN_PROGRESS, []],
    [TossPaymentStatus.WAITING_FOR_DEPOSIT, []],
    [TossPaymentStatus.PARTIAL_CANCELED, []],
  ])('토스 %s → %j', (status, expected) => {
    expect(enabled(toss(status))).toEqual(expected)
  })

  it('결제 취소를 요청한 처리 중 건은 결제 취소만 (토스 DONE)', () => {
    const detail = detailOf(CHARGE_CANCEL_REQUESTED)
    expect(enabled(detail)).toEqual([CANCEL_PAYMENT])
    expect(chargeActionsOf(detail)[COMPLETE]).toContain('결제 취소만 다시')
  })

  it('승인 뒤 실패한 건은 결제 취소만, 토스 CANCELED면 기록만 하는 결제 취소', () => {
    const detail = detailOf(CHARGE_AFTER_FAILURE)
    expect(enabled(detail)).toEqual([CANCEL_PAYMENT])
    expect(enabled({ ...detail, tossStatus: TossPaymentStatus.CANCELED })).toEqual([CANCEL_PAYMENT])
    expect(enabled({ ...detail, tossLookup: TossLookup.NOT_FOUND, tossStatus: null })).toEqual([])
  })

  it('토스 답이 UNKNOWN이면 모두 끈다', () => {
    const actions = chargeActionsOf({
      ...held,
      tossLookup: TossLookup.UNKNOWN,
      tossStatus: null,
      tossTotalAmount: null,
    })
    expect(Object.values(actions)).toEqual([
      TOSS_UNKNOWN_REASON,
      TOSS_UNKNOWN_REASON,
      TOSS_UNKNOWN_REASON,
    ])
  })

  it('처리가 끝났거나 자동 확인 중인 건은 모두 끈다', () => {
    const completed = { ...held, charge: { ...held.charge, status: ChargeStatus.COMPLETED } }
    const checking = { ...held, charge: { ...held.charge, heldForReview: false } }
    expect(enabled(completed)).toEqual([])
    expect(enabled(checking)).toEqual([])
  })
})

describe('충전 건 나누기 · 표시 상태', () => {
  it('목록을 멈춘 건과 승인 뒤 실패한 건으로 나눈다', () => {
    const { held: heldList, awaitingCancel } = splitChargeTargets(adminCharges)
    expect(heldList.map((c) => c.chargeNo)).not.toContain(CHARGE_AFTER_FAILURE)
    expect(heldList).toHaveLength(adminCharges.length - 1)
    expect(awaitingCancel.map((c) => c.chargeNo)).toEqual([CHARGE_AFTER_FAILURE])
  })

  it('표시 상태', () => {
    expect(chargeReviewStateOf(held.charge)).toBe(ChargeReviewState.HELD)
    expect(chargeReviewStateOf(detailOf(CHARGE_NOT_FOUND).charge)).toBe(ChargeReviewState.HELD)
    expect(chargeReviewStateOf(detailOf(CHARGE_CANCEL_REQUESTED).charge)).toBe(
      ChargeReviewState.CANCEL_UNCONFIRMED,
    )
    expect(chargeReviewStateOf(detailOf(CHARGE_AFTER_FAILURE).charge)).toBe(
      ChargeReviewState.AWAITING_CANCEL,
    )
    expect(
      chargeReviewStateOf({
        ...held.charge,
        status: ChargeStatus.FAILED,
        paymentCanceledAt: '2026-11-20T10:00:00',
      }),
    ).toBe(ChargeReviewState.PAYMENT_CANCELED)
  })
})
