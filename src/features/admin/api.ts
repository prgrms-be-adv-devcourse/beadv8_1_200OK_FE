import { apiClient } from '@/shared/api/client'
import type {
  AdminPayoutCandidateParams,
  AdminPayoutListParams,
  PageResponse,
  PayoutAdjustmentCreateRequest,
  PayoutCandidate,
  PayoutDetail,
  PayoutItem,
  PayoutRunResponse,
  PayoutSummary,
  ProductSummary,
  SellerApplicationAdminDetail,
  SellerApplicationAdminSummary,
  SellerApplicationListParams,
  SellerApplicationRejectRequest,
} from '@/shared/api/types'
import type { KeywordAnalysis, ReviewAnalysisRequest, SentimentAnalysis } from './types'

// 관리자 콘솔 요청. 모두 Bearer(ADMIN 권한). 토큰 없으면 401, 관리자가 아니면 403.
// 오류는 서버 detail을 그대로 보여 준다(errors.ts에서 501·404 문구만 바꾼다).

// ─── 판매자 신청 심사 ────────────────────────────────────

const applications = '/api/v1/admin/seller-applications'

// ✅ GET /api/v1/admin/seller-applications?status&page&size → 오래된 신청부터. status 생략 시 전체.
// 422 상태 값 오류 · page 음수 · size 1~100 밖
export async function getSellerApplications(
  params: SellerApplicationListParams,
): Promise<PageResponse<SellerApplicationAdminSummary>> {
  const { data } = await apiClient.get<PageResponse<SellerApplicationAdminSummary>>(applications, {
    params,
  })
  return data
}

// ✅ GET /api/v1/admin/seller-applications/{id} → 통신판매업 신고번호 · 심사 일시 · 거절 사유 · 결정한 관리자. 404 없음
export async function getSellerApplication(
  applicationId: number,
): Promise<SellerApplicationAdminDetail> {
  const { data } = await apiClient.get<SellerApplicationAdminDetail>(
    `${applications}/${applicationId}`,
  )
  return data
}

// ✅ POST /api/v1/admin/seller-applications/{id}/review → PENDING → IN_REVIEW, 처리 뒤 상세.
// 409 심사 대기가 아니거나 다른 관리자가 먼저 처리함
export async function startSellerApplicationReview(
  applicationId: number,
): Promise<SellerApplicationAdminDetail> {
  const { data } = await apiClient.post<SellerApplicationAdminDetail>(
    `${applications}/${applicationId}/review`,
  )
  return data
}

// ✅ POST /api/v1/admin/seller-applications/{id}/approve → IN_REVIEW → APPROVED, 판매자 지갑 생성.
// 409 심사 중이 아님(심사를 시작하지 않은 신청은 승인 불가) · 동시 처리
export async function approveSellerApplication(
  applicationId: number,
): Promise<SellerApplicationAdminDetail> {
  const { data } = await apiClient.post<SellerApplicationAdminDetail>(
    `${applications}/${applicationId}/approve`,
  )
  return data
}

// ✅ POST /api/v1/admin/seller-applications/{id}/reject { reason } → PENDING·IN_REVIEW → REJECTED.
// 422 사유 비었거나 500자 초과(errors[].path = reason), 409 처리할 수 없는 상태 · 동시 처리
export async function rejectSellerApplication(
  applicationId: number,
  body: SellerApplicationRejectRequest,
): Promise<SellerApplicationAdminDetail> {
  const { data } = await apiClient.post<SellerApplicationAdminDetail>(
    `${applications}/${applicationId}/reject`,
    body,
  )
  return data
}

// ─── 정산 ────────────────────────────────────────────────

const payouts = '/api/v1/admin/payouts'

// ✅ GET /api/v1/admin/payouts?payeeId&system&from&to&page&size → 확정 시각 최신순. from(포함)·to(미포함) 필수, 최대 1년(넘으면 422)
export async function getAdminPayouts(
  params: AdminPayoutListParams,
): Promise<PageResponse<PayoutSummary>> {
  const { data } = await apiClient.get<PageResponse<PayoutSummary>>(payouts, { params })
  return data
}

