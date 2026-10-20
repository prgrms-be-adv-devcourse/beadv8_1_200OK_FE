import { useParams } from 'react-router'
import { isNotFound, orderErrorMessage, useOrder } from '../queries'
import { OrderDetailView } from '../views/OrderDetailView'

// B-08 주문 상세 라우트 /orders/:orderId. ✅ GET /orders/{orderId}. 없거나 다른 회원의 주문(404)·잘못된 번호는 ‘찾을 수 없어요’.

export function OrderDetailPage() {
  const raw = Number(useParams().orderId)
  const orderId = Number.isInteger(raw) && raw > 0 ? raw : null
  const order = useOrder(orderId)

  const status =
    orderId === null || (order.isError && isNotFound(order.error))
      ? 'notFound'
      : order.isPending
        ? 'pending'
        : order.isError
          ? 'error'
          : 'success'

  return (
    <OrderDetailView
      status={status}
      order={order.data}
      onRetry={() => void order.refetch()}
      errorMessage={order.error ? orderErrorMessage(order.error) : undefined}
    />
  )
}
