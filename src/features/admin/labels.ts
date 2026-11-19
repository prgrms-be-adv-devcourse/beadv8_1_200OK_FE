import { ReviewKeywordAspect } from '@/shared/api/types'
import { formatPrice } from '@/shared/lib/format'
import { reviewAspectLabels } from '@/shared/lib/labels'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import {
  DepositCheckReason,
  type OverchargeEvidence,
  PayoutSection,
  SellerReviewAction,
} from './types'

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

export const reviewKeywordAspectLabels: Record<ReviewKeywordAspect, string> = {
  ...reviewAspectLabels,
  [ReviewKeywordAspect.OTHER]: '기타',
}

// ─── 정산 관리 ───────────────────────────────────────────

export const payoutSectionLabels: Record<PayoutSection, string> = {
  [PayoutSection.PAYOUTS]: '정산',
  [PayoutSection.BLOCKED_ORDERS]: '막힌 주문',
  [PayoutSection.DEPOSIT_CHECKS]: '대사 확인',
}

// 실패 사유·원인 범주·해결 방법은 서버가 늘릴 수 있는 문자열이라, 모르는 값은 코드 그대로 보여 준다.
// 사유 문구는 백엔드 PayoutFailureReason의 기본 상세 문구와 같다.
const failureReasonLabels: Record<string, string> = {
  DEDUCTION_MISSING: '결제 기록 없음',
  ORDER_MISSING: '주문 기록 없음',
  AMOUNT_MISMATCH: '금액 불일치',
  FEE_MISMATCH: '수수료 불일치',
  ORDER_HELD: '같은 주문 때문에 보류',
  UNEXPECTED_ERROR: '예상하지 못한 오류',
  VERIFY_MISMATCH: '결과 검증 불일치',
}

const failureCategoryLabels: Record<string, string> = {
  SOURCE_DATA: '원천 데이터',
  SYSTEM: '시스템',
  RECONCILIATION: '대사',
}

const resolutionMethodLabels: Record<string, string> = {
  REPROCESS: '다시 처리',
}

export const failureReasonLabel = (reason: string) => failureReasonLabels[reason] ?? reason
export const failureCategoryLabel = (category: string) =>
  failureCategoryLabels[category] ?? category
export const resolutionMethodLabel = (method: string) => resolutionMethodLabels[method] ?? method

export const depositCheckReasonLabels: Record<DepositCheckReason, { label: string; help: string }> =
  {
    [DepositCheckReason.NOT_FOUND]: {
      label: '입금 없음',
      help: '3번 물을 때까지 입금을 확인하지 못했고, 지갑이 한 번 이상 없다고 답했어요',
    },
    [DepositCheckReason.NO_RESPONSE]: {
      label: '지갑 답 없음',
      help: '3번 물을 때까지 지갑이 한 번도 답하지 않았어요. 지갑 수신 장애일 수 있어요',
    },
    [DepositCheckReason.PAYEE_MISMATCH]: {
      label: '판매자 다름',
      help: '입금은 있는데 다른 판매자에게 들어갔어요',
    },
    [DepositCheckReason.AMOUNT_MISMATCH]: {
      label: '금액 다름',
      help: '같은 판매자에게 입금은 있는데 금액이 달라요',
    },
  }

const itemList = (items: string[]) => (items.length > 0 ? items.join(', ') : '없음')

/** 초과 청구 근거 칸. 막힌 순간과 지금을 같은 줄로 놓고 비교한다 */
export const overchargeEvidenceRows: {
  key: keyof OverchargeEvidence
  label: string
  format: (evidence: OverchargeEvidence) => string
}[] = [
  { key: 'deductedAmount', label: '결제 금액', format: (e) => formatPrice(e.deductedAmount) },
  { key: 'candidateTotal', label: '정산후보 합계', format: (e) => formatPrice(e.candidateTotal) },
  { key: 'overflowAmount', label: '넘친 금액', format: (e) => formatPrice(e.overflowAmount) },
  { key: 'firstOverflowItem', label: '처음 넘긴 주문상품', format: (e) => e.firstOverflowItem },
  { key: 'settledAmount', label: '이미 지급한 금액', format: (e) => formatPrice(e.settledAmount) },
  { key: 'settledItems', label: '이미 지급한 주문상품', format: (e) => itemList(e.settledItems) },
  {
    key: 'aloneOverItems',
    label: '혼자 결제 금액을 넘는 주문상품',
    format: (e) => itemList(e.aloneOverItems),
  },
  { key: 'sellerCount', label: '판매자 수', format: (e) => `${e.sellerCount}명` },
  {
    key: 'conflictAmounts',
    label: '지갑 금액 충돌',
    format: (e) =>
      e.conflictAmounts.length > 0
        ? e.conflictAmounts.map((a) => formatPrice(a)).join(', ')
        : '없음',
  },
]
