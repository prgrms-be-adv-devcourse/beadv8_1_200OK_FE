import { ReviewKeywordAspect } from '@/shared/api/types'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { ReviewAspect, ReviewSentiment, SellerReviewAction } from './types'

// 심사 목록 탭 이름 (시안). 서버 상태 4종 그대로.
export const sellerReviewTabLabels: Record<SellerApplicationStatus, string> = {
  [SellerApplicationStatus.PENDING]: '심사 대기',
  [SellerApplicationStatus.IN_REVIEW]: '심사 중',
  [SellerApplicationStatus.APPROVED]: '승인',
  [SellerApplicationStatus.REJECTED]: '반려',
}

export const sellerReviewActionLabels: Record<SellerReviewAction, string> = {
  [SellerReviewAction.APPLY]: '판매자 등록 신청',
  [SellerReviewAction.START_REVIEW]: '심사 시작',
  [SellerReviewAction.APPROVE]: '승인',
  [SellerReviewAction.REJECT]: '반려',
}

export const reviewAspectLabels: Record<ReviewAspect, string> = {
  [ReviewAspect.TASTE]: '맛',
  [ReviewAspect.FRESHNESS]: '신선도',
  [ReviewAspect.CONDITION]: '상품 상태',
  [ReviewAspect.PACKAGING]: '포장',
  [ReviewAspect.DELIVERY]: '배송',
  [ReviewAspect.PRICE]: '가격',
}

export const reviewKeywordAspectLabels: Record<ReviewKeywordAspect, string> = {
  ...reviewAspectLabels,
  [ReviewKeywordAspect.OTHER]: '기타',
}

export const reviewSentimentLabels: Record<ReviewSentiment, string> = {
  [ReviewSentiment.POSITIVE]: '긍정',
  [ReviewSentiment.NEGATIVE]: '부정',
  [ReviewSentiment.NEUTRAL]: '중립',
  [ReviewSentiment.MIXED]: '혼합',
  [ReviewSentiment.NOT_MENTIONED]: '언급 없음',
}
