import { HttpResponse, http } from 'msw'
import { orderDetails, orderSummaries } from '@/features/orders/fixtures'
import { pageOf, problem } from './_shared'

// 주문 목록·상세 기본 응답 (orders fixtures). 없는 주문은 404 "주문을 찾을 수 없습니다."(2026-10-20 로컬 서버 문구).
// GET /orders/checkout은 checkout 핸들러가 먼저 받고, 숫자가 아닌 orderId는 여기서 넘긴다(index.ts 순서).

export const ordersHandlers = [
  http.get('*/api/v1/orders', ({ request }) =>
    HttpResponse.json(pageOf(orderSummaries, new URL(request.url).searchParams, 10)),
  ),
  http.get('*/api/v1/orders/:orderId', ({ params }) => {
    const raw = String(params.orderId)
    if (!/^\d+$/.test(raw)) return undefined
    const order = orderDetails.find((o) => o.orderId === Number(raw))
    return order ? HttpResponse.json(order) : problem(404, '주문을 찾을 수 없습니다.')
  }),
  // 구매확정: 기본은 204. 409(배송 완료 아님·이미 확정)·404는 테스트에서 덮는다
  http.post(
    '*/api/v1/orders/:orderId/items/:orderItemId/confirm',
    () => new HttpResponse(null, { status: 204 }),
  ),
]
