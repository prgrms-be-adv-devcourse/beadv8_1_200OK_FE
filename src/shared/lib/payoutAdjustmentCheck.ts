// 관리자 정산 조정이 금액 검사에 들어가는지(서버 adjustmentCheckStatus, 백엔드 #791·#792). 배지 모양은 StatusBadge.
// 서버는 조정을 막지 않고 이 값으로 알리기만 해서, 화면이 보여 줘야 잘못 넣은 조정을 알아챌 수 있다.
// CONFIRMED: 금액·수수료 불일치 실패 뒤·해결 전에 넣고 해결한 조정. 금액 검사에 들어간다. 반대 금액으로 상쇄하면 돈이 더 나갈 수 있다.
// AWAITING_RESOLUTION: 해결 안 된 불일치 실패 뒤에 넣은 조정. 막힌 주문을 해결하면 CONFIRMED가 된다.
//   막힌 주문 예비 줄의 PENDING과 헷갈리지 않게 서버가 이름을 다르게 두었다.
// UNCHECKED: 그 밖의 조정(실패 전에 미리 넣음, 해결 뒤에 넣음, 막힘과 상관없음). 금액 검사 없이 지급에만 들어간다.

export enum PayoutAdjustmentCheckStatus {
  CONFIRMED = 'CONFIRMED',
  AWAITING_RESOLUTION = 'AWAITING_RESOLUTION',
  UNCHECKED = 'UNCHECKED',
}

export const payoutAdjustmentCheckStatusLabels: Record<PayoutAdjustmentCheckStatus, string> = {
  [PayoutAdjustmentCheckStatus.CONFIRMED]: '확인됨',
  [PayoutAdjustmentCheckStatus.AWAITING_RESOLUTION]: '해결 대기',
  [PayoutAdjustmentCheckStatus.UNCHECKED]: '검사 밖',
}

const values = new Set<string>(Object.values(PayoutAdjustmentCheckStatus))

/** 서버가 모르는 값을 보내도 배지가 깨지지 않게 아는 값만 고른다 */
export const isPayoutAdjustmentCheckStatus = (
  value: string | null | undefined,
): value is PayoutAdjustmentCheckStatus => value != null && values.has(value)
