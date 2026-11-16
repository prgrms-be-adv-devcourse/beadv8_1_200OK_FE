// 정산이 막힌 주문의 상태(서버 GET /admin/payouts/blocked-orders의 status). 배지 모양은 StatusBadge.
// LOCKED: 수수료·결과 검증 불일치로 잠김. 다시 검사해도 안 풀려 관리자가 해결해야 한다.
// STOPPED: 성공한 정산 실행에서 3번 실패해 자동 재검사가 멈춤.
// RESOLVED: 관리자가 해결함. 다음 정산 실행이 끝나면 목록에서 빠지거나, 다시 막히면 LOCKED·STOPPED로 바뀐다.

export enum PayoutBlockStatus {
  LOCKED = 'LOCKED',
  STOPPED = 'STOPPED',
  RESOLVED = 'RESOLVED',
}

export const payoutBlockStatusLabels: Record<PayoutBlockStatus, string> = {
  [PayoutBlockStatus.LOCKED]: '잠김',
  [PayoutBlockStatus.STOPPED]: '멈춤',
  [PayoutBlockStatus.RESOLVED]: '해결됨',
}
