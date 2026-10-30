import {
  type OrderDetail,
  type OrderDetailItem,
  type OrderDetailSellerGroup,
  OrderItemStatus,
  OrderStatus,
  type OrderSummary,
  type ShipmentAddress,
  ShipmentCarrier,
  type ShipmentDetail,
  ShipmentStatus,
  type ShipmentSummary,
  type ShippingAddress,
} from '@/shared/api/types'
import { type Inquiry, type InquiryTarget, InquiryType, type OrderItemRowItem } from './types'

// 샘플 데이터 (DECISIONS.md E). 서버 계약(OrderDetail·OrderSummary) 모양 그대로다.
// 주문 184는 checkout/fixtures.ts에서 결제한 그 주문(39,800원), 주문 27의 사과즙(271)은 reviews/fixtures.ts의 리뷰 대상이다.
// 배송비는 샘플 흐름의 금액을 지키려고 0원으로 둔다(실서버는 판매자별 3,000원·도서산간 추가 운임이 붙는다).

export const recipient: ShippingAddress = {
  recipientName: '이서연',
  recipientPhone: '010-2468-1357',
  zipCode: '04524',
  address: '서울 중구 세종대로 110',
  addressDetail: '3층 301호',
}

const item = (
  orderItemId: number,
  productId: number,
  productOptionId: number,
  productName: string,
  productOptionName: string,
  unitPrice: number,
  status: OrderItemStatus,
): OrderDetailItem => ({
  orderItemId,
  productId,
  productOptionId,
  productName,
  productOptionName,
  unitPrice,
  quantity: 1,
  itemAmount: unitPrice,
  status,
})

const apple = (status: OrderItemStatus) =>
  item(1841, 101, 1012, '청송 꿀사과 부사', '2kg (11~13과)', 23900, status)
const sweetPotato = (status: OrderItemStatus) =>
  item(1842, 102, 1021, '해남 꿀고구마 베니하루카', '3kg 한입 크기', 15900, status)
const tangerine = item(
  1511,
  103,
  1031,
  '제주 노지 조생 감귤',
  '3kg (S~M)',
  13900,
  OrderItemStatus.SHIPPING,
)
const cabbage = item(
  1401,
  104,
  1041,
  '평창 고랭지 알배기배추',
  '2포기',
  9900,
  OrderItemStatus.REFUNDED,
)
const sweetPotato5 = item(
  931,
  102,
  1022,
  '해남 꿀고구마 베니하루카',
  '5kg 중간 크기',
  23900,
  OrderItemStatus.DELIVERED,
)
const appleJuice = item(
  271,
  106,
  1061,
  '청송 사과즙 100% (30포)',
  '120ml × 30포',
  29900,
  OrderItemStatus.PURCHASE_CONFIRMED,
)

const group = (sellerId: number, items: OrderDetailItem[]): OrderDetailSellerGroup => ({
  sellerId,
  shippingFee: 0,
  remoteAreaFee: 0,
  items,
})

const detail = (
  orderId: number,
  status: OrderStatus,
  orderedAt: string,
  sellerGroups: OrderDetailSellerGroup[],
): OrderDetail => {
  const totalProductAmount = sellerGroups
    .flatMap((g) => g.items)
    .reduce((sum, i) => sum + i.itemAmount, 0)
  const totalShippingFee = sellerGroups.reduce((sum, g) => sum + g.shippingFee, 0)
  const totalRemoteAreaFee = sellerGroups.reduce((sum, g) => sum + g.remoteAreaFee, 0)
  return {
    orderId,
    status,
    orderedAt,
    ...recipient,
    addressDetail: recipient.addressDetail ?? '',
    sellerGroups,
    totalProductAmount,
    totalShippingFee,
    totalRemoteAreaFee,
    totalAmount: totalProductAmount + totalShippingFee + totalRemoteAreaFee,
  }
}

