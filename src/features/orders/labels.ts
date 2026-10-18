import { CancelReason, InquiryType, OrderFilter } from './types'

// orders 화면 표시명. 서버 enum이 정해지면 shared/lib/labels.ts로 옮긴다(TODO(api)).

export const orderFilterLabels: Record<OrderFilter, string> = {
  [OrderFilter.ALL]: '전체',
  [OrderFilter.IN_PROGRESS]: '진행 중',
  [OrderFilter.CONFIRMED]: '구매확정',
  [OrderFilter.CANCELED]: '취소',
}

export const cancelReasonLabels: Record<CancelReason, string> = {
  [CancelReason.ORDER_MISTAKE]: '주문 실수 (옵션·수량)',
  [CancelReason.ADDRESS_PROBLEM]: '배송지 문제',
  [CancelReason.REORDER]: '다른 상품으로 다시 주문',
  [CancelReason.ETC]: '기타 (직접 입력)',
}

export const inquiryTypeLabels: Record<InquiryType, string> = {
  [InquiryType.DAMAGED]: '상품 파손·변질',
  [InquiryType.WRONG_ITEM]: '오배송·수량 누락',
  [InquiryType.LATE]: '배송 지연',
  [InquiryType.ETC]: '기타',
}

export const inquiryPlaceholders: Record<InquiryType, string> = {
  [InquiryType.DAMAGED]: '어느 부분이 어떻게 상했는지, 몇 개가 그런지 알려 주세요',
  [InquiryType.WRONG_ITEM]: '받은 상품과 수량, 주문한 상품과 다른 점을 알려 주세요',
  [InquiryType.LATE]: '언제 받기로 했는지, 지금 배송 상태가 어떤지 알려 주세요',
  [InquiryType.ETC]: '문제가 무엇인지 자세히 알려 주세요',
}
