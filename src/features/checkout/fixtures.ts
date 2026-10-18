import type { Checkout, ShippingAddress } from '@/shared/api/types'

// 1단계 샘플 데이터. cart/fixtures.ts에서 사과·고구마를 고른 주문서다(DECISIONS.md E).
// 금액 흐름: 상품 39,800 + 배송비 0(API 현재값) = 39,800원
//   잔액 충분 128,000 → 결제 후 88,200 / 잔액 부족 32,000 → 7,800 부족 → 최소 20,000 충전 → 52,000 → 결제 후 12,200

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
