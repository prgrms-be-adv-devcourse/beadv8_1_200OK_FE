import type { CartItem } from '@/shared/api/types'

// 장바구니 한 줄. 조회 API(CartItem)는 cartItemId·productOptionId·quantity·selected만 주므로
// 상품명·옵션명·가격·사진은 옵션별 상품 상세로 보강한다(PLAN 2-3).
// TODO(api): 판매자(농가)와 구매 가능 여부도 조회에 없다. 지금은 fixtures 값.
export type CartLine = CartItem & {
  productId: number
  productName: string
  optionName: string
  unitPrice: number
  thumbnailUrl: string
  /** 지금 살 수 없는 이유 (품절·판매 중지 등). 없으면 살 수 있음 */
  unavailableReason?: string | null
}

export type CartGroup = { sellerId: number; sellerName: string; lines: CartLine[] }
