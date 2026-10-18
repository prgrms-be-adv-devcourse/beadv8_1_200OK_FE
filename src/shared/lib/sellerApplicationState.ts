// 판매자 신청·심사 상태. 판매자 신청 현황(sellerApply)과 관리자 심사(admin)가 같이 쓴다. 배지 모양은 StatusBadge.
// TODO(api): ❌ 신청 현황·신청 목록 API가 나오면 서버 값에 맞춘다.

export enum SellerApplicationStatus {
  APPLIED = 'APPLIED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export const sellerApplicationStatusLabels: Record<SellerApplicationStatus, string> = {
  [SellerApplicationStatus.APPLIED]: '신청 완료',
  [SellerApplicationStatus.UNDER_REVIEW]: '심사 중',
  [SellerApplicationStatus.APPROVED]: '승인',
  [SellerApplicationStatus.REJECTED]: '반려',
  [SellerApplicationStatus.SUSPENDED]: '권한 정지',
}
