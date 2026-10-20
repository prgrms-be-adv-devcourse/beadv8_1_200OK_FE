import type { OrderDetailItem, ShippingAddress } from '@/shared/api/types'

// 주문 목록·상세 타입은 서버 계약(shared/api/types.ts의 OrderSummary·OrderDetail)을 그대로 쓴다.
// 이 파일은 화면 전용 타입과, API가 없는 배송 조회·고객센터 문의의 임시 타입만 둔다.

/** OrderItemRow가 그리는 주문 상품 한 줄. 주문 상세 items[]가 그대로 맞고, 사진은 API에 없어 선택이다 */
export type OrderItemRowItem = Pick<
  OrderDetailItem,
  'orderItemId' | 'productId' | 'productName' | 'productOptionName' | 'quantity' | 'itemAmount'
> & { thumbnailUrl?: string }

// ─── ❌ API 없음 — ShipmentView·SupportView fixtures 전용 ─────────────────────
// TODO(api): ❌ 배송 조회(택배사 이력)·고객센터 문의 API가 없다. 주문 상세에도 shipmentId·송장이 없어 화면은 fixtures로만 그린다.

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
  items: OrderItemRowItem[]
  recipient: Pick<ShippingAddress, 'recipientName' | 'address'>
}

/** 고객센터 문의 유형 (C-8) */
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
export type InquiryTarget = OrderItemRowItem & { sellerName: string; orderNumber: string }