// ✅ GET /api/v1/admin/payouts/{id}. 판매자 정산이면 수수료 합계와 systemPayoutId를 같이 준다. 404 없음
export async function getAdminPayout(payoutId: number): Promise<PayoutDetail> {
  const { data } = await apiClient.get<PayoutDetail>(`${payouts}/${payoutId}`)
  return data
}

// ✅ GET /api/v1/admin/payouts/{id}/items?page&size → 항목 ID 순. 조정 건이면 adjustment(조정 번호 · 관리자 · 사유)
export async function getAdminPayoutItems(
  payoutId: number,
  params: { page: number; size: number },
): Promise<PageResponse<PayoutItem>> {
  const { data } = await apiClient.get<PageResponse<PayoutItem>>(`${payouts}/${payoutId}/items`, {
    params,
  })
  return data
}

// ✅ GET /api/v1/admin/payouts/candidates?sellerId&from&to&unsettledOnly&page&size → 후보 생성 시각 최신순
export async function getAdminPayoutCandidates(
  params: AdminPayoutCandidateParams,
): Promise<PageResponse<PayoutCandidate>> {
  const { data } = await apiClient.get<PageResponse<PayoutCandidate>>(`${payouts}/candidates`, {
    params,
  })
  return data
}

// ✅ POST /api/v1/admin/payouts/run → { executionId, status }. 배치가 COMPLETED가 아니면 500. prod에서는 닫혀 있다(@Profile("!prod"))
export async function runPayouts(): Promise<PayoutRunResponse> {
  const { data } = await apiClient.post<PayoutRunResponse>(`${payouts}/run`)
  return data
}

// ✅ POST /api/v1/admin/payouts/run/skip-wait → 정산 대기 기간(15일)을 건너뛰고 미정산 후보를 모두 정산. 발표·연동 테스트용
export async function runPayoutsSkipWait(): Promise<PayoutRunResponse> {
  const { data } = await apiClient.post<PayoutRunResponse>(`${payouts}/run/skip-wait`)
  return data
}

// POST /api/v1/admin/payouts/run/order-items/{orderItemId} → 지금은 501(재처리 정책 미정). 400 숫자가 아님
export async function runPayoutForOrderItem(orderItemId: number): Promise<void> {
  await apiClient.post(`${payouts}/run/order-items/${orderItemId}`)
}

// POST /api/v1/admin/payouts/adjustments { orderItemId, eventType, amount, reason } → 지금은 501(조정 번호 발급 방식 미정).
// 422(금액 0 · 사유 공백·255자 초과 · 항목 종류)가 501보다 먼저 온다
export async function createPayoutAdjustment(body: PayoutAdjustmentCreateRequest): Promise<void> {
  await apiClient.post(`${payouts}/adjustments`, body)
}

// ─── 리뷰 분석 테스트 ────────────────────────────────────

/** 상품 목록 API가 받는 가장 큰 size */
export const PRODUCT_CHOICE_LIMIT = 100

// ✅ GET /api/v1/products?page=0&size=100 → 노출 상품 최신순. 검색 파라미터가 없어 이름 검색은 화면에서 한다
export async function getProductChoices(): Promise<PageResponse<ProductSummary>> {
  const { data } = await apiClient.get<PageResponse<ProductSummary>>('/api/v1/products', {
    params: { page: 0, size: PRODUCT_CHOICE_LIMIT },
  })
  return data
}

const reviewAnalysis = '/api/v1/admin/review-analysis'

// POST /api/v1/admin/review-analysis/keywords { productId, optionId, content } (BE #471, dev 반영 전).
// 404 상품 없음 · 400 다른 상품의 옵션 · 422 본문 비었거나 2,000자 초과 · 503 분석기 인증 거절 · 502 그 밖의 분석기 실패
export async function analyzeReviewKeywords(body: ReviewAnalysisRequest): Promise<KeywordAnalysis> {
  const { data } = await apiClient.post<KeywordAnalysis>(`${reviewAnalysis}/keywords`, body)
  return data
}

// POST /api/v1/admin/review-analysis/sentiment. 요청 · 오류는 keywords와 같다
export async function analyzeReviewSentiment(
  body: ReviewAnalysisRequest,
): Promise<SentimentAnalysis> {
  const { data } = await apiClient.post<SentimentAnalysis>(`${reviewAnalysis}/sentiment`, body)
  return data
}
