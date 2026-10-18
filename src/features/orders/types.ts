import type { OrderItemStatus, ShippingAddress } from '@/shared/api/types'

// TODO(api): 주문 조회·클레임·배송·문의 API는 Notion 계획(📝)만 있다. 필드는 시안 기준 임시이고,
// 서버 계약이 나오면 shared/api/types.ts로 옮기며 이름을 맞춘다. 상태는 shared의 OrderItemStatus(8종).

export type OrderItem = {
  orderItemId: number
  productId: number
  productOptionId: number
  productName: string
  optionName: string
  quantity: number
  itemAmount: number
  thumbnailUrl: string
}

/** 주문 목록 한 건 (📝 GET /orders) */
export type OrderSummary = {
  orderId: number
  orderNumber: string // 예: 20261013-0184
  orderedAt: string
  totalAmount: number // 배송비 포함
  items: (OrderItem & { sellerName: string; status: OrderItemStatus })[]
}

/** 주문 목록 필터 */
export enum OrderFilter {
  ALL = 'ALL',
  IN_PROGRESS = 'IN_PROGRESS',
  CONFIRMED = 'CONFIRMED',
  CANCELED = 'CANCELED',
}

/** 농가 하나의 배송 묶음 (📝 GET /orders/{id}) */
export type OrderShipment = {
  shipmentId: number
  sellerId: number
  sellerName: string
  status: OrderItemStatus
  shippingFee: number
  carrier: string | null
  trackingNumber: string | null
  /** 배송지 변경 요청 중 */
  addressChangeRequested: boolean
  /** 배송 완료 뒤 자동 구매확정 예정일 */
  autoConfirmAt: string | null
  /** 취소 요청 중이면 철회에 쓰는 클레임 ID */
  claimId: number | null
  refundedAmount: number | null
  refundedAt: string | null
  items: OrderItem[]
}

export type OrderDetail = {
  orderId: number
  orderNumber: string
  orderedAt: string
  recipient: ShippingAddress
  totalProductAmount: number
  totalShippingFee: number
  totalAmount: number
  shipments: OrderShipment[]
}

/** 취소 사유 (📝 POST /claims/cancel) */
export enum CancelReason {
  ORDER_MISTAKE = 'ORDER_MISTAKE',
  ADDRESS_PROBLEM = 'ADDRESS_PROBLEM',
  REORDER = 'REORDER',
  ETC = 'ETC',
}

export type CancelRequest = {
  shipmentId: number
  orderItemIds: number[]
  reason: CancelReason
  reasonDetail?: string
}

/** 배송 조회 (📝 GET /shipments/{shipmentId}) */
export enum ShipmentStage {
  PREPARING = 'PREPARING',
  DELAYED = 'DELAYED',
  SHIPPING = 'SHIPPING',
  DELIVERED = 'DELIVERED',
}

export type ShipmentTracking = {
  shipmentId: number
  orderId: number
  orderNumber: string
  orderedAt: string
  sellerName: string
  stage: ShipmentStage
  carrier: string | null
  trackingNumber: string | null
  estimatedArrival: string | null
  deliveredAt: string | null
  autoConfirmAt: string | null
  delay: { reason: string; newShipDate: string; notifiedAt: string } | null
  /** 택배사 이력 (최신 순) */
  events: { at: string; status: string; location: string; description?: string }[]
  items: OrderItem[]
  recipient: Pick<ShippingAddress, 'recipientName' | 'address'>
}

/** 고객센터 문의 유형 (📝 POST /shipments/{id}/claims, C-8) */
export enum InquiryType {
  DAMAGED = 'DAMAGED',
  WRONG_ITEM = 'WRONG_ITEM',
  LATE = 'LATE',
  ETC = 'ETC',
}

export type Inquiry = {
  inquiryId: number
  inquiryNumber: string // CS-…
  type: InquiryType
  orderNumber: string
  productName: string
  content: string
  photoCount: number
  createdAt: string
  answer: { content: string; answeredAt: string } | null
}

/** 문의할 수 있는 상품 (배송 완료된 주문 상품) */
export type InquiryTarget = OrderItem & { sellerName: string; orderNumber: string }
