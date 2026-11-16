import {
  CANCELED_REFUND_STATUSES,
  IN_PROGRESS_REFUND_STATUSES,
  type Refund,
} from '@/shared/api/refund'
import { type OrderDetailItem, OrderItemStatus } from '@/shared/api/types'

// 주문 상품 한 줄의 취소 요청 가능 여부. 주문 상세의 상품 상태는 요청·승인으로 바뀌지 않아서
// 내 취소 요청 목록과 합쳐서 정한다. 서버 규칙(RequestRefundService)과 같다:
// 출고 전(PREPARING)만, 진행 중(승인 대기·처리 중) 요청이 없을 때, 산 개수 − 이미 취소된(처리 중·완료) 개수까지.

export type ItemCancel =
  | { kind: 'unavailable' }
  | { kind: 'inProgress'; refund: Refund }
  | { kind: 'allCanceled' }
  | { kind: 'available'; maxQuantity: number }

export function itemCancelOf(item: OrderDetailItem, refunds: readonly Refund[]): ItemCancel {
  if (item.status !== OrderItemStatus.PREPARING) return { kind: 'unavailable' }
  const mine = refunds.filter((refund) => refund.orderItemId === item.orderItemId)
  const active = mine.find((refund) => IN_PROGRESS_REFUND_STATUSES.includes(refund.status))
  if (active) return { kind: 'inProgress', refund: active }
  const canceled = mine
    .filter((refund) => CANCELED_REFUND_STATUSES.includes(refund.status))
    .reduce((sum, refund) => sum + refund.quantity, 0)
  const maxQuantity = item.quantity - canceled
  return maxQuantity > 0 ? { kind: 'available', maxQuantity } : { kind: 'allCanceled' }
}
