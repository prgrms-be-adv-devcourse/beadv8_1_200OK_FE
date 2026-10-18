import type { ProductDetail, ProductReview } from '@/shared/api/types'
import { myReviewTarget, reviewTarget } from './fixtures'
import type { ReviewOrderItem, ReviewTarget } from './types'

// 리뷰 화면 위 상품 요약을 만든다.
// TODO(api): 주문 조회 API가 없어 /reviews/new?orderItemId= 의 주문 상품을 fixtures에서 찾는다(PLAN 2-5).
//   실제 서버로 확인할 때는 ?orderId=&productId=&productOptionId= 로 덮어쓴다(서버가 아직 주문을 검증하지 않음).
//   주문 상품 조회가 생기면 orderItemId로 조회해 orderId·productId·productOptionId·판매자·수량을 받는다.

const fixtureItems: ReviewOrderItem[] = [reviewTarget, myReviewTarget]

const positiveInt = (value: string | null) => {
  const number = Number(value)
  return value && Number.isInteger(number) && number > 0 ? number : undefined
}

/** orderItemId가 없거나 잘못됐으면 null */
export function orderItemFromQuery(params: URLSearchParams): ReviewOrderItem | null {
  const orderItemId = positiveInt(params.get('orderItemId'))
  if (!orderItemId) return null
  const base = fixtureItems.find((item) => item.orderItemId === orderItemId) ?? reviewTarget
  return {
    ...base,
    orderItemId,
    orderId: positiveInt(params.get('orderId')) ?? base.orderId,
    productId: positiveInt(params.get('productId')) ?? base.productId,
    productOptionId: positiveInt(params.get('productOptionId')) ?? base.productOptionId,
  }
}

/** 수정 화면: 리뷰 응답에는 주문·판매자·수량이 없다 */
export function targetFromReview(review: ProductReview): ReviewTarget {
  return {
    productId: review.productId,
    productOptionId: review.productOptionId,
    productName: '',
    optionName: review.optionName,
    thumbnailUrl: '',
  }
}

/** 상품 상세를 받았으면 이름·대표 사진·옵션 이름을 그것으로. 못 받았으면(숨김·삭제 404 등) 가진 값으로 */
export function withProduct<T extends ReviewTarget>(
  target: T,
  product: ProductDetail | undefined,
): T {
  const option = product?.options.find((item) => item.optionId === target.productOptionId)
  return {
    ...target,
    productName: product?.name || target.productName || '상품 정보를 불러오지 못했어요',
    thumbnailUrl: product?.imageUrls[0] ?? target.thumbnailUrl,
    optionName: option?.name ?? target.optionName,
  }
}
