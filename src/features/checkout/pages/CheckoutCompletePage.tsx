import { useLocation, useSearchParams } from 'react-router'
import type { CompleteState } from '../types'
import { CheckoutCompleteView } from '../views/CheckoutCompleteView'

// B-06 주문 완료 라우트 /checkout/complete?orderId=. 결제 직전 주문서·잔액을 라우터 state로 받는다.
// 새로 고치거나 주소로 바로 오면 state가 없어 주문번호만 보여 준다.
// TODO(api): 📝 주문 상세(GET /orders/{orderId})·지갑 잔액 API가 생기면 그것으로 채운다. 농가 이름도 그때

const isCompleteState = (value: unknown): value is CompleteState =>
  typeof value === 'object' && value !== null && ('checkout' in value || 'balanceAfter' in value)

export function CheckoutCompletePage() {
  const [params] = useSearchParams()
  const location = useLocation()
  const orderId = Number(params.get('orderId') ?? 0)
  const state: CompleteState = isCompleteState(location.state) ? location.state : {}

  return (
    <CheckoutCompleteView
      orderId={orderId}
      checkout={state.checkout}
      balanceAfter={state.balanceAfter}
    />
  )
}
