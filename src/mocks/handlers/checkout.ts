import { HttpResponse, http } from 'msw'
import {
  checkoutSample,
  completedOrderSample,
  failedOrderSample,
  pendingOrderSample,
  SAMPLE_ORDER_ID,
} from '@/features/checkout/fixtures'
import { OrderStatus } from '@/shared/api/types'

// 주문서 조회·주문 생성 기본 응답 (checkout fixtures). 2026-10-18 로컬 서버에 주문 API가 없어 성공 흐름은 여기서만 확인한다.
// 실패 시나리오(409 금액 변경·잔액 부족·같은 키 처리 중, 422)는 테스트에서 server.use(...)로 덮는다.
// 주문 직후 상세는 기본이 결제 완료(orders 핸들러의 184, PAID)다. 결제 대기에서 바뀌는 경우는 orderPaymentSequence로 덮는다(#76).

export const checkoutHandlers = [
  http.get('*/api/v1/orders/checkout', () => HttpResponse.json(checkoutSample)),
  // 서버처럼 Idempotency-Key(공백 아닌 64자 이하)가 없으면 400
  http.post('*/api/v1/orders', ({ request }) => {
    const key = request.headers.get('Idempotency-Key')?.trim()
    if (!key || key.length > 64) {
      return HttpResponse.json(
        {
          type: 'about:blank',
          title: 'Invalid idempotency key',
          status: 400,
          detail: 'Idempotency-Key 헤더는 공백이 아닌 64자 이하여야 합니다.',
          instance: '/api/v1/orders',
        },
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
      )
    }
    return HttpResponse.json({ orderId: SAMPLE_ORDER_ID }, { status: 201 })
  }),
]

const orderOf = {
  [OrderStatus.PAYMENT_PENDING]: pendingOrderSample,
  [OrderStatus.PAID]: completedOrderSample,
  [OrderStatus.PAYMENT_FAILED]: failedOrderSample,
  [OrderStatus.CANCELED]: { ...failedOrderSample, status: OrderStatus.CANCELED },
}

/**
 * 주문 184의 상세가 부를 때마다 statuses 순서로 바뀐다(마지막 상태는 계속). 서버에서 지갑 결제가 뒤에 끝나는 흐름(#76).
 * 예: orderPaymentSequence([PAYMENT_PENDING, PAID]) → 첫 조회는 결제 대기, 다음부터 결제 완료.
 * calls()로 몇 번 불렀는지 본다
 */
export function orderPaymentSequence(statuses: OrderStatus[], orderId = SAMPLE_ORDER_ID) {
  let count = 0
  const handler = http.get(`*/api/v1/orders/${orderId}`, () => {
    const status = statuses[Math.min(count, statuses.length - 1)] ?? OrderStatus.PAID
    count += 1
    return HttpResponse.json({ ...orderOf[status], orderId })
  })
  return { handler, calls: () => count }
}
