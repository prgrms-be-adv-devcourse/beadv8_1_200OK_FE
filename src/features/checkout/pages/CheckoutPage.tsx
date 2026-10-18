import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  BALANCE_ENOUGH,
  checkoutSample,
  SAMPLE_ORDER_ID,
  savedAddress,
  sellerNames,
} from '../fixtures'
import type { PaymentState } from '../types'
import { CheckoutView } from '../views/CheckoutView'

// B-04 주문서 라우트 /checkout. 1단계: fixtures로 그리고, 결제하면 잠시 처리 중을 보인 뒤 완료로 이동한다.
// TODO(api): 2-4 GET /orders/checkout, POST /orders(expectedTotalAmount). 409면 주문서를 다시 불러와 previousTotal로 안내.
//   잔액·배송지는 📝 지갑·회원 API가 생기면 연결. 충전에서 돌아왔을 때 입력한 배송지를 지킬지는 PLAN 결정 7.

export function CheckoutPage() {
  const navigate = useNavigate()
  const [paymentState, setPaymentState] = useState<PaymentState>('idle')

  useEffect(() => {
    if (paymentState !== 'processing') return
    const timer = setTimeout(() => navigate(`/checkout/complete?orderId=${SAMPLE_ORDER_ID}`), 1200)
    return () => clearTimeout(timer)
  }, [paymentState, navigate])

  return (
    <CheckoutView
      status="success"
      checkout={checkoutSample}
      sellerNames={sellerNames}
      balance={BALANCE_ENOUGH}
      defaultAddress={savedAddress}
      paymentState={paymentState}
      onPay={() => setPaymentState('processing')}
    />
  )
}
