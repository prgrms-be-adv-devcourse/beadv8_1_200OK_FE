// 관리자 충전 건 처리 화면(/admin/charges)에서 보이는 충전 건 상태. 배지 모양은 StatusBadge.
// 서버 status(PENDING·IN_PROGRESS·COMPLETED·FAILED)에 heldForReview·결제 취소 시각을 더해 정한다(features/admin/charges.ts).
// 값이 다른 배지 상태(COMPLETED·FAILED·PENDING)와 겹치지 않게 CHARGE_ 접두어를 붙인다.

export enum ChargeReviewState {
  /** 자동 확인이 멈춘 처리 중 건. 관리자가 처리할 때까지 남는다 */
  HELD = 'CHARGE_HELD',
  /** 결제 취소를 요청했지만 결과를 모르는 처리 중 건. 결제 취소만 다시 할 수 있다 */
  CANCEL_UNCONFIRMED = 'CHARGE_CANCEL_UNCONFIRMED',
  /** 실패로 끝낸 뒤 토스가 승인해 돈만 빠진 건. 결제를 취소해야 한다 */
  AWAITING_CANCEL = 'CHARGE_AWAITING_CANCEL',
  /** 서버가 1분마다 토스에 물어 끝내는 중인 처리 중 건 */
  CHECKING = 'CHARGE_CHECKING',
  PENDING = 'CHARGE_PENDING',
  COMPLETED = 'CHARGE_COMPLETED',
  FAILED = 'CHARGE_FAILED',
  /** 관리자가 토스 결제를 취소(환불)함 */
  PAYMENT_CANCELED = 'CHARGE_PAYMENT_CANCELED',
}

export const chargeReviewStateLabels: Record<ChargeReviewState, string> = {
  [ChargeReviewState.HELD]: '확인 멈춤',
  [ChargeReviewState.CANCEL_UNCONFIRMED]: '취소 결과 모름',
  [ChargeReviewState.AWAITING_CANCEL]: '결제 취소 필요',
  [ChargeReviewState.CHECKING]: '자동 확인 중',
  [ChargeReviewState.PENDING]: '결제 전',
  [ChargeReviewState.COMPLETED]: '잔액 반영됨',
  [ChargeReviewState.FAILED]: '실패',
  [ChargeReviewState.PAYMENT_CANCELED]: '결제 취소됨',
}
