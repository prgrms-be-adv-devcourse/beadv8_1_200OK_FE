// 리뷰할 상품(화면 위 상품 요약). 수정 화면은 리뷰 응답에 주문 정보가 없어 orderId·판매자·수량을 모른다.
export type ReviewTarget = {
  productId: number
  productOptionId: number
  productName: string
  optionName: string
  thumbnailUrl: string
  /** 주문에서 왔을 때만. 있으면 뒤로·취소가 주문 상세로 간다 */
  orderId?: number
  sellerName?: string
  quantity?: number
}

// 리뷰를 쓸 주문 상품. 작성 API는 productOptionId·orderId·orderItemId를 받는다.
// TODO(api): orderId·orderItemId와 상품 정보를 줄 주문 조회 API가 없다(PLAN 2-5) → 지금은 fixtures + 쿼리(target.ts).
export type ReviewOrderItem = ReviewTarget & {
  orderId: number
  orderItemId: number
}
