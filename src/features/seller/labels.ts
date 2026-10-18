import { DelayReason, SellerCancelReason, SellerOrderTab } from './types'

export const sellerOrderTabLabels: Record<SellerOrderTab, string> = {
  [SellerOrderTab.WAITING]: '출고 대기',
  [SellerOrderTab.SHIPPING]: '배송 중',
  [SellerOrderTab.DELIVERED]: '배송 완료',
  [SellerOrderTab.CANCELED]: '취소',
}

// 출고 지연 사유 4종 (C-10, 시안)
export const delayReasonLabels: Record<DelayReason, string> = {
  [DelayReason.HARVEST]: '수확 지연',
  [DelayReason.WEATHER]: '기상 악화',
  [DelayReason.SCHEDULE]: '작업 일정',
  [DelayReason.ETC]: '기타 (직접 입력)',
}

export const sellerCancelReasonLabels: Record<SellerCancelReason, string> = {
  [SellerCancelReason.SOLD_OUT]: '품절',
  [SellerCancelReason.BAD_HARVEST]: '수확 불량',
  [SellerCancelReason.ETC]: '기타 (직접 입력)',
}

// 택배사 (시안). TODO(api): 송장 API의 택배사 코드가 정해지면 맞춘다
export const CARRIERS = ['CJ대한통운', '한진택배', '롯데택배', '우체국택배', '로젠택배'] as const
