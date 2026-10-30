import { HttpResponse, http } from 'msw'
import { myReview } from '@/features/reviews/fixtures'

// 리뷰 작성·수정·삭제·내 리뷰 기본 응답 (reviews fixtures). 내 리뷰는 myReview(5003) 한 건.
// 실패 시나리오(401·403·404·409·422)는 테스트에서 server.use(...)로 덮는다.
// 상품 리뷰 목록 GET /products/{productId}/reviews는 products 핸들러가 맡는다.

export const reviewHandlers = [
  http.get('*/api/v1/reviews/me', ({ request }) => {
    const size = Number(new URL(request.url).searchParams.get('size') ?? 20)
    return HttpResponse.json({
      content: [myReview],
      page: 0,
      size,
      totalElements: 1,
      totalPages: 1,
    })
  }),

  http.post('*/api/v1/products/:productId/reviews', () =>
    HttpResponse.json({ reviewId: 9001 }, { status: 201 }),
  ),

  http.put('*/api/v1/reviews/:reviewId', () => new HttpResponse(null, { status: 204 })),

  http.delete('*/api/v1/reviews/:reviewId', () => new HttpResponse(null, { status: 204 })),
]
