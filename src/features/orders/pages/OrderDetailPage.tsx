import { useState } from 'react'
import { useParams } from 'react-router'
import { OrderItemStatus } from '@/shared/api/types'
import { showToast } from '@/shared/ui'
import { orderDetails } from '../fixtures'
import type { OrderDetail, OrderShipment } from '../types'
import { OrderDetailView } from '../views/OrderDetailView'

// B-08 · B-09 주문 상세 라우트 /orders/:orderId. 1단계: fixtures를 화면 안에서만 바꾼다.
// TODO(api): 📝 주문 상세·구매확정·취소 요청·철회·배송지 변경 요청

export function OrderDetailPage() {
  const { orderId } = useParams()
  const [order, setOrder] = useState<OrderDetail | undefined>(() =>
    orderDetails.find((o) => o.orderId === Number(orderId)),
  )

  const update = (shipmentId: number, patch: Partial<OrderShipment>) =>
    setOrder(
      (current) =>
        current && {
          ...current,
          shipments: current.shipments.map((s) =>
            s.shipmentId === shipmentId ? { ...s, ...patch } : s,
          ),
        },
    )

  return (
    <OrderDetailView
      status={order ? 'success' : 'notFound'}
      order={order}
      onCancelRequest={({ shipmentId }) => {
        update(shipmentId, { status: OrderItemStatus.CANCEL_REQUESTED, claimId: 1 })
        showToast({ message: '취소를 요청했어요. 판매자가 확인하면 예치금으로 돌려드려요' })
      }}
      onWithdraw={() => {
        const target = order?.shipments.find((s) => s.status === OrderItemStatus.CANCEL_REQUESTED)
        if (target) update(target.shipmentId, { status: OrderItemStatus.PREPARING, claimId: null })
        showToast({ message: '취소 요청을 철회했어요' })
      }}
      onConfirm={(shipmentId) => {
        update(shipmentId, { status: OrderItemStatus.PURCHASE_CONFIRMED })
        showToast({ message: '구매확정했어요' })
      }}
      onAddressChangeRequest={(shipmentId) => {
        update(shipmentId, { addressChangeRequested: true })
        showToast({ message: '배송지 변경을 요청했어요' })
      }}
    />
  )
}
