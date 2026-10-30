import { SellerApplicationStatus } from '@/shared/api/types'

// 판매자 신청·심사 상태(서버 enum). 판매자 신청 현황(sellerApply)과 관리자 심사(admin)가 같이 쓴다. 배지 모양은 StatusBadge.
// 흐름: PENDING(심사 대기) → IN_REVIEW(심사 중) → APPROVED | REJECTED. PENDING에서 바로 REJECTED도 된다.
// 거절된 회원은 바로 다시 신청할 수 있다. 권한 정지(suspension) API는 없다(❌).

export { SellerApplicationStatus }

export const sellerApplicationStatusLabels: Record<SellerApplicationStatus, string> = {
  [SellerApplicationStatus.PENDING]: '심사 대기',
  [SellerApplicationStatus.IN_REVIEW]: '심사 중',
  [SellerApplicationStatus.APPROVED]: '승인',
  [SellerApplicationStatus.REJECTED]: '반려',
}
