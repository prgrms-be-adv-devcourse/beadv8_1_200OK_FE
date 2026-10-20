import { useParams } from 'react-router'
import { ShipmentView } from '../views/ShipmentView'

// 배송 조회 라우트 /orders/:orderId/shipments/:shipmentId (주문 상세에서 링크하지 않는다).
// API가 없어 ‘연결 전’만 보여 준다. 배송 상태별 화면은 /__design에서 본다.
// TODO(api): 📝 GET /shipments/{shipmentId}. 주문 상세에도 shipmentId·송장이 없다

export function ShipmentPage() {
  const { orderId } = useParams()
  return <ShipmentView status="notConnected" orderId={Number(orderId) || undefined} />
}
