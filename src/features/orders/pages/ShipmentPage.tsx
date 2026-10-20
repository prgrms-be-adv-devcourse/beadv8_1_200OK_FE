import { useParams } from 'react-router'
import { showToast } from '@/shared/ui'
import { isNotFound, orderErrorMessage, useConfirmOrderItem, useShipment } from '../queries'
import { ShipmentView } from '../views/ShipmentView'

// 배송 조회 라우트 /orders/:orderId/shipments/:shipmentId. ✅ GET /shipments/{shipmentId}. 없거나 남의 배송(404)·잘못된 번호는 ‘찾을 수 없어요’.
// 배송 완료된 상품은 여기서 바로 구매확정(POST /orders/{orderId}/items/{orderItemId}/confirm)할 수 있다.

export function ShipmentPage() {
  const raw = Number(useParams().shipmentId)
  const shipmentId = Number.isInteger(raw) && raw > 0 ? raw : null
  const shipment = useShipment(shipmentId)
  const confirm = useConfirmOrderItem()

  const status =
    shipmentId === null || (shipment.isError && isNotFound(shipment.error))
      ? 'notFound'
      : shipment.isPending
        ? 'pending'
        : shipment.isError
          ? 'error'
          : 'success'

  return (
    <ShipmentView
      status={status}
      shipment={shipment.data}
      onRetry={() => void shipment.refetch()}
      errorMessage={shipment.error ? orderErrorMessage(shipment.error) : undefined}
      onConfirm={(orderItemId) => {
        if (!shipment.data) return
        confirm.mutate(
          { orderId: shipment.data.orderId, orderItemId },
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
