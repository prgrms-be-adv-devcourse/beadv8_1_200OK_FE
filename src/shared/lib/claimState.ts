// 판매자 취소 요청 처리 상태. TODO(api): 📝 GET /claims/seller 계약이 나오면 서버 값에 맞춘다. 배지 모양은 StatusBadge.

export enum ClaimState {
  CLAIM_PENDING = 'CLAIM_PENDING',
  CLAIM_APPROVED = 'CLAIM_APPROVED',
  CLAIM_REJECTED = 'CLAIM_REJECTED',
}

export const claimStateLabels: Record<ClaimState, string> = {
  [ClaimState.CLAIM_PENDING]: '처리 대기',
  [ClaimState.CLAIM_APPROVED]: '승인 · 환불 완료',
  [ClaimState.CLAIM_REJECTED]: '거절',
}
