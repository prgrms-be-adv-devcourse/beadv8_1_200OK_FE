import { ProductStatus, type ProductSummary } from '@/shared/api/types'

// 구매자 화면의 상품 판매 상태. 서버 값(status·soldOut)과 판매자 정지 여부를 합쳐 하나로 정한다.
// 판매 중이고 재고가 있으면 null(배지 없음). DECISIONS.md A-11, C-9

export enum ProductSaleState {
  UPCOMING = 'UPCOMING', // status READY
  SOLD_OUT = 'SOLD_OUT', // ON_SALE인데 모든 옵션 품절
  PAUSED = 'PAUSED', // status PAUSED
  ENDED = 'ENDED', // status ENDED
  SELLER_SUSPENDED = 'SELLER_SUSPENDED', // 판매자 정지 (API 미정, 화면에서 따로 받는다)
}

export const productSaleStateLabels: Record<ProductSaleState, string> = {
  [ProductSaleState.UPCOMING]: '판매 예정',
  [ProductSaleState.SOLD_OUT]: '일시 품절',
  [ProductSaleState.PAUSED]: '일시 중지',
  [ProductSaleState.ENDED]: '판매 종료',
  [ProductSaleState.SELLER_SUSPENDED]: '판매 중지',
}

export function getProductSaleState(
  product: Pick<ProductSummary, 'status' | 'soldOut'>,
  { sellerSuspended = false }: { sellerSuspended?: boolean } = {},
): ProductSaleState | null {
  if (sellerSuspended) return ProductSaleState.SELLER_SUSPENDED
  switch (product.status) {
    case ProductStatus.ENDED:
      return ProductSaleState.ENDED
    case ProductStatus.PAUSED:
      return ProductSaleState.PAUSED
    case ProductStatus.READY:
      return ProductSaleState.UPCOMING
    case ProductStatus.ON_SALE:
      return product.soldOut ? ProductSaleState.SOLD_OUT : null
  }
}
