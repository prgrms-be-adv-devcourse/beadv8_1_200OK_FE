import type { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'

// 운영 관리자 콘솔 화면 전용 타입 (DECISIONS.md B-2).

// ─── 판매자 심사 ─────────────────────────────────────────
// TODO(api): ❌ 신청 목록·상세 API 없음. 📝 승인 POST /admin/sellers/{id}/approval, 반려 .../rejection,
//   권한 회수 .../suspension. ‘심사 시작’은 API 목록에 없다. 필드는 시안 기준 임시.

export enum SellerReviewAction {
  APPLY = 'APPLY',
  START_REVIEW = 'START_REVIEW',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  SUSPEND = 'SUSPEND',
}

export type SellerReviewHistory = {
  action: SellerReviewAction
  at: string
  /** 처리한 관리자. 신청은 null */
  adminName: string | null
  /** 반려·회수 사유 */
  reason: string | null
}

export type AdminSellerApplication = {
  sellerId: number
  storeName: string
  representativeName: string
  businessNumber: string
  mailOrderNumber: string
  bankName: string
  /** 서버가 가려서 준다고 가정: 301-••••-2191 */
  accountNumberMasked: string
  accountHolder: string
  status: SellerApplicationStatus
  appliedAt: string
  /** 심사 담당 관리자. 심사 전이면 null */
  reviewerName: string | null
  /** 반려·정지 사유 */
  reason: string | null
  /** 권한 회수 시 일괄 취소될 진행 중 주문 수. 모르면 null */
  activeOrderCount: number | null
  /** 오래된 것부터 */
  history: SellerReviewHistory[]
}

// ─── 정산 관리 ───────────────────────────────────────────
// ✅ GET /payouts (ADMIN), 상세·항목. 📝 전체 실행 POST /payout/run, 1건 POST /payout/run/orderItems/{id},
//   조정 POST /payout/payouts/adjustments. 아래 타입은 📝·❌ 쪽 임시.

/** 받는 사람 고르기. TODO(api): 판매자 이름 목록 API 없음(❌) → payeeId와 이름을 화면이 따로 받는다 */
export type Payee = { payeeId: number; name: string }

/** 'all' · 플랫폼 수수료 몫 · 판매자 한 명 */
export type PayeeFilter = 'all' | 'system' | number

export type PayoutFilter = {
  payee: PayeeFilter
  /** 완료일 시작 (포함) YYYY-MM-DD */
  from: string
  /** 완료일 끝 (포함) YYYY-MM-DD. API to는 미포함이라 2단계에서 하루 더해 보낸다 */
  to: string
}

/** TODO(api): 마지막 실행 정보 API 없음(❌). null이면 줄을 숨긴다 */
export type PayoutLastRun = { at: string; auto: boolean; payoutCount: number }

/** 지금 실행 결과. busy = 새벽 정산이 도는 중(409) */
export type PayoutRunResult =
  | { kind: 'ok'; candidateCount: number; payoutCount: number; totalAmount: number }
  | { kind: 'none' }
  | { kind: 'busy' }
  | { kind: 'error'; message: string }

/** 1건 정산 결과. 오류 문구는 서버 detail (구매확정 전 · 이미 정산됨) */
export type SinglePayoutResult =
  | { kind: 'success'; orderItemId: number }
  | { kind: 'error'; message: string }

/**
 * 조정할 주문 상품의 지금 정산 금액 (미리보기 · 0원 미만 검사).
 * TODO(api): 주문 상품별 정산 금액 조회 API 없음(❌). 없으면 미리보기 없이 서버 오류로만 막는다.
 */
export type AdjustTarget = {
  orderItemId: number
  payeeName: string
  payoutId: number
  payoutCreatedAt: string
  /** 이전 조정까지 반영한 지금 금액 */
  currentAmount: number
  priorAdjustmentCount: number
  priorAdjustmentTotal: number
}

export type AdjustLookup =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'notFound' }
  | { status: 'found'; target: AdjustTarget }

export type AdjustmentInput = { orderItemId: number; amount: number; reason: string }

/** TODO(api): 조정 내역 목록 API 없음(❌). 항목 API의 adjustment에는 금액 전후가 없다 */
export type AdjustmentLog = {
  adjustmentId: number
  orderItemId: number
  payeeName: string
  amount: number
  before: number
  after: number
  reason: string
  adminName: string
  createdAt: string
}

export type AdjustmentResult = {
  orderItemId: number
  amount: number
  before: number
  after: number
}
