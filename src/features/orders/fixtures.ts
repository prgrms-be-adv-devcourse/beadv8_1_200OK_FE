import { OrderItemStatus, type ShippingAddress } from '@/shared/api/types'
import {
  type Inquiry,
  type InquiryTarget,
  InquiryType,
  type OrderDetail,
  type OrderItem,
  type OrderShipment,
  type OrderSummary,
  ShipmentStage,
  type ShipmentTracking,
} from './types'

// 1단계 샘플 데이터 (DECISIONS.md E). 주문 184는 checkout/fixtures.ts에서 결제한 그 주문이다(39,800원).
// 배송비는 지금 API 값(0원)으로 둔다(A-8).

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
  optionName: string,
  itemAmount: number,
): OrderItem => ({
  orderItemId,
  productId,
  productOptionId,
  productName,
  optionName,
  quantity: 1,
  itemAmount,
  thumbnailUrl: '',
})

const apple = item(1841, 101, 1012, '청송 꿀사과 부사', '2kg (11~13과)', 23900)
const sweetPotato = item(1842, 102, 1021, '해남 꿀고구마 베니하루카', '3kg 한입 크기', 15900)
const tangerine = item(1511, 103, 1031, '제주 노지 조생 감귤', '3kg (S~M)', 13900)
const cabbage = item(1401, 104, 1041, '평창 고랭지 알배기배추', '2포기', 9900)
const sweetPotato5 = item(931, 102, 1022, '해남 꿀고구마 베니하루카', '5kg 중간 크기', 23900)
const appleJuice = item(271, 106, 1061, '청송 사과즙 100% (30포)', '120ml × 30포', 29900)

const shipment = (
  shipmentId: number,
  sellerId: number,
  sellerName: string,
  status: OrderItemStatus,
  items: OrderItem[],
  extra: Partial<OrderShipment> = {},
): OrderShipment => ({
  shipmentId,
  sellerId,
  sellerName,
  status,
  shippingFee: 0,
  carrier: null,
  trackingNumber: null,
  addressChangeRequested: false,
  autoConfirmAt: null,
  claimId: null,
  refundedAmount: null,
  refundedAt: null,
  items,
  ...extra,
})

const detail = (
  orderId: number,
  orderNumber: string,
  orderedAt: string,
  shipments: OrderShipment[],
): OrderDetail => {
  const total = shipments.flatMap((s) => s.items).reduce((sum, i) => sum + i.itemAmount, 0)
  return {
    orderId,
    orderNumber,
    orderedAt,
    recipient,
    totalProductAmount: total,
    totalShippingFee: 0,
    totalAmount: total,
    shipments,
  }
}

const invoice = { carrier: 'CJ대한통운', trackingNumber: '6842 1937 5520' }

export const orderDetails: OrderDetail[] = [
  detail(184, '20261018-0184', '2026-10-18T14:30:00', [
    shipment(1, 7, '청송 햇살농원', OrderItemStatus.PREPARING, [apple]),
    shipment(2, 8, '땅끝고구마농장', OrderItemStatus.PREPARING, [sweetPotato]),
  ]),
  detail(151, '20261015-0151', '2026-10-15T09:12:00', [
    shipment(3, 9, '서귀포 귤빛농장', OrderItemStatus.SHIPPING, [tangerine], invoice),
  ]),
  detail(140, '20261014-0140', '2026-10-14T20:05:00', [
    shipment(4, 10, '대관령 고원농장', OrderItemStatus.CANCELED, [cabbage], {
      refundedAmount: 9900,
      refundedAt: '2026-10-14T21:30:00',
    }),
  ]),
  detail(93, '20261012-0093', '2026-10-12T11:40:00', [
    shipment(5, 8, '땅끝고구마농장', OrderItemStatus.DELIVERED, [sweetPotato5], {
      ...invoice,
      trackingNumber: '6842 1937 4410',
      autoConfirmAt: '2026-10-19T21:40:00',
    }),
  ]),
  detail(27, '20261006-0027', '2026-10-06T08:20:00', [
    shipment(6, 7, '청송 햇살농원', OrderItemStatus.PURCHASE_CONFIRMED, [appleJuice], {
      ...invoice,
      trackingNumber: '6842 1937 1180',
    }),
  ]),
]

