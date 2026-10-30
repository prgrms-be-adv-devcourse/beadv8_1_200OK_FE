import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { SellerReviewAction } from './types'

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
