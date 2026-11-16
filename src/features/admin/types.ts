import type {
  PayoutEventType,
  ReviewAspect,
  ReviewKeywordAspect,
  ReviewSentiment,
} from '@/shared/api/types'
import type { PayoutBlockStatus } from '@/shared/lib/payoutBlockState'

// 운영 관리자 콘솔 화면 전용 타입 (DECISIONS.md B-2). 서버 응답 타입은 shared/api/types.ts를 그대로 쓴다.

// ─── 판매자 심사 ─────────────────────────────────────────
// ✅ GET/POST /api/v1/admin/seller-applications… 처리 이력은 상세의 일시 필드에서 만든다(history.ts).
// TODO(api): ❌ 판매자 권한 회수(suspension) API 없음 → 승인 뒤에는 처리할 수 있는 동작이 없다.

export enum SellerReviewAction {
  APPLY = 'APPLY',
  START_REVIEW = 'START_REVIEW',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export type SellerReviewHistory = {
  action: SellerReviewAction
  at: string
  /** 처리한 관리자 회원 번호. 신청·심사 시작은 null (서버가 결정한 관리자만 준다) */
  reviewerId: number | null
  /** 반려 사유 */
  reason: string | null
}

// ─── 정산 관리 ───────────────────────────────────────────
// ✅ GET /api/v1/admin/payouts(?payeeId&system&from&to), 상세·항목·후보, POST …/run, …/run/skip-wait.
// POST …/run/order-items/{id}, …/adjustments는 서버가 501로 막아 두었다.

/** 받는 사람 필터. seller면 payeeId(회원 번호)를 직접 입력한다. TODO(api): ❌ 판매자 이름 목록 API 없음 */
export type PayoutPayeeFilter = 'all' | 'system' | 'seller'

export type PayoutFilter = {
  payee: PayoutPayeeFilter
  /** 판매자 회원 번호 입력값 (payee === 'seller'일 때만 쓴다) */
  payeeId: string
  /** 완료일 시작 (포함) YYYY-MM-DD */
  from: string
  /** 완료일 끝 (포함) YYYY-MM-DD. API to는 미포함이라 하루 더해 보낸다 */
  to: string
}

/** 정산 배치 실행 결과. 서버는 실행 번호와 배치 상태만 준다 */
export type PayoutRunResult =
  | { kind: 'ok'; executionId: number; status: string; skipWait: boolean }
  | { kind: 'error'; message: string }

/** 1건 정산 결과. 지금은 서버가 501이라 error만 온다 */
export type SinglePayoutResult =
  | { kind: 'success'; orderItemId: number }
  | { kind: 'error'; message: string }

/**
 * 조정할 주문 상품의 지금 정산 금액 (미리보기 · 0원 미만 검사).
 * TODO(api): ❌ 주문 상품별 정산 금액 조회 API 없음 → 화면은 항상 idle로 두고 서버 검증에 맡긴다.
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

/** POST /admin/payouts/adjustments 본문과 같다 */
export type AdjustmentInput = {
  orderItemId: number
  eventType: PayoutEventType
  amount: number
  reason: string
}

/** TODO(api): ❌ 조정 내역 목록 API 없음 → 화면은 빈 목록을 넘긴다 */
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

/** 방금 저장한 조정. 조정 전후 금액은 API가 주지 않아 입력값만 보여 준다 */
export type AdjustmentResult = AdjustmentInput

// ─── 막힌 주문 · 대사 확인 ───────────────────────────────
// ✅ GET /api/v1/admin/payouts/blocked-orders, POST …/orders/{orderId}/resolution,
// GET …/orders/{orderId}/resolutions · …/resolution-requests, GET …/deposit-checks (백엔드 dev).
// 관리자 화면만 쓰는 응답이라 shared가 아니라 여기에 둔다. 시각은 서버 LocalDateTime 문자열.
// 실패 사유(reason)·원인 범주(category)는 서버가 늘릴 수 있는 문자열이라 enum으로 막지 않는다(labels.ts에서 아는 값만 바꾼다).

/** 막힌 순간·지금의 초과 청구 근거. 초과 청구가 원인이 아니거나 계산할 수 없으면 null로 온다 */
export type OverchargeEvidence = {
  /** 결제(지갑 차감) 금액 */
  deductedAmount: number
  /** 정산후보 합계 (조정 제외, 대기 중인 같은 주문 후보 포함) */
  candidateTotal: number
  /** 후보 합계 − 결제 금액. 지금 값은 풀렸으면 0이나 음수 */
  overflowAmount: number
  /** 처음 결제 금액을 넘긴 주문상품 ID. 배송비면 "배송비", 못 찾으면 "판별 불가" */
  firstOverflowItem: string
  /** 이미 지급해 돌아오지 않는 금액 */
  settledAmount: number
  settledItems: string[]
  /** 혼자 결제 금액을 넘는 주문상품 ID. 있으면 그 상품 금액이 틀린 것이 확실 */
  aloneOverItems: string[]
  sellerCount: number
  /** 지갑 금액 충돌로 받은 금액들. 있으면 결제 금액 자체가 틀렸을 수 있음 */
  conflictAmounts: number[]
}

export type BlockedOrderCause = {
  /** 배송비 후보면 null */
  orderItemId: number | null
  eventType: PayoutEventType
  reason: string
  category: string
  /** 내부 검사 내용(기대값·실제값). 관리자 화면에만 보여 준다 */
  detail: string
  sellerId: number
  failedAt: string
}

export type BlockedOrder = {
  orderId: number
  status: PayoutBlockStatus
  /** 성공한 실행에서 해결 안 된 실패가 남은 실행 수. 3이면 멈춘다. 잠김은 이 값과 상관없다 */
  failedRunCount: number
  lastFailedAt: string
  sellerIds: number[]
  reasons: string[]
  categories: string[]
  causes: BlockedOrderCause[]
  evidenceAtBlock: OverchargeEvidence | null
  evidenceNow: OverchargeEvidence | null
}

/** POST …/orders/{orderId}/resolution 본문. 메모는 1~255자(서버가 앞뒤 공백을 지운다) */
export type OrderResolveRequest = { memo: string }

/** 해결 요청 1번. POST 응답과 요청 묶음 조회가 같은 모양이다 */
export type ResolutionRequest = {
  /** UUID */
  resolutionRequestId: string
  orderId: number
  method: string
  adminId: number
  resolvedAt: string
  /** 관리자가 입력한 원문. React 기본 이스케이프로 그린다 */
  memo: string
  resolvedFailureCount: number
}

/** 해결 기록 1줄 = 해결한 실패 기록 1건 */
export type Resolution = {
  resolutionId: number
  resolutionRequestId: string
  failureId: number
  orderId: number
  orderItemId: number | null
  sellerId: number
  eventType: PayoutEventType
  amount: number
  reason: string
  category: string
  detail: string
  failedAt: string
  method: string
  adminId: number
  resolvedAt: string
  memo: string
}

/** 해결 기록 보기. requests: 해결 요청 1번 = 1줄, lines: 해결한 실패 기록 1건 = 1줄 */
export type ResolutionView = 'requests' | 'lines'

export type ResolutionHistoryRows =
  | { view: 'requests'; rows: ResolutionRequest[] }
  | { view: 'lines'; rows: Resolution[] }

export enum DepositCheckReason {
  NOT_FOUND = 'NOT_FOUND',
  NO_RESPONSE = 'NO_RESPONSE',
  PAYEE_MISMATCH = 'PAYEE_MISMATCH',
  AMOUNT_MISMATCH = 'AMOUNT_MISMATCH',
}

/** 정산·지갑 대사에서 관리자 확인이 필요해진 정산. 조회만 하고 처리 API는 없다 */
export type DepositCheckReview = {
  payoutId: number
  /** 정산이 기대한 판매자 */
  payeeId: number
  amount: number
  /** 지갑이 입금 있음으로 답한 판매자·금액. 입금 없음·답 없음이면 null */
  walletPayeeId: number | null
  walletAmount: number | null
  reason: DepositCheckReason
  /** 지갑에 물어본 횟수 (최대 3) */
  attemptCount: number
  notFoundCount: number
  /** 마지막으로 물으려 한 시각 (답을 받은 시각이 아님) */
  lastAskedAt: string
}

/** 정산 관리 안의 화면 3개. 주소: /admin/payouts, …/blocked-orders, …/deposit-checks */
export enum PayoutSection {
  PAYOUTS = 'payouts',
  BLOCKED_ORDERS = 'blocked-orders',
  DEPOSIT_CHECKS = 'deposit-checks',
}

// ─── 리뷰 분석 테스트 ────────────────────────────────────
// POST /api/v1/admin/review-analysis/keywords · /sentiment (BE #471, 백엔드 PR #462).
// 아직 dev에 들어가지 않은 계약이라 필드 이름이 바뀔 수 있다. 이 화면만 써서 shared가 아니라 여기에 둔다.

/** 전체 감성에는 ‘언급 없음’이 오지 않는다 */
export type OverallSentiment = Exclude<ReviewSentiment, ReviewSentiment.NOT_MENTIONED>

export type ReviewAnalysisRequest = {
  productId: number
  optionId: number
  /** 2,000자 이하 */
  content: string
}

export type AnalyzedKeyword = {
  keywordId: string
  phrase: string
  aspect: ReviewKeywordAspect
  /** 0~1 */
  probability: number
  /** 확률 0.9 이상이고 식감 규칙으로 빠지지 않은 키워드 */
  expressed: boolean
  excludedByTextureRule: boolean
}

/** 글자가 없는 본문이면 analyzed: false로 분석하지 않는다 */
export type KeywordAnalysis =
  | { analyzed: true; keywordVersion: string; model: string; keywords: AnalyzedKeyword[] }
  | { analyzed: false; keywordVersion: null; model: null; keywords: [] }

export type SentimentAnalysis =
  | {
      analyzed: true
      criteriaVersion: string
      model: string
      overall: OverallSentiment
      aspects: Record<ReviewAspect, ReviewSentiment>
    }
  | {
      analyzed: false
      criteriaVersion: null
      model: null
      overall: null
      aspects: Partial<Record<ReviewAspect, never>>
    }

/** 분석 패널 하나의 표시 상태 */
export type AnalysisPanel<T> =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T }
