import type { ProductReview } from '@/shared/api/types'
import { ReviewMediaType } from '@/shared/api/types'
import type { ReviewOrderItem } from './types'

// 샘플 데이터(1단계 화면 · 상태 갤러리 · 2단계 주문 상품 임시값). orders/fixtures.ts 주문 27(구매확정)의 사과즙, products/fixtures.ts의 내 리뷰(5003)와 같은 값이다.

export const reviewTarget: ReviewOrderItem = {
  orderId: 27,
  orderItemId: 271,
  productId: 106,
  productOptionId: 1061,
  productName: '청송 사과즙 100% (30포)',
  optionName: '120ml × 30포',
  quantity: 1,
  sellerName: '청송 햇살농원',
  thumbnailUrl: '',
}

export const myReview: ProductReview = {
  reviewId: 5003,
  productId: 101,
  productOptionId: 1012,
  optionName: '2kg (11~13과)',
  memberId: 21,
  rating: 9,
  content: '아이 간식으로 깎아 줬는데 아삭하고 단맛이 진해요. 크기도 고르게 왔어요.',
  media: [
    { type: ReviewMediaType.IMAGE, url: '' },
    { type: ReviewMediaType.IMAGE, url: '' },
  ],
  createdAt: '2026-10-12T10:20:00Z',
  updatedAt: '2026-10-12T10:20:00Z',
}

// 내 리뷰를 쓴 이전 주문 (orders/fixtures.ts 목록보다 오래된 주문)
export const myReviewTarget: ReviewOrderItem = {
  orderId: 12,
  orderItemId: 121,
  productId: 101,
  productOptionId: 1012,
  productName: '청송 꿀사과 부사',
  optionName: '2kg (11~13과)',
  quantity: 1,
  sellerName: '청송 햇살농원',
  thumbnailUrl: '',
}
