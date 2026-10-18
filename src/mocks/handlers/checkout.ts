import { HttpResponse, http } from 'msw'
import { checkoutSample, SAMPLE_ORDER_ID } from '@/features/checkout/fixtures'

// 주문서 조회·주문 생성 기본 응답 (checkout fixtures). 2026-10-18 로컬 서버에 주문 API가 없어 성공 흐름은 여기서만 확인한다.
// 실패 시나리오(409 금액 변경·잔액 부족, 422)는 테스트에서 server.use(...)로 덮는다.

export const checkoutHandlers = [
  http.get('*/api/v1/orders/checkout', () => HttpResponse.json(checkoutSample)),
  http.post('*/api/v1/orders', () =>
    HttpResponse.json({ orderId: SAMPLE_ORDER_ID }, { status: 201 }),
  ),
]
