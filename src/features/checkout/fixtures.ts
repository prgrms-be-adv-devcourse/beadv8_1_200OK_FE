import {
  type Checkout,
  type OrderDetail,
  OrderItemStatus,
  OrderStatus,
  type ShippingAddress,
  type ShippingFeeQuote,
} from '@/shared/api/types'

// 샘플 데이터. cart/fixtures.ts에서 사과·고구마를 고른 주문서다(DECISIONS.md E).
// 금액 흐름: 상품 39,800 + 배송비 0 = 39,800원 (실서버는 판매자별 3,000원이지만 샘플 흐름 금액을 지키려고 0으로 둔다)
//   잔액 충분 128,000 → 결제 후 88,200 / 잔액 부족 32,000 → 7,800 부족 → 10,000 충전 → 42,000 → 결제 후 2,200

export const checkoutSample: Checkout = {
  sellerGroups: [
    {
      sellerId: 7,
      shippingFee: 0,
      items: [
        {
          productOptionId: 1012,
          productName: '청송 꿀사과 부사',
          productOptionName: '2kg (11~13과)',
          unitPrice: 23900,
          quantity: 1,
          itemAmount: 23900,
        },
      ],
    },
    {
      sellerId: 8,
      shippingFee: 0,
      items: [
        {
          productOptionId: 1021,
          productName: '해남 꿀고구마 베니하루카',
          productOptionName: '3kg 한입 크기',
          unitPrice: 15900,
          quantity: 1,
          itemAmount: 15900,
        },
      ],
    },
  ],
  totalProductAmount: 39800,
  totalShippingFee: 0,
  totalAmount: 39800,
}

export const sellerNames: Record<number, string> = { 7: '청송 햇살농원', 8: '땅끝고구마농장' }

export const BALANCE_ENOUGH = 128000
export const BALANCE_SHORT = 32000

export const savedAddress: ShippingAddress = {
  recipientName: '이서연',
  recipientPhone: '010-2468-1357',
  zipCode: '04524',
  address: '서울 중구 세종대로 110',
  addressDetail: '3층 301호',
}

export const SAMPLE_ORDER_ID = 184

/** 주문 완료 화면용 주문 상세(GET /orders/184). orders/fixtures.ts의 주문 184와 같은 값 */
export const completedOrderSample: OrderDetail = {
  orderId: SAMPLE_ORDER_ID,
  status: OrderStatus.PAID,
  orderedAt: '2026-10-18T14:30:00',
  ...savedAddress,
  addressDetail: savedAddress.addressDetail ?? '',
  sellerGroups: checkoutSample.sellerGroups.map((group, g) => ({
    sellerId: group.sellerId,
    shippingFee: group.shippingFee,
    remoteAreaFee: 0,
    items: group.items.map((item, i) => ({
      orderItemId: SAMPLE_ORDER_ID * 10 + g * 2 + i + 1,
      productId: group.sellerId === 7 ? 101 : 102,
      productOptionId: item.productOptionId,
      productName: item.productName,
      productOptionName: item.productOptionName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      itemAmount: item.itemAmount,
      status: OrderItemStatus.PREPARING,
    })),
  })),
  totalProductAmount: checkoutSample.totalProductAmount,
  totalShippingFee: checkoutSample.totalShippingFee,
  totalRemoteAreaFee: 0,
  totalAmount: checkoutSample.totalAmount,
}

// ─── 배송비 견적 (POST /shipments/fee-quotes) ───────────────────────────
// 일반 지역(서울 04524): 추가 운임 0 → 총 39,800. 도서산간(제주 63000): 판매자마다 +3,000 → 총 45,800

const quoteSeller = (sellerId: number, regionSurcharge: number) => ({
  sellerId,
  baseShippingFee: 0,
  regionSurcharge,
  shippingFee: regionSurcharge,
  expectedShipDate: '2026-10-21',
  arrivalStartDate: '2026-10-23',
  arrivalEndDate: '2026-10-26',
})

export const feeQuoteSample: ShippingFeeQuote = {
  regionGroup: 'GENERAL',
  sellers: [quoteSeller(7, 0), quoteSeller(8, 0)],
  totalShippingFee: 0,
}

export const remoteQuoteSample: ShippingFeeQuote = {
  regionGroup: 'JEJU_MAIN',
  sellers: [
    { ...quoteSeller(7, 3000), arrivalStartDate: '2026-10-27', arrivalEndDate: '2026-10-28' },
    { ...quoteSeller(8, 3000), arrivalStartDate: '2026-10-27', arrivalEndDate: '2026-10-28' },
  ],
  totalShippingFee: 6000,
}

export const REMOTE_TOTAL = 45800
