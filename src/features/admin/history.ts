import type { SellerApplicationAdminDetail } from '@/shared/api/types'
import { SellerReviewAction, type SellerReviewHistory } from './types'

// 신청 상세의 일시 필드(appliedAt · reviewStartedAt · approvedAt · rejectedAt)를 처리 이력 줄로 바꾼다. 오래된 것부터.
// 심사 시작 관리자는 서버가 주지 않아 null, 승인·반려는 reviewerId. TODO(api): ❌ 회원 이름 조회 API 없음 → ‘관리자 N’으로 보여 준다

export function historyOf(detail: SellerApplicationAdminDetail): SellerReviewHistory[] {
  const history: SellerReviewHistory[] = [
    { action: SellerReviewAction.APPLY, at: detail.appliedAt, reviewerId: null, reason: null },
  ]
  if (detail.reviewStartedAt) {
    history.push({
      action: SellerReviewAction.START_REVIEW,
      at: detail.reviewStartedAt,
      reviewerId: null,
      reason: null,
    })
  }
  if (detail.approvedAt) {
    history.push({
      action: SellerReviewAction.APPROVE,
      at: detail.approvedAt,
      reviewerId: detail.reviewerId,
      reason: null,
    })
  }
  if (detail.rejectedAt) {
    history.push({
      action: SellerReviewAction.REJECT,
      at: detail.rejectedAt,
      reviewerId: detail.reviewerId,
      reason: detail.rejectReason,
    })
  }
  return history
}

/** 처리한 관리자 표시. 이름 API가 없어 회원 번호로 부른다 */
export const reviewerLabel = (reviewerId: number | null) =>
  reviewerId === null ? null : `관리자 ${reviewerId}`
