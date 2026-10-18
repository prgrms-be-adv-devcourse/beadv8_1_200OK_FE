// 배송 묶음의 표시용 상태 중 주문 상품 상태(OrderItemStatus)에 없는 것.
// TODO(api): 배송 API(📝 GET /shipments/{id}) 계약이 나오면 서버 값에 맞춘다. 배지 모양은 StatusBadge.

export enum ShipmentState {
  DELAYED = 'DELAYED', // 판매자가 출고 지연을 알림 (C-10)
  TRACKING_FAILED = 'TRACKING_FAILED', // 택배사 조회 실패
}

export const shipmentStateLabels: Record<ShipmentState, string> = {
  [ShipmentState.DELAYED]: '출고 지연',
  [ShipmentState.TRACKING_FAILED]: '조회 실패',
}