export const orderDetails: OrderDetail[] = [
  detail(184, OrderStatus.PAID, '2026-10-18T14:30:00', [
    group(7, [apple(OrderItemStatus.PREPARING)]),
    group(8, [sweetPotato(OrderItemStatus.PREPARING)]),
  ]),
  detail(151, OrderStatus.PAID, '2026-10-15T09:12:00', [group(9, [tangerine])]),
  detail(140, OrderStatus.CANCELED, '2026-10-14T20:05:00', [group(10, [cabbage])]),
  detail(93, OrderStatus.PAID, '2026-10-12T11:40:00', [group(8, [sweetPotato5])]),
  detail(27, OrderStatus.PAID, '2026-10-06T08:20:00', [group(7, [appleJuice])]),
]

export const orderSummaries: OrderSummary[] = orderDetails.map((order) => {
  const items = order.sellerGroups.flatMap((g) => g.items)
  return {
    orderId: order.orderId,
    status: order.status,
    orderedAt: order.orderedAt,
    representativeProductName: items[0]?.productName ?? '',
    itemCount: items.length,
    totalAmount: order.totalAmount,
  }
})

/** 주문 184의 첫 판매자 묶음 상품 상태만 바꾼 상세 (미리보기·상태 확인용) */
export function orderWithItemStatus(status: OrderItemStatus): OrderDetail {
  const [first] = orderDetails
  if (!first) throw new Error('fixtures: 주문 없음')
  const [head, ...rest] = first.sellerGroups
  if (!head) throw new Error('fixtures: 판매자 묶음 없음')
  return {
    ...first,
    sellerGroups: [{ ...head, items: head.items.map((i) => ({ ...i, status })) }, ...rest],
  }
}

/** 도서산간 주문 (추가 운임이 붙은 상세, 미리보기용) */
export const remoteAreaOrder: OrderDetail = detail(185, OrderStatus.PAID, '2026-10-19T10:05:00', [
  { ...group(7, [apple(OrderItemStatus.PREPARING)]), shippingFee: 3000, remoteAreaFee: 5000 },
])

// ─── 배송 (✅ GET /shipments · /shipments/{id}) — 테스트(MSW)·/__design 전용 ───────────

const rowItem = ({
  orderItemId,
  productId,
  productName,
  productOptionName,
  quantity,
  itemAmount,
}: OrderDetailItem): OrderItemRowItem => ({
  orderItemId,
  productId,
  productName,
  productOptionName,
  quantity,
  itemAmount,
})

const shipmentAddress: ShipmentAddress = {
  recipientName: recipient.recipientName,
  recipientPhone: '01024681357',
  postalCode: recipient.zipCode,
  address: recipient.address,
  addressDetail: recipient.addressDetail ?? '',
  deliveryNote: '문 앞에 놓아 주세요',
}

export const shippingShipment: ShipmentDetail = {
  shipmentId: 3,
  orderId: 151,
  status: ShipmentStatus.SHIPPING,
  carrier: ShipmentCarrier.CJ_LOGISTICS,
  trackingNumber: '684219375520',
  address: shipmentAddress,
  regionGroup: 'GENERAL',
  chargedShippingFee: 3000,
  additionalShippingFee: 0,
  estimatedShipDate: '2026-10-17',
  estimatedDeliveryStart: '2026-10-18',
  estimatedDeliveryEnd: '2026-10-19',
  delayed: false,
  createdAt: '2026-10-15T09:20:00',
  shippedAt: '2026-10-17T15:20:00',
  deliveredAt: null,
  completedAt: null,
  cancelledAt: null,
  items: [
    {
      orderItemId: 1511,
      productName: '제주 노지 조생 감귤',
      optionName: '3kg (S~M)',
      quantity: 1,
      unitPrice: 13900,
      canceledQuantity: 0,
      confirmed: false,
    },
  ],
  latestAddressChange: null,
}

export const deliveredShipment: ShipmentDetail = {
  ...shippingShipment,
  status: ShipmentStatus.DELIVERED,
  deliveredAt: '2026-10-18T13:40:00',
}

