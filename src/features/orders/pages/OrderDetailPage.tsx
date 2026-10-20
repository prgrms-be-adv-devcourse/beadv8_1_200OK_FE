import { useParams } from 'react-router'
import { showToast } from '@/shared/ui'
import {
  isNotFound,
  orderErrorMessage,
  useConfirmOrderItem,
  useOrder,
  useOrderShipments,
} from '../queries'
import { OrderDetailView } from '../views/OrderDetailView'

// B-08 주문 상세 라우트 /orders/:orderId. ✅ GET /orders/{orderId}. 없거나 다른 회원의 주문(404)·잘못된 번호는 ‘찾을 수 없어요’.
// 배송 조회 링크는 ✅ GET /shipments에서 orderId로 찾고(못 받아도 화면은 그대로), 구매확정은 ✅ POST …/items/{orderItemId}/confirm.

export function OrderDetailPage() {
  const raw = Number(useParams().orderId)
  const orderId = Number.isInteger(raw) && raw > 0 ? raw : null
  const order = useOrder(orderId)
  const shipments = useOrderShipments(order.data ? orderId : null)
  const confirm = useConfirmOrderItem()

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
      shipments={shipments.data}
      onConfirm={(orderItemId) => {
        if (orderId === null) return
        confirm.mutate(
          { orderId, orderItemId },
          {
            onSuccess: () => showToast({ message: '구매확정했어요' }),
            onError: (error) => showToast({ message: orderErrorMessage(error) }),
          },
        )
      }}
      confirmingItemId={confirm.isPending ? confirm.variables.orderItemId : null}
    />
  )
}
