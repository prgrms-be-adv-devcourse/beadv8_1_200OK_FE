import { ShipmentCarrier } from '@/shared/api/types'
import { DelayReason, SellerCancelReason, SellerOrderTab } from './types'

export const sellerOrderTabLabels: Record<SellerOrderTab, string> = {
  [SellerOrderTab.WAITING]: '출고 대기',
  [SellerOrderTab.SHIPPING]: '배송 중',
  [SellerOrderTab.DELIVERED]: '배송 완료',
  [SellerOrderTab.CANCELED]: '취소',
}

// 출고 지연 사유 4종 (C-10, 시안). TODO(api): ❌ 지연 알리기 API 없음
export const delayReasonLabels: Record<DelayReason, string> = {
  [DelayReason.HARVEST]: '수확 지연',
  [DelayReason.WEATHER]: '기상 악화',
  [DelayReason.SCHEDULE]: '작업 일정',
  [DelayReason.ETC]: '기타 (직접 입력)',
}

// TODO(api): ❌ 판매자 취소 API 없음
export const sellerCancelReasonLabels: Record<SellerCancelReason, string> = {
  [SellerCancelReason.SOLD_OUT]: '품절',
  [SellerCancelReason.BAD_HARVEST]: '수확 불량',
  [SellerCancelReason.ETC]: '기타 (직접 입력)',
}

// ✅ 택배사: 출고 POST /seller/shipments/{shipmentId}/dispatch 의 carrier enum. 이름은 shared/lib/labels의 carrierLabels.
// 송장 등록 연결은 판매자 주문 목록 API(shipmentId를 받을 곳) 뒤에 한다. 시안 순서대로 보여 준다.
export const CARRIER_ORDER: ShipmentCarrier[] = [
  ShipmentCarrier.CJ_LOGISTICS,
  ShipmentCarrier.HANJIN,
  ShipmentCarrier.LOTTE,
  ShipmentCarrier.POST_OFFICE,
  ShipmentCarrier.LOGEN,
]
