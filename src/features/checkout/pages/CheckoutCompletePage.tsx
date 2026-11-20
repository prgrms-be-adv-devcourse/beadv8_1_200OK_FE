import { useQuery } from '@tanstack/react-query'
import { useEffect, useEffectEvent, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { walletBalanceQueryOptions } from '@/shared/api/walletBalance'
import { COMPLETE_PAYMENT_WAIT_MS, useOrderPayment, useSettlePaidOrder } from '../queries'
import { CheckoutCompleteView } from '../views/CheckoutCompleteView'

// B-06 주문 완료 라우트 /checkout/complete?orderId=. ✅ 주문 상세(GET /orders/{orderId})·잔액(GET /wallets/me/balance)으로 그린다.
// 주문서는 결제 완료(PAID)를 확인하고 넘어오지만, 10초 넘게 결제 대기였거나 새로 고침·주문 내역에서 들어오면 아직 결제 대기일 수 있다(#76).
//   결제 대기면 남은 예치금을 숨기고 1초마다 다시 확인한다. PAID가 되면 캐시를 정리하고 잔액을 받는다.
//   30초가 지나도 결제 대기면 주문 내역에서 확인하라고 안내한다. 결제 실패·취소면 장바구니로 안내한다.
// 남은 예치금은 이 화면에서 결제 완료 뒤 새로 받은 값만 보여 준다(결제 전 잔액이 캐시에 남아 있을 수 있다).
// TODO(api): 농가 이름은 주문 상세에 없다(sellerId만).

export function CheckoutCompletePage() {
  const [params] = useSearchParams()
  const raw = Number(params.get('orderId') ?? 0)
  const orderId = Number.isInteger(raw) && raw > 0 ? raw : null
  const payment = useOrderPayment(orderId, COMPLETE_PAYMENT_WAIT_MS)
  const paid = payment.result === 'paid'
  const balance = useQuery({ ...walletBalanceQueryOptions(), enabled: paid })
  const settlePaidOrder = useSettlePaidOrder()

  // 이 화면에서 결제 대기를 보다가 PAID가 됐을 때만 캐시를 정리한다(주문서에서 이미 정리하고 넘어온 경우는 빼고)
  const sawWaiting = useRef(false)
  const onPaid = useEffectEvent(() => {
    if (sawWaiting.current) settlePaidOrder()
  })
  useEffect(() => {
    if (payment.result === 'waiting') sawWaiting.current = true
    if (payment.result === 'paid') onPaid()
  }, [payment.result])

  return (
    <CheckoutCompleteView
      orderId={orderId ?? 0}
      // 주문 번호가 없으면 확인할 수 없어 주문 내역으로 안내한다
      payment={orderId === null ? 'timedOut' : payment.result}
      order={payment.order.data}
      balance={paid && balance.isFetchedAfterMount ? balance.data?.balance : undefined}
    />
  )
}
