import { ShipmentCarrier } from '@/shared/api/types'

// ✅ 택배사: 출고 POST /seller/shipments/{shipmentId}/dispatch 의 carrier enum. 이름은 shared/lib/labels의 carrierLabels.
// 시안 순서대로 보여 준다.
export const CARRIER_ORDER: ShipmentCarrier[] = [
  ShipmentCarrier.CJ_LOGISTICS,
  ShipmentCarrier.HANJIN,
  ShipmentCarrier.LOTTE,
  ShipmentCarrier.POST_OFFICE,
  ShipmentCarrier.LOGEN,
]
