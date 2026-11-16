import { useParams } from 'react-router'
import { isApiError } from '@/shared/api/ApiError'
import { showToast } from '@/shared/ui'
import {
  isNotFound,
  orderErrorMessage,
  useConfirmOrderItem,
  useOrder,
  useOrderRefunds,
  useOrderShipments,
  useRequestRefund,
  useWithdrawRefund,
} from '../queries'
import { OrderDetailView } from '../views/OrderDetailView'

// B-08 주문 상세 라우트 /orders/:orderId. ✅ GET /orders/{orderId}. 없거나 다른 회원의 주문(404)·잘못된 번호는 ‘찾을 수 없어요’.
// 배송 조회 링크는 ✅ GET /shipments에서 orderId로 찾고(못 받아도 화면은 그대로), 구매확정은 ✅ POST …/items/{orderItemId}/confirm.
// 취소 요청은 ✅ GET /refunds에서 이 주문 것을 찾는다. 못 받으면 빈 목록으로 보고 요청 버튼은 그대로 둔다(서버가 다시 확인한다).

export function OrderDetailPage() {
  const raw = Number(useParams().orderId)
  const orderId = Number.isInteger(raw) && raw > 0 ? raw : null
  const order = useOrder(orderId)
  const shipments = useOrderShipments(order.data ? orderId : null)
  const refunds = useOrderRefunds(order.data)
  const confirm = useConfirmOrderItem()
  const request = useRequestRefund()
  const withdraw = useWithdrawRefund()

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
      refunds={refunds.data ?? (refunds.isError ? [] : undefined)}
      onRequestCancel={async (orderItemId, quantity, cancelReason) => {
        if (orderId === null) return null
        try {
          await request.mutateAsync({
            orderId,
            orderItemId,
            quantity,
            ...(cancelReason ? { cancelReason } : {}),
          })
          showToast({ message: '취소를 요청했어요. 판매자가 승인하면 환불돼요' })
          return null
        } catch (error) {
          if (isApiError(error) && error.status === 404) {
            showToast({ message: error.detail })
            return null
          }
          return orderErrorMessage(error)
        }
      }}
      requestingCancel={request.isPending}
      onWithdrawRefund={(refundId) =>
        withdraw.mutate(refundId, {
          onSuccess: () => showToast({ message: '취소 요청을 철회했어요' }),
          onError: (error) => showToast({ message: orderErrorMessage(error) }),
        })
      }
      withdrawingRefundId={withdraw.isPending ? withdraw.variables : null}
    />
  )
}
