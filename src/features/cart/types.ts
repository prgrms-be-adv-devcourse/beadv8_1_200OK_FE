import type { CartItem } from '@/shared/api/types'

// 장바구니 한 줄. 조회 API(CartItem)는 cartItemId·productOptionId·quantity·selected만 주므로
// 상품명·옵션명·가격·사진은 옵션별 상품 상세로 보강한다(PLAN 2-3).
// TODO(api): 조회에 productId가 없어 이 브라우저에서 담을 때 적어 둔 옵션 → 상품 표(optionProducts.ts)로 찾는다.
//   찾지 못한 옵션은 productId가 null이고 상품 정보 없이 그린다.
export type CartLine = CartItem & {
  productId: number | null
  productName: string
  optionName: string
  /** 상품·옵션을 모르면 null (값을 그리지 않는다) */
  unitPrice: number | null
  thumbnailUrl: string
  /** 지금 살 수 없는 이유 (품절·판매 중지 등). 없으면 살 수 있음 */
  unavailableReason?: string | null
}

// TODO(api): 판매자(농가)가 장바구니 조회·상품 상세에 없다. 모르면 sellerId·sellerName이 null이고 농가 머리말 없이 한 묶음으로 그린다
export type CartGroup = { sellerId: number | null; sellerName: string | null; lines: CartLine[] }
