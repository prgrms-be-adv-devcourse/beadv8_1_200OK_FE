import { useParams } from 'react-router'
import { trackings } from '../fixtures'
import { ShipmentView } from '../views/ShipmentView'

// 배송 조회 라우트 /orders/:orderId/shipments/:shipmentId. 1단계: fixtures.
// TODO(api): 📝 GET /shipments/{shipmentId}

export function ShipmentPage() {
  const { shipmentId } = useParams()
  const shipment = trackings.find((t) => t.shipmentId === Number(shipmentId))
  return <ShipmentView status={shipment ? 'success' : 'notFound'} shipment={shipment} />
}
