import { useSearchParams } from 'react-router'
import { BALANCE_ENOUGH, checkoutSample, sellerNames } from '../fixtures'
import { CheckoutCompleteView } from '../views/CheckoutCompleteView'

// B-06 주문 완료 라우트 /checkout/complete?orderId=. 1단계: fixtures 금액을 보여 준다.
// TODO(api): 결제 직전 주문서 값을 넘겨받거나(라우터 state) 📝 주문 상세로 채운다

export function CheckoutCompletePage() {
  const [params] = useSearchParams()
  const orderId = Number(params.get('orderId') ?? 0)

  return (
    <CheckoutCompleteView
      orderId={orderId}
      checkout={checkoutSample}
      sellerNames={sellerNames}
      balanceAfter={BALANCE_ENOUGH - checkoutSample.totalAmount}
    />
  )
}
