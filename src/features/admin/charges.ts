import { ChargeStatus } from '@/shared/api/types'
import { ChargeReviewState } from '@/shared/lib/chargeReviewState'

// 멈춘 충전 건 처리(관리자) 서버 계약과 화면 규칙. 백엔드 wallet WalletChargeAdminController(BE #760).
// 결제 승인 결과를 몰라 처리 중으로 남은 충전 건은 서버가 1분마다 토스에 물어 끝내고, 토스 답만으로 정하지 못한 건은 멈춰 관리자를 기다린다.
// 버튼 조건은 화면용 안내다. 서버도 처리 직전에 토스에 다시 물어 막는다(409).

// ─── 서버 계약 ───────────────────────────────────────────

/** 토스 조회 결과. UNKNOWN은 토스 답을 못 받음 */
export enum TossLookup {
  FOUND = 'FOUND',
  NOT_FOUND = 'NOT_FOUND',
  UNKNOWN = 'UNKNOWN',
}

/** 토스 결제 상태 (토스페이먼츠 결제 객체 문서와 같은 이름) */
export enum TossPaymentStatus {
  READY = 'READY',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_DEPOSIT = 'WAITING_FOR_DEPOSIT',
  DONE = 'DONE',
  CANCELED = 'CANCELED',
  PARTIAL_CANCELED = 'PARTIAL_CANCELED',
  ABORTED = 'ABORTED',
  EXPIRED = 'EXPIRED',
}

/** ChargeAdminResponse — 목록 한 줄이자 처리 3개의 응답 */
export type AdminCharge = {
  chargeNo: string
  memberId: number
  amount: number
  status: ChargeStatus
  /** 실패한 건만. 관리자 실패 처리는 ADMIN_FAILED, 처리 중 건 결제 취소는 PAYMENT_CANCELED */
  failureCode: string | null
  failureMessage: string | null
  /** 자동 확인이 멈춘 처리 중 건 */
  heldForReview: boolean
  createdAt: string
  /** 실패로 끝낸 뒤 토스가 승인한 것을 안 시각 */
  approvedAfterFailureAt: string | null
  /** 관리자가 결제 취소를 요청한 시각. 처리 중 건에 있으면 취소 결과를 모르는 건 */
  paymentCancelRequestedAt: string | null
  paymentCanceledAt: string | null
}

/** ChargeAdminDetailResponse. tossStatus·tossTotalAmount는 결제가 있을 때(FOUND)만 값이 있다 */
export type AdminChargeDetail = {
  charge: AdminCharge
  tossLookup: TossLookup
  tossStatus: TossPaymentStatus | null
  tossTotalAmount: number | null
}

/** 실패 처리 · 결제 취소 본문. 서버가 앞뒤 공백을 지우고 1~200자를 본다(결제 취소 사유는 토스에도 보낸다) */
export type ChargeReasonRequest = { reason: string }

// ─── 화면 규칙 ───────────────────────────────────────────

export enum ChargeAction {
  COMPLETE = 'COMPLETE',
  FAIL = 'FAIL',
  CANCEL_PAYMENT = 'CANCEL_PAYMENT',
}

/** 멈춘 처리 중 건 (결제 취소를 요청한 건 포함) */
export const isHeldCharge = (charge: AdminCharge) =>
  charge.status === ChargeStatus.IN_PROGRESS && charge.heldForReview

const isCancelRequested = (charge: AdminCharge) =>
  charge.status === ChargeStatus.IN_PROGRESS && charge.paymentCancelRequestedAt !== null

/** 승인 뒤 실패한 건: 돈만 빠져 결제를 취소해야 한다 */
export const isAwaitingPaymentCancel = (charge: AdminCharge) =>
  charge.status === ChargeStatus.FAILED &&
  charge.approvedAfterFailureAt !== null &&
  charge.paymentCanceledAt === null

