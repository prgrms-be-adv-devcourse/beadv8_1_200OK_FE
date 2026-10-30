import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { orderDetailQueryOptions } from '@/shared/api/orderDetail'
import { walletBalanceQueryOptions } from '@/shared/api/walletBalance'
import { CheckoutCompleteView } from '../views/CheckoutCompleteView'

// B-06 주문 완료 라우트 /checkout/complete?orderId=. ✅ 주문 상세(GET /orders/{orderId})·잔액(GET /wallets/me/balance)으로 그린다.
// 아직 못 받았거나 실패하면 주문번호만 보여 준다(주문은 이미 끝났으니 오류로 막지 않는다).
// TODO(api): 농가 이름은 주문 상세에 없다(sellerId만).

export function CheckoutCompletePage() {
  const [params] = useSearchParams()
  const raw = Number(params.get('orderId') ?? 0)
  const orderId = Number.isInteger(raw) && raw > 0 ? raw : 0
  const order = useQuery({ ...orderDetailQueryOptions(orderId), enabled: orderId > 0 })
  const balance = useQuery(walletBalanceQueryOptions())

  return (
    <CheckoutCompleteView orderId={orderId} order={order.data} balance={balance.data?.balance} />
  )
}
