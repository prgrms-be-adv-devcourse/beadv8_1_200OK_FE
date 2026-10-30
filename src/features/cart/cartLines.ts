import { isApiError } from '@/shared/api/ApiError'
import type { CartItem, ProductDetail } from '@/shared/api/types'
import { getProductSaleState, ProductSaleState } from '@/shared/lib/productState'
import type { CartGroup, CartLine } from './types'

// 장바구니 조회(옵션 ID·수량·선택)에 상품 상세를 붙여 화면 줄로 바꾼다.
// 살 수 있는지는 상세의 판매 상태·옵션 품절로 판단한다. 서버가 담기에서 아직 확인하지 않아
// 없는 옵션·판매 예정·품절 옵션도 담길 수 있다(2026-10-18 확인).

export type DetailResult = { data?: ProductDetail; error: unknown }

const saleReasons: Record<ProductSaleState, string> = {
  [ProductSaleState.SOLD_OUT]: '일시 품절이라 지금은 구매할 수 없어요',
  [ProductSaleState.UPCOMING]: '판매 예정 상품이라 아직 구매할 수 없어요',
  [ProductSaleState.PAUSED]: '판매가 잠시 중지돼 지금은 구매할 수 없어요',
  [ProductSaleState.ENDED]: '판매가 종료된 상품이에요',
  [ProductSaleState.SELLER_SUSPENDED]: '판매가 중지된 농가의 상품이라 지금은 구매할 수 없어요',
}

const unknownLine = (
  item: CartItem,
  productId: number | null,
  productName: string,
  reason: string,
): CartLine => ({
  ...item,
  productId,
  productName,
  optionName: `옵션 번호 ${item.productOptionId}`,
  unitPrice: null,
  thumbnailUrl: '',
  unavailableReason: reason,
})

export function toCartLine(
  item: CartItem,
  productId: number | null,
  detail: DetailResult | undefined,
): CartLine {
  if (productId === null) {
    // TODO(api): 조회에 productId가 없어 이 브라우저에서 담지 않은 옵션은 상품을 알 수 없다
    return unknownLine(
      item,
      null,
      '상품 정보를 찾을 수 없어요',
      '빼고 상품 페이지에서 다시 담아 주세요',
    )
  }
  const product = detail?.data
  if (!product) {
    return isApiError(detail?.error) && detail.error.status === 404
      ? unknownLine(
          item,
          null,
          '판매가 끝난 상품',
          '판매가 끝났거나 숨겨진 상품이라 지금은 구매할 수 없어요',
        )
      : unknownLine(
          item,
          productId,
          '상품 정보를 불러오지 못했어요',
          '상품 정보를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요',
        )
  }

  const option = product.options.find((o) => o.optionId === item.productOptionId)
  const base = {
    ...item,
    productId,
    productName: product.name,
    thumbnailUrl: product.imageUrls[0] ?? '',
  }
  if (!option) {
    return {
      ...base,
      optionName: '없어진 옵션',
      unitPrice: null,
      unavailableReason: '선택한 옵션이 없어졌어요. 빼고 다시 담아 주세요',
    }
  }
  const saleState = option.soldOut
    ? ProductSaleState.SOLD_OUT
    : getProductSaleState({ status: product.status, soldOut: false })
  return {
    ...base,
    optionName: option.name,
    unitPrice: option.salePrice,
    unavailableReason: saleState ? saleReasons[saleState] : null,
  }
}

/** 서버 순서(옵션 ID 순)를 지킨다. TODO(api): 판매자 정보가 없어 농가별로 나누지 못하고 한 묶음으로 둔다 */
export function toCartGroups(
  items: CartItem[],
  productIdOf: (optionId: number) => number | null,
  detailOf: (productId: number) => DetailResult | undefined,
): CartGroup[] {
  if (items.length === 0) return []
  const lines = items.map((item) => {
    const productId = productIdOf(item.productOptionId)
    return toCartLine(item, productId, productId === null ? undefined : detailOf(productId))
  })
  return [{ sellerId: null, sellerName: null, lines }]
}