export function chargeReviewStateOf(charge: AdminCharge): ChargeReviewState {
  if (charge.paymentCanceledAt !== null) return ChargeReviewState.PAYMENT_CANCELED
  if (isCancelRequested(charge)) return ChargeReviewState.CANCEL_UNCONFIRMED
  if (isHeldCharge(charge)) return ChargeReviewState.HELD
  if (isAwaitingPaymentCancel(charge)) return ChargeReviewState.AWAITING_CANCEL
  switch (charge.status) {
    case ChargeStatus.IN_PROGRESS:
      return ChargeReviewState.CHECKING
    case ChargeStatus.PENDING:
      return ChargeReviewState.PENDING
    case ChargeStatus.COMPLETED:
      return ChargeReviewState.COMPLETED
    case ChargeStatus.FAILED:
      return ChargeReviewState.FAILED
  }
}

/** 관리자가 처리할 수 있는 건인지 (아니면 처리 버튼 대신 결과를 보여 준다) */
export const isHandleable = (charge: AdminCharge) =>
  isHeldCharge(charge) || isAwaitingPaymentCancel(charge)

/** 버튼마다 끈 이유. null이면 켠다 */
export type ChargeActionState = Record<ChargeAction, string | null>

const FAILABLE: ReadonlySet<TossPaymentStatus> = new Set([
  TossPaymentStatus.ABORTED,
  TossPaymentStatus.EXPIRED,
  TossPaymentStatus.CANCELED,
])

export const TOSS_UNKNOWN_REASON = '토스 답을 받지 못했어요. 다시 조회해 주세요'
const NOT_HANDLEABLE_REASON = '관리자가 처리할 건이 아니에요'
const CANCEL_ONLY_REASON = '결제 취소를 요청한 건이라 결제 취소만 다시 할 수 있어요'
const AFTER_FAILURE_REASON = '승인 뒤 실패한 건은 결제 취소만 할 수 있어요'
const NO_PAYMENT_REASON = '토스에 결제가 없어요'
const AMOUNT_MISMATCH_REASON = '토스 결제 금액이 충전 금액과 달라요'
const NOT_DONE_REASON = '토스 결제가 승인(DONE) 상태가 아니에요'
const NOT_FAILABLE_REASON = '토스 결제가 승인됐거나 아직 진행 중이라 실패로 둘 수 없어요'

/**
 * 버튼 3개(잔액 반영 · 실패 처리 · 결제 취소)를 켜는 조건 (이슈 #42 표).
 * - 잔액 반영: 멈춘 처리 중 건 · 취소 요청 없음 · 토스 DONE이고 금액이 같음
 * - 실패 처리: 멈춘 처리 중 건 · 취소 요청 없음 · 토스 결제 없음, 또는 ABORTED·EXPIRED·CANCELED
 * - 결제 취소: 멈춘 처리 중 건 또는 승인 뒤 실패한 건 · 토스 DONE이고 금액이 같음, 또는 CANCELED(기록만)
 * - 토스 답이 UNKNOWN이면 모두 끈다
 */