export const completedShipment: ShipmentDetail = {
  ...deliveredShipment,
  status: ShipmentStatus.COMPLETED,
  completedAt: '2026-10-21T13:40:00',
  items: shippingShipment.items.map((item) => ({ ...item, confirmed: true })),
}

export const preparingShipment: ShipmentDetail = {
  ...shippingShipment,
  status: ShipmentStatus.PREPARING,
  carrier: null,
  trackingNumber: null,
  shippedAt: null,
}

export const delayedShipment: ShipmentDetail = {
  ...preparingShipment,
  delayed: true,
  estimatedDeliveryStart: '2026-10-16',
  estimatedDeliveryEnd: '2026-10-17',
}

export const cancelledShipment: ShipmentDetail = {
  ...preparingShipment,
  status: ShipmentStatus.CANCELLED,
  cancelledAt: '2026-10-16T09:00:00',
  items: shippingShipment.items.map((item) => ({ ...item, canceledQuantity: item.quantity })),
}

/** 도서산간 배송지로 바꿔 달라는 요청이 승인된 배송 */
export const addressChangedShipment: ShipmentDetail = {
  ...preparingShipment,
  regionGroup: 'JEJU_MAIN',
  additionalShippingFee: 3000,
  latestAddressChange: {
    requestId: 5,
    status: 'APPROVED',
    requestedAddress: {
      ...shipmentAddress,
      postalCode: '63000',
      address: '제주특별자치도 제주시 첨단로 242',
      addressDetail: '1층',
    },
    additionalFeeNotice: 3000,
    rejectReason: null,
    requestedAt: '2026-10-15T10:00:00',
    processedAt: '2026-10-15T11:00:00',
  },
}

export const shipmentDetails: ShipmentDetail[] = [
  shippingShipment,
  { ...deliveredShipment, shipmentId: 4, orderId: 93 },
]

export const shipmentSummaries: ShipmentSummary[] = shipmentDetails.map((shipment) => {
  const [first] = shipment.items
  return {
    shipmentId: shipment.shipmentId,
    orderId: shipment.orderId,
    status: shipment.status,
    carrier: shipment.carrier,
    trackingNumber: shipment.trackingNumber,
    estimatedDeliveryStart: shipment.estimatedDeliveryStart,
    estimatedDeliveryEnd: shipment.estimatedDeliveryEnd,
    delayed: shipment.delayed,
    createdAt: shipment.createdAt,
    representativeProductName: first?.productName ?? '',
    otherItemCount: Math.max(shipment.items.length - 1, 0),
  }
})

// ─── 고객센터 문의 (❌ API 없음) ──────────────────────────

export const inquiryTargets: InquiryTarget[] = [
  { ...rowItem(sweetPotato5), sellerName: '땅끝고구마농장', orderNumber: '20261012-0093' },
]

export const inquiries: Inquiry[] = [
  {
    inquiryId: 2,
    inquiryNumber: 'CS-20261013-0042',
    type: InquiryType.WRONG_ITEM,
    orderNumber: '20261006-0027',
    productName: '청송 사과즙 100% (30포)',
    content: '30포를 주문했는데 25포만 들어 있었어요.',
    photoCount: 1,
    createdAt: '2026-10-13T10:20:00',
    answer: null,
  },
  {
    inquiryId: 1,
    inquiryNumber: 'CS-20261008-0017',
    type: InquiryType.DAMAGED,
    orderNumber: '20260930-0105',
    productName: '제주 노지 조생 감귤',
    content: '상자 한쪽이 눌려서 감귤 4개가 터져 있었어요.',
    photoCount: 2,
    createdAt: '2026-10-08T19:02:00',
    answer: {
      content:
        '불편을 드려 죄송해요. 판매자와 확인해 터진 4개 금액(2,200원)을 예치금으로 돌려드렸어요.',
      answeredAt: '2026-10-09T14:10:00',
    },
  },
]
