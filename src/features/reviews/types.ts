// 리뷰를 쓸 주문 상품. 작성 API는 productOptionId·orderId·orderItemId를 받는다.
// TODO(api): orderId·orderItemId와 상품 정보를 줄 주문 조회 API가 없다(PLAN 2-5) → 지금은 fixtures.
export type ReviewTarget = {
  orderId: number
  orderItemId: number
  productId: number
  productOptionId: number
  productName: string
  optionName: string
  quantity: number
  sellerName: string
  thumbnailUrl: string
}