export function chargeActionsOf(detail: AdminChargeDetail): ChargeActionState {
  const { charge, tossLookup, tossStatus, tossTotalAmount } = detail
  if (!isHandleable(charge)) {
    return {
      [ChargeAction.COMPLETE]: NOT_HANDLEABLE_REASON,
      [ChargeAction.FAIL]: NOT_HANDLEABLE_REASON,
      [ChargeAction.CANCEL_PAYMENT]: NOT_HANDLEABLE_REASON,
    }
  }
  if (tossLookup === TossLookup.UNKNOWN) {
    return {
      [ChargeAction.COMPLETE]: TOSS_UNKNOWN_REASON,
      [ChargeAction.FAIL]: TOSS_UNKNOWN_REASON,
      [ChargeAction.CANCEL_PAYMENT]: TOSS_UNKNOWN_REASON,
    }
  }

  const found = tossLookup === TossLookup.FOUND
  const doneSameAmount =
    found && tossStatus === TossPaymentStatus.DONE && tossTotalAmount === charge.amount
  const notDoneSameAmount = !found
    ? NO_PAYMENT_REASON
    : tossStatus === TossPaymentStatus.DONE
      ? AMOUNT_MISMATCH_REASON
      : NOT_DONE_REASON

  // 잔액 반영 · 실패 처리는 멈춘 처리 중 건이고 취소 요청이 없을 때만
  const heldOnly = isAwaitingPaymentCancel(charge)
    ? AFTER_FAILURE_REASON
    : isCancelRequested(charge)
      ? CANCEL_ONLY_REASON
      : null

  const complete = heldOnly ?? (doneSameAmount ? null : notDoneSameAmount)
  const failable = !found || (tossStatus !== null && FAILABLE.has(tossStatus))
  const fail = heldOnly ?? (failable ? null : NOT_FAILABLE_REASON)
  const cancel =
    doneSameAmount || (found && tossStatus === TossPaymentStatus.CANCELED)
      ? null
      : notDoneSameAmount

  return {
    [ChargeAction.COMPLETE]: complete,
    [ChargeAction.FAIL]: fail,
    [ChargeAction.CANCEL_PAYMENT]: cancel,
  }
}

/** 토스에서 이미 취소된 결제: 결제 취소를 누르면 다시 취소하지 않고 기록만 한다 */
export const isAlreadyCanceledOnToss = (detail: AdminChargeDetail) =>
  detail.tossLookup === TossLookup.FOUND && detail.tossStatus === TossPaymentStatus.CANCELED

/** 목록을 두 종류로 나눈다. 서버 순서(요청 시각 순)를 지킨다 */
export function splitChargeTargets(charges: AdminCharge[]) {
  return {
    held: charges.filter(isHeldCharge),
    awaitingCancel: charges.filter(isAwaitingPaymentCancel),
  }
}

// ─── 문구 ────────────────────────────────────────────────

export const tossLookupLabels: Record<TossLookup, string> = {
  [TossLookup.FOUND]: '결제 있음',
  [TossLookup.NOT_FOUND]: '결제 없음',
  [TossLookup.UNKNOWN]: '답을 못 받음',
}

export const tossPaymentStatusLabels: Record<TossPaymentStatus, string> = {
  [TossPaymentStatus.READY]: '결제 준비',
  [TossPaymentStatus.IN_PROGRESS]: '인증 완료 · 승인 전',
  [TossPaymentStatus.WAITING_FOR_DEPOSIT]: '입금 대기',
  [TossPaymentStatus.DONE]: '승인됨',
  [TossPaymentStatus.CANCELED]: '취소됨',
  [TossPaymentStatus.PARTIAL_CANCELED]: '일부 취소됨',
  [TossPaymentStatus.ABORTED]: '승인 실패',
  [TossPaymentStatus.EXPIRED]: '만료됨',
}

// 실패 코드는 서버가 늘릴 수 있는 문자열이라 모르는 값은 코드 그대로 보여 준다
const failureCodeLabels: Record<string, string> = {
  ADMIN_FAILED: '관리자 실패 처리',
  PAYMENT_CANCELED: '관리자 결제 취소',
}

export const failureCodeLabel = (code: string) => failureCodeLabels[code] ?? code

export const chargeActionLabels: Record<ChargeAction, string> = {
  [ChargeAction.COMPLETE]: '잔액 반영',
  [ChargeAction.FAIL]: '실패 처리',
  [ChargeAction.CANCEL_PAYMENT]: '결제 취소',
}

// ─── 처리 오류 문구 ──────────────────────────────────────

export const CHARGE_TOSS_UNAVAILABLE_MESSAGE = '토스 답을 받지 못했어요. 잠시 뒤 다시 눌러 주세요'
export const CHARGE_CANCEL_RETRY_SAFE = '결제 취소는 다시 눌러도 두 번 취소되지 않아요'
export const CHARGE_NOT_FOUND_MESSAGE = '충전 건을 찾을 수 없어 목록으로 돌아왔어요'
