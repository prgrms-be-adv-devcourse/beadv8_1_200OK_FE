import type { OrderDetail, ProductDetail, ProductReview } from '@/shared/api/types'
import type { ReviewOrderItem, ReviewTarget } from './types'

// 리뷰 화면 위 상품 요약을 만든다. 작성은 주문 상세(✅ GET /orders/{orderId})의 주문 상품에서, 수정은 리뷰 응답에서.

const positiveInt = (value: string | null) => {
  const number = Number(value)
  return value && Number.isInteger(number) && number > 0 ? number : undefined
}

/** /reviews/new?orderId=&orderItemId= 의 번호. 둘 중 하나라도 없거나 잘못됐으면 null */
export function orderItemFromQuery(
  params: URLSearchParams,
): { orderId: number; orderItemId: number } | null {
  const orderId = positiveInt(params.get('orderId'))
  const orderItemId = positiveInt(params.get('orderItemId'))
  return orderId && orderItemId ? { orderId, orderItemId } : null
}

/** 주문 상세에서 리뷰를 쓸 주문 상품을 찾는다. 이 주문에 없는 상품이면 null. 사진은 상품 상세(withProduct)로 채운다 */
export function targetFromOrder(order: OrderDetail, orderItemId: number): ReviewOrderItem | null {
  const item = order.sellerGroups
    .flatMap((group) => group.items)
    .find((candidate) => candidate.orderItemId === orderItemId)
  if (!item) return null
  return {
    productId: item.productId,
    productOptionId: item.productOptionId,
    orderId: order.orderId,
    orderItemId: item.orderItemId,
    productName: item.productName,
    optionName: item.productOptionName,
    quantity: item.quantity,
    thumbnailUrl: '',
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
