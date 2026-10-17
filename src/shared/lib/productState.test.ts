import { ProductStatus } from '@/shared/api/types'
import { getProductSaleState, ProductSaleState } from './productState'

describe('getProductSaleState', () => {
  it('판매 중이고 재고가 있으면 상태 없음', () => {
    expect(getProductSaleState({ status: ProductStatus.ON_SALE, soldOut: false })).toBeNull()
  })

  it('판매 중인데 모두 품절이면 일시 품절', () => {
    expect(getProductSaleState({ status: ProductStatus.ON_SALE, soldOut: true })).toBe(
      ProductSaleState.SOLD_OUT,
    )
  })

  it('서버 status를 구매자 상태로 바꾼다', () => {
    expect(getProductSaleState({ status: ProductStatus.READY, soldOut: false })).toBe(
      ProductSaleState.UPCOMING,
    )
    expect(getProductSaleState({ status: ProductStatus.PAUSED, soldOut: true })).toBe(
      ProductSaleState.PAUSED,
    )
    expect(getProductSaleState({ status: ProductStatus.ENDED, soldOut: true })).toBe(
      ProductSaleState.ENDED,
    )
  })

  it('판매자 정지가 가장 우선한다', () => {
    expect(
      getProductSaleState(
        { status: ProductStatus.ON_SALE, soldOut: false },
        { sellerSuspended: true },
      ),
    ).toBe(ProductSaleState.SELLER_SUSPENDED)
  })
})
