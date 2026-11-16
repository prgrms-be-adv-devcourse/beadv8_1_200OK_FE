import { RefundStatus } from '@/shared/api/refund'

// 환불(취소 요청) 상태 문구. 배지 모양은 StatusBadge의 RefundStatusBadge.

export const refundStatusLabels: Record<RefundStatus, string> = {
  [RefundStatus.REQUESTED]: '승인 대기',
  [RefundStatus.PROCESSING]: '환불 처리 중',
  [RefundStatus.COMPLETED]: '환불 완료',
  [RefundStatus.REJECTED]: '거절됨',
  [RefundStatus.WITHDRAWN]: '철회함',
}
