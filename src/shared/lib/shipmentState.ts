import { OrderItemStatus, ShipmentStatus } from '@/shared/api/types'

// 배송(shipment) 표시 상태. 서버 ShipmentStatus 중 주문 상품 상태(OrderItemStatus)와 문구가 다른 것과, 서버 값이 아닌 ‘도착 지연’.
// 표시명은 백엔드에 없어 프론트에서 정했다. 배지 모양은 StatusBadge.

export enum ShipmentState {
  DELAYED = 'DELAYED', // 도착 예정일을 넘김 (shipment.delayed)
  COMPLETED = 'SHIPMENT_COMPLETED', // 거래 완료 (출금 상태 COMPLETED와 값이 겹치지 않게)
  CANCELLED = 'SHIPMENT_CANCELLED', // 배송 취소
}

export const shipmentStateLabels: Record<ShipmentState, string> = {
  [ShipmentState.DELAYED]: '도착 지연',
  [ShipmentState.COMPLETED]: '거래 완료',
  [ShipmentState.CANCELLED]: '배송 취소',
}

/** 배송 진행 단계 문구 (준비 중 · 배송 중 · 배송 완료 · 거래 완료 · 배송 취소) */
export const shipmentStatusLabels: Record<ShipmentStatus, string> = {
  [ShipmentStatus.PREPARING]: '상품 준비 중',
  [ShipmentStatus.SHIPPING]: '배송 중',
  [ShipmentStatus.DELIVERED]: '배송 완료',
  [ShipmentStatus.COMPLETED]: '거래 완료',
  [ShipmentStatus.CANCELLED]: '배송 취소',
}

/** 배송 상태 → 배지. 준비 중·배송 중·배송 완료는 주문 상품 상태 배지를 같이 쓴다 */
export function shipmentBadgeStatus(status: ShipmentStatus): OrderItemStatus | ShipmentState {
  switch (status) {
    case ShipmentStatus.PREPARING:
      return OrderItemStatus.PREPARING
    case ShipmentStatus.SHIPPING:
      return OrderItemStatus.SHIPPING
    case ShipmentStatus.DELIVERED:
      return OrderItemStatus.DELIVERED
    case ShipmentStatus.COMPLETED:
      return ShipmentState.COMPLETED
    case ShipmentStatus.CANCELLED:
      return ShipmentState.CANCELLED
  }
}
