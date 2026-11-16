import type { PageResponse } from './types'

// 환불(출고 전 취소) 계약. 구매자(orders)와 판매자(seller)가 같은 응답을 받아 shared에 둔다.
// 상세 API는 없고 목록 한 줄에 필요한 값이 다 있다.

/** REQUESTED → PROCESSING → COMPLETED. REJECTED·WITHDRAWN으로 끝날 수도 있다 */
export enum RefundStatus {
  REQUESTED = 'REQUESTED', // 판매자 승인 대기. 구매자가 철회할 수 있다
  PROCESSING = 'PROCESSING', // 승인됨. 돌려줄 돈이 있으면 지갑이 반환을 마칠 때까지
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED', // 판매자 거절, 승인 때 자동 거절(이미 출고·배송비 부족) 모두
  WITHDRAWN = 'WITHDRAWN', // 구매자 철회
}

/** 같은 주문 상품에 새 요청을 받지 않는 상태(서버 active_order_item_id) */
export const IN_PROGRESS_REFUND_STATUSES: readonly RefundStatus[] = [
  RefundStatus.REQUESTED,
  RefundStatus.PROCESSING,
]

/** 취소된 개수로 치는 상태. 산 개수에서 이 개수를 뺀 만큼만 더 취소할 수 있다 */
export const CANCELED_REFUND_STATUSES: readonly RefundStatus[] = [
  RefundStatus.PROCESSING,
  RefundStatus.COMPLETED,
]

/** 환불 요청 한 건. 배송비 칸은 승인 때 정해지고 그 전에는 0이다 */
export type Refund = {
  refundId: number
  orderId: number
  orderItemId: number
  productName: string
  optionName: string
  quantity: number
  unitPrice: number
  itemAmount: number // 단가 × 개수
  shippingFeeAmount: number // 돌려줄 배송비. 판매자 묶음이 이 환불로 전부 취소될 때만
  remoteAreaFeeAmount: number // 돌려줄 도서산간 운임
  deductedShippingFeeAmount: number // 일부 취소로 무료배송이 깨져 뺀 배송비
  refundAmount: number // 상품 금액 + 돌려줄 배송비 + 도서산간 운임 − 뺀 배송비. 승인 전에는 상품 금액과 같다
  cancelReason: string | null
  status: RefundStatus
  rejectReason: string | null // 거절일 때만. 자동 거절이면 서버가 적은 이유
  requestedAt: string
  decidedAt: string | null
  completedAt: string | null
}

/** 25건 고정, 최신순 */
export type RefundPage = PageResponse<Refund>

/** POST /refunds. 사유는 선택(255자 이하, 공백만이면 안 적은 것) */
export type RefundCreateRequest = {
  orderId: number
  orderItemId: number
  quantity: number
  cancelReason?: string
}

/** PATCH /seller/refunds/{id}. 거절이면 사유 필수(255자 이하) */
export type RefundDecisionRequest =
  | { decision: 'APPROVE' }
  | { decision: 'REJECT'; rejectReason: string }

export const REFUND_REASON_MAX_LENGTH = 255
