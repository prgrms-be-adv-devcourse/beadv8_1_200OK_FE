import type { CartGroup } from './types'

// 1단계 샘플 데이터. 상품·농가 값은 products/fixtures.ts와 같다(DECISIONS.md E).
// 주문서(checkout/fixtures.ts)는 이 장바구니에서 사과·고구마를 고른 상태다.

export const cartGroups: CartGroup[] = [
  {
    sellerId: 7,
    sellerName: '청송 햇살농원',
    lines: [
      {
        cartItemId: 1,
        productOptionId: 1012,
        quantity: 1,
        selected: true,
        productId: 101,
        productName: '청송 꿀사과 부사',
        optionName: '2kg (11~13과)',
        unitPrice: 23900,
        thumbnailUrl: '',
      },
    ],
  },
  {
    sellerId: 8,
    sellerName: '땅끝고구마농장',
    lines: [
      {
        cartItemId: 2,
        productOptionId: 1021,
        quantity: 1,
        selected: true,
        productId: 102,
        productName: '해남 꿀고구마 베니하루카',
        optionName: '3kg 한입 크기',
        unitPrice: 15900,
        thumbnailUrl: '',
      },
    ],
  },
]

export const unavailableGroup: CartGroup = {
  sellerId: 10,
  sellerName: '대관령 고원농장',
  lines: [
    {
      cartItemId: 3,
      productOptionId: 1042,
      quantity: 1,
      selected: false,
      productId: 104,
      productName: '평창 고랭지 알배기배추',
      optionName: '4포기',
      unitPrice: 17900,
      thumbnailUrl: '',
      unavailableReason: '일시 품절이라 지금은 구매할 수 없어요',
    },
  ],
}