export const orderSummaries: OrderSummary[] = orderDetails.map((order) => ({
  orderId: order.orderId,
  orderNumber: order.orderNumber,
  orderedAt: order.orderedAt,
  totalAmount: order.totalAmount,
  items: order.shipments.flatMap((s) =>
    s.items.map((i) => ({ ...i, sellerName: s.sellerName, status: s.status })),
  ),
}))

/** 주문 184의 첫 묶음 상태만 바꾼 상세 (미리보기·상태 확인용) */
export function orderWithStatus(status: OrderItemStatus, extra: Partial<OrderShipment> = {}) {
  const [first] = orderDetails
  if (!first) throw new Error('fixtures: 주문 없음')
  const [head, ...rest] = first.shipments
  if (!head) throw new Error('fixtures: 배송 묶음 없음')
  const withInvoice =
    status === OrderItemStatus.SHIPPING ||
    status === OrderItemStatus.DELIVERED ||
    status === OrderItemStatus.PURCHASE_CONFIRMED
  return {
    ...first,
    shipments: [
      {
        ...head,
        status,
        ...(withInvoice ? invoice : {}),
        ...(status === OrderItemStatus.DELIVERED ? { autoConfirmAt: '2026-10-21T21:40:00' } : {}),
        ...(status === OrderItemStatus.CANCEL_REQUESTED ? { claimId: 77 } : {}),
        ...(status === OrderItemStatus.CANCELED
          ? { refundedAmount: head.items[0]?.itemAmount ?? 0, refundedAt: '2026-10-18T15:02:00' }
          : {}),
        ...extra,
      },
      ...rest,
    ],
  }
}

// ─── 배송 조회 ───────────────────────────────────────────

export const shippingTracking: ShipmentTracking = {
  shipmentId: 3,
  orderId: 151,
  orderNumber: '20261015-0151',
  orderedAt: '2026-10-15T09:12:00',
  sellerName: '서귀포 귤빛농장',
  stage: ShipmentStage.SHIPPING,
  carrier: 'CJ대한통운',
  trackingNumber: '6842 1937 5520',
  estimatedArrival: '2026-10-18T00:00:00',
  deliveredAt: null,
  autoConfirmAt: null,
  delay: null,
  events: [
    {
      at: '2026-10-18T07:10:00',
      status: '배송 출발',
      location: '서울중구B 대리점',
      description: '배송 기사가 상품을 싣고 출발했어요',
    },
    { at: '2026-10-17T22:30:00', status: '간선 하차', location: '곤지암 Hub' },
    { at: '2026-10-17T16:10:00', status: '간선 상차', location: '제주서귀포 대리점' },
    {
      at: '2026-10-17T15:20:00',
      status: '집화 처리',
      location: '제주서귀포 대리점',
      description: '택배사가 상품을 받았어요',
    },
  ],
  items: [tangerine],
  recipient: { recipientName: recipient.recipientName, address: recipient.address },
}

export const deliveredTracking: ShipmentTracking = {
  ...shippingTracking,
  stage: ShipmentStage.DELIVERED,
  deliveredAt: '2026-10-18T13:40:00',
  autoConfirmAt: '2026-10-21T13:40:00',
  events: [
    {
      at: '2026-10-18T13:40:00',
      status: '배송 완료',
      location: '서울중구B 대리점',
      description: '배송 기사가 배송을 마쳤어요',
    },
    ...shippingTracking.events,
  ],
}

export const preparingTracking: ShipmentTracking = {
  ...shippingTracking,
  stage: ShipmentStage.PREPARING,
  carrier: null,
  trackingNumber: null,
  estimatedArrival: null,
  events: [],
}

export const delayedTracking: ShipmentTracking = {
  ...preparingTracking,
  stage: ShipmentStage.DELAYED,
  delay: {
    reason: '수확 지연',
    newShipDate: '2026-10-21T00:00:00',
    notifiedAt: '2026-10-16T17:05:00',
  },
}

export const trackings: ShipmentTracking[] = [shippingTracking]

// ─── 고객센터 문의 ───────────────────────────────────────

export const inquiryTargets: InquiryTarget[] = [
  { ...sweetPotato5, sellerName: '땅끝고구마농장', orderNumber: '20261012-0093' },
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
