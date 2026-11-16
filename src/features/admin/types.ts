import type { PayoutEventType, ReviewKeywordAspect } from '@/shared/api/types'

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

// ─── 리뷰 분석 테스트 ────────────────────────────────────
// POST /api/v1/admin/review-analysis/keywords · /sentiment (BE #471, 백엔드 PR #462).
// 아직 dev에 들어가지 않은 계약이라 필드 이름이 바뀔 수 있다. 이 화면만 써서 shared가 아니라 여기에 둔다.

/** 감성을 나눠 보는 6개 항목. 화면 순서 그대로 */
export enum ReviewAspect {
  TASTE = 'TASTE',
  FRESHNESS = 'FRESHNESS',
  CONDITION = 'CONDITION',
  PACKAGING = 'PACKAGING',
  DELIVERY = 'DELIVERY',
  PRICE = 'PRICE',
}

export enum ReviewSentiment {
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
  NEUTRAL = 'NEUTRAL',
  MIXED = 'MIXED',
  NOT_MENTIONED = 'NOT_MENTIONED',
}

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
