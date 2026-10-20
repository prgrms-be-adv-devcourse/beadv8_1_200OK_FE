import { InquiryType } from './types'

// orders 화면 표시명. 주문·주문 상품 상태 표시명은 shared/lib/labels.ts(orderStatusLabels·orderItemStatusLabels).
// TODO(api): ❌ 문의 API가 없어 문의 유형은 화면 임시값이다.

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
