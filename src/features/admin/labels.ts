import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { SellerReviewAction } from './types'

// 심사 목록 탭 이름 (시안). 배지 문구(‘신청 완료’)와 탭 이름(‘심사 대기’)이 다르다
export const sellerReviewTabLabels: Record<SellerApplicationStatus, string> = {
  [SellerApplicationStatus.APPLIED]: '심사 대기',
  [SellerApplicationStatus.UNDER_REVIEW]: '심사 중',
  [SellerApplicationStatus.APPROVED]: '승인',
  [SellerApplicationStatus.REJECTED]: '반려',
  [SellerApplicationStatus.SUSPENDED]: '권한 정지',
}

export const sellerReviewActionLabels: Record<SellerReviewAction, string> = {
  [SellerReviewAction.APPLY]: '판매자 등록 신청',
  [SellerReviewAction.START_REVIEW]: '심사 시작',
  [SellerReviewAction.APPROVE]: '승인',
  [SellerReviewAction.REJECT]: '반려',
  [SellerReviewAction.SUSPEND]: '권한 회수',
}
