import { useParams } from 'react-router'
import { trackings } from '../fixtures'
import { ShipmentView } from '../views/ShipmentView'

// 배송 조회 라우트 /orders/:orderId/shipments/:shipmentId. fixtures 전용(주문 상세에서 링크하지 않는다).
// TODO(api): ❌ 배송 조회 API 없음. 주문 상세에도 shipmentId·송장이 없다

export function ShipmentPage() {
  const { shipmentId } = useParams()
  const shipment = trackings.find((t) => t.shipmentId === Number(shipmentId))
  return <ShipmentView status={shipment ? 'success' : 'notFound'} shipment={shipment} />
}
