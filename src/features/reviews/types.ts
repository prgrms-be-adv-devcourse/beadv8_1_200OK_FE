// 리뷰할 상품(화면 위 상품 요약). 수정 화면은 리뷰 응답에 주문 정보가 없어 orderId·판매자·수량을 모른다.
export type ReviewTarget = {
  productId: number
  productOptionId: number
  productName: string
  optionName: string
  thumbnailUrl: string
  /** 주문에서 왔을 때만. 있으면 뒤로·취소가 주문 상세로 간다 */
  orderId?: number
  /** TODO(api): 주문 상세에 판매자 이름이 없다(sellerId만) */
  sellerName?: string
  quantity?: number
}

// 리뷰를 쓸 주문 상품. 작성 API는 orderItemId만 받고(주문·옵션은 서버가 찾는다), 화면에 쓰는 값은 ✅ 주문 상세(GET /orders/{orderId})에서 온다(target.ts).
export type ReviewOrderItem = ReviewTarget & {
  orderId: number
  orderItemId: number
}
