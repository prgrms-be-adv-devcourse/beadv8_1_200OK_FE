import { apiClient } from '@/shared/api/client'
import type {
  AdminPayoutCandidateParams,
  AdminPayoutListParams,
  PageResponse,
  PayoutAdjustmentCreateRequest,
  PayoutAdjustmentCreateResponse,
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
import type { AdminCharge, AdminChargeDetail, ChargeReasonRequest } from './charges'
import type {
  BlockedOrder,
  BlockedOrderParams,
  DepositCheckReview,
  KeywordAnalysis,
  OrderResolveRequest,
  Resolution,
  ResolutionRequest,
  ResolutionRequestParams,
  ReviewAnalysisRequest,
  SearchInsightsParams,
  SentimentAnalysis,
  UntaggedProduct,
  ZeroResultKeyword,
} from './types'

// 관리자 콘솔 요청. 모두 Bearer(ADMIN 권한). 토큰 없으면 401, 관리자가 아니면 403.
// 오류는 서버 detail을 그대로 보여 준다(errors.ts에서 501·404와 일부 409 문구만 바꾼다).

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

// ✅ GET /api/v1/admin/payouts/candidates?sellerId&orderId&from&to&unsettledOnly&page&size → 후보 생성 시각 최신순.
// orderId가 없으면 기간 필수(422 path periodPresentWithoutOrderId), 있으면 기간 없이 그 주문의 후보 전부(대기 중·정산됨·조정)
export async function getAdminPayoutCandidates(
  params: AdminPayoutCandidateParams,
): Promise<PageResponse<PayoutCandidate>> {
  const { data } = await apiClient.get<PageResponse<PayoutCandidate>>(`${payouts}/candidates`, {
    params,
  })
  return data
}

// ✅ POST /api/v1/admin/payouts/run → { executionId, status }. 409 이미 실행 중(ShedLock), 배치가 COMPLETED가 아니면 500
export async function runPayouts(): Promise<PayoutRunResponse> {
  const { data } = await apiClient.post<PayoutRunResponse>(`${payouts}/run`)
  return data
}

// ✅ POST /api/v1/admin/payouts/run/skip-wait → 정산 대기 기간(15일)을 건너뛰고 미정산 후보를 모두 정산. 발표·연동 테스트용.
// 409 서버 설정으로 꺼짐(기본값) · 이미 실행 중. 둘 다 type이 about:blank라 detail로 가른다(errors.ts)
export async function runPayoutsSkipWait(): Promise<PayoutRunResponse> {
  const { data } = await apiClient.post<PayoutRunResponse>(`${payouts}/run/skip-wait`)
  return data
}

// POST /api/v1/admin/payouts/run/order-items/{orderItemId} → 지금은 501(재처리 정책 미정). 400 숫자가 아님
export async function runPayoutForOrderItem(orderItemId: number): Promise<void> {
  await apiClient.post(`${payouts}/run/order-items/${orderItemId}`)
}

// ✅ POST /api/v1/admin/payouts/adjustments { orderItemId, eventType, amount, reason } → 201 방금 저장한 조정 정산후보.
// eventType은 SALE_AMOUNT·SALE_FEE만(배송비 불가). 422 금액 0 · 사유 공백·255자 초과 · 항목 종류 · 원래 정산후보 없음,
// 409 같은 주문 항목·종류·금액·사유의 조정이 이미 있음(재전송). 조정은 지울 수 없어 반대 금액으로 상쇄한다
export async function createPayoutAdjustment(
  body: PayoutAdjustmentCreateRequest,
): Promise<PayoutAdjustmentCreateResponse> {
  const { data } = await apiClient.post<PayoutAdjustmentCreateResponse>(
    `${payouts}/adjustments`,
    body,
  )
  return data
}

// ─── 막힌 주문 · 대사 확인 ───────────────────────────────

type PageParams = { page: number; size: number }

// ✅ GET /api/v1/admin/payouts/blocked-orders?orderId&status&page&size → 마지막 실패 시각 최신순. 기간 조건 없음.
// status는 여러 개(status=LOCKED&status=STOPPED), 생략하면 셋 다. orderId면 그 주문 줄만(막힌 주문이 아니면 빈 목록).
// 422 status 값이 LOCKED·STOPPED·RESOLVED가 아님. 해결한 주문은 다음 정산 실행이 끝날 때까지 RESOLVED로 남는다
export async function getBlockedOrders(
  params: BlockedOrderParams,
): Promise<PageResponse<BlockedOrder>> {
  const { data } = await apiClient.get<PageResponse<BlockedOrder>>(`${payouts}/blocked-orders`, {
    params,
    // 배열을 status[]=가 아니라 status=로 반복한다 (Spring List 바인딩)
    paramsSerializer: { indexes: null },
  })
  return data
}

// ✅ POST /api/v1/admin/payouts/orders/{orderId}/resolution { memo } → 201 방금 저장한 해결 요청.
// 409 해결할 잠금·멈춤 없음(이미 해결 · 동시 요청 · 없는 주문), 422 메모 공백·255자 초과(errors[].path = memo)
export async function resolveBlockedOrder(
  orderId: number,
  body: OrderResolveRequest,
): Promise<ResolutionRequest> {
  const { data } = await apiClient.post<ResolutionRequest>(
    `${payouts}/orders/${orderId}/resolution`,
    body,
  )
  return data
}

// ✅ GET /api/v1/admin/payouts/orders/{orderId}/resolution-requests?page&size → 해결 요청 1번 = 1줄, 최신순. 없으면 빈 목록
export async function getResolutionRequests(
  orderId: number,
  params: PageParams,
): Promise<PageResponse<ResolutionRequest>> {
  const { data } = await apiClient.get<PageResponse<ResolutionRequest>>(
    `${payouts}/orders/${orderId}/resolution-requests`,
    { params },
  )
  return data
}

// ✅ GET /api/v1/admin/payouts/orders/{orderId}/resolutions?page&size → 해결한 실패 기록 1건 = 1줄, 최신순
export async function getResolutions(
  orderId: number,
  params: PageParams,
): Promise<PageResponse<Resolution>> {
  const { data } = await apiClient.get<PageResponse<Resolution>>(
    `${payouts}/orders/${orderId}/resolutions`,
    { params },
  )
  return data
}

// ✅ GET /api/v1/admin/payouts/resolution-requests?from&to&adminId&page&size → 기간 안의 해결 요청 1번 = 1줄, 해결 시각 최신순.
// 기간 필수(해결 시각 기준, from 포함·to 미포함), 최대 1년. 422 기간 없음 · 시작이 끝보다 같거나 늦음 · 1년 초과 · adminId 범위
export async function getResolutionRequestsInPeriod(
  params: ResolutionRequestParams,
): Promise<PageResponse<ResolutionRequest>> {
  const { data } = await apiClient.get<PageResponse<ResolutionRequest>>(
    `${payouts}/resolution-requests`,
    { params },
  )
  return data
}

// ✅ GET /api/v1/admin/payouts/deposit-checks?page&size → 관리자 확인이 필요한 정산만, 새 정산 먼저. 조회 전용
export async function getDepositCheckReviews(
  params: PageParams,
): Promise<PageResponse<DepositCheckReview>> {
  const { data } = await apiClient.get<PageResponse<DepositCheckReview>>(
    `${payouts}/deposit-checks`,
    { params },
  )
  return data
}

// ─── 멈춘 충전 건 ────────────────────────────────────────

const charges = '/api/v1/admin/wallets/charges'
const chargePath = (chargeNo: string) => `${charges}/${encodeURIComponent(chargeNo)}`

// ✅ GET /api/v1/admin/wallets/charges → 멈춘 처리 중 건 + 승인 뒤 실패한 건, 요청 시각 순 최대 100건(페이지 없음)
export async function getChargeTargets(): Promise<AdminCharge[]> {
  const { data } = await apiClient.get<AdminCharge[]>(charges)
  return data
}

// ✅ GET /api/v1/admin/wallets/charges/{chargeNo} → 충전 건 + 토스 결제 상태. 부를 때마다 토스에 묻는다(상태는 안 바꿈). 404 없음
export async function getChargeDetail(chargeNo: string): Promise<AdminChargeDetail> {
  const { data } = await apiClient.get<AdminChargeDetail>(chargePath(chargeNo))
  return data
}

// 처리 3개는 처리 뒤의 충전 건을 200으로 돌려준다. 404 없음 · 409 끝났거나 먼저 처리됨·토스 상태와 맞지 않음 · 503 토스 답 없음

// ✅ POST …/{chargeNo}/complete (본문 없음) → COMPLETED
export async function completeCharge(chargeNo: string): Promise<AdminCharge> {
  const { data } = await apiClient.post<AdminCharge>(`${chargePath(chargeNo)}/complete`)
  return data
}

// ✅ POST …/{chargeNo}/fail { reason } → FAILED(ADMIN_FAILED). 422 사유 없음·200자 초과(errors[].path = reason)
export async function failCharge(
  chargeNo: string,
  body: ChargeReasonRequest,
): Promise<AdminCharge> {
  const { data } = await apiClient.post<AdminCharge>(`${chargePath(chargeNo)}/fail`, body)
  return data
}

// ✅ POST …/{chargeNo}/cancel-payment { reason } → paymentCanceledAt. 사유는 토스에도 보낸다.
// 409에 토스 취소 거절 포함, 503이면 다시 눌러도 두 번 취소되지 않는다
export async function cancelChargePayment(
  chargeNo: string,
  body: ChargeReasonRequest,
): Promise<AdminCharge> {
  const { data } = await apiClient.post<AdminCharge>(`${chargePath(chargeNo)}/cancel-payment`, body)
  return data
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

// ─── 검색 점검 ───────────────────────────────────────────

const productSearch = '/api/v1/admin/product-search'

// ✅ GET /api/v1/admin/product-search/zero-result-keywords?from&to&limit → 0건 횟수 많은 순(같으면 마지막 검색이 늦은 순).
// from·to는 yyyy-MM-dd(둘 다 포함, KST), limit 1~100(기본 20). 0건 검색이 없으면 빈 목록.
// 400 시작일 > 종료일(product/invalid-search-log-period) · 시작일이 보존 기간(기본 90일) 밖(…/search-log-period-beyond-retention) · 형식 · limit 범위
export async function getZeroResultKeywords(
  params: SearchInsightsParams,
): Promise<ZeroResultKeyword[]> {
  const { data } = await apiClient.get<ZeroResultKeyword[]>(
    `${productSearch}/zero-result-keywords`,
    { params },
  )
  return data
}

// ✅ GET /api/v1/admin/product-search/untagged-products?from&to&limit → 판정을 마쳤는데 태그가 0개인 상품, 최근 판정 순.
// 기간은 판정 시각 기준. 판정 대기·최종 실패·삭제 상품은 빠진다. 400 시작일 > 종료일(product/invalid-tag-judgment-period) · 형식 · limit 범위
export async function getUntaggedProducts(
  params: SearchInsightsParams,
): Promise<UntaggedProduct[]> {
  const { data } = await apiClient.get<UntaggedProduct[]>(`${productSearch}/untagged-products`, {
    params,
  })
  return data
}
