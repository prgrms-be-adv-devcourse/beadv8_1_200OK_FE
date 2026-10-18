// 판매자 출금 처리 상태. TODO(api): 📝 GET /wallets/seller/withdrawals/{id} 계약이 나오면 서버 값에 맞춘다. 배지 모양은 StatusBadge.

export enum WithdrawalState {
  REQUESTED = 'REQUESTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export const withdrawalStateLabels: Record<WithdrawalState, string> = {
  [WithdrawalState.REQUESTED]: '신청',
  [WithdrawalState.PROCESSING]: '처리 중',
  [WithdrawalState.COMPLETED]: '완료',
  [WithdrawalState.FAILED]: '실패',
}
