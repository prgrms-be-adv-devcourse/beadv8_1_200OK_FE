import { apiClient } from '@/shared/api/client'
import { fetchProductDetail } from '@/shared/api/productDetail'
import type {
  PageResponse,
  PayoutSellerCandidate,
  PayoutSellerDetail,
  PayoutSellerItem,
  PayoutSummary,
  ProductCreateRequest,
  ProductCreateResponse,
  ProductStatusRequest,
  ProductUpdateRequest,
  ProductVisibilityRequest,
  SellerBalanceResponse,
  SellerPayoutCandidateParams,
  SellerPayoutListParams,
  SellerProductListParams,
  SellerProductSummary,
  SellerProfileRequest,
  SellerProfileResponse,
} from '@/shared/api/types'

// 판매자 상품·프로필·정산·잔액 요청. 모두 Bearer(SELLER). 403 SELLER가 아니거나 본인 것이 아님, 404 없거나 삭제됨.
// 오류는 서버 detail을 그대로 보여 준다.

// ─── 상품 ────────────────────────────────────────────────

// ✅ GET /api/v1/sellers/me/products?status&visibility&page&size → 최신순. 숨긴(HIDDEN) 상품도 나오고 삭제한 상품만 빠진다.
// 400 없는 상태·노출 값, 범위 밖 page·size
export async function fetchMyProducts(
  params: SellerProductListParams,
): Promise<PageResponse<SellerProductSummary>> {
  const { data } = await apiClient.get<PageResponse<SellerProductSummary>>(
    '/api/v1/sellers/me/products',
    { params },
  )
  return data
}

// ✅ POST /api/v1/products → 201 { productId }. status 생략 시 READY, visibility 생략 시 HIDDEN.
// 409 옵션명 중복, 422 검증 실패(errors[].path = options[0].salePrice 모양) · 판매가 > 정가 · 업로드하지 않은 이미지 URL
export async function createProduct(body: ProductCreateRequest): Promise<ProductCreateResponse> {
  const { data } = await apiClient.post<ProductCreateResponse>('/api/v1/products', body)
  return data
}

// ✅ PUT /api/v1/products/{id} → 204. 409는 version 불일치("다른 사용자가 이미 정보를 수정했습니다…") 또는 옵션명 중복.
// 옵션 id가 없으면 추가, 요청에 없는 기존 옵션은 삭제. 성공하면 서버 version이 1 오른다.
export async function updateProduct(productId: number, body: ProductUpdateRequest): Promise<void> {
  await apiClient.put(`/api/v1/products/${productId}`, body)
}

// ✅ PATCH /api/v1/products/{id}/status → 204. 상품 관리 목록의 바로 바꾸기에 쓴다.
// version을 받지 않아 마지막 요청이 반영되고, 성공하면 서버 version이 오른다(productCache.PATCH_VERSION_STEP).
export async function changeProductStatus(productId: number, body: ProductStatusRequest) {
  await apiClient.patch(`/api/v1/products/${productId}/status`, body)
}

// ✅ PATCH /api/v1/products/{id}/visibility → 204. 위 상태 변경과 같은 규칙
export async function changeProductVisibility(productId: number, body: ProductVisibilityRequest) {
  await apiClient.patch(`/api/v1/products/${productId}/visibility`, body)
}

// ✅ DELETE /api/v1/products/{id} → 204. version을 받지 않고 되돌릴 수 없다
export async function deleteProduct(productId: number): Promise<void> {
  await apiClient.delete(`/api/v1/products/${productId}`)
}

// ✅ GET /api/v1/products/{id} (구매자용 상세). 판매자 상세 API가 없어 옵션 id를 받으려고 쓴다.
// 공개(VISIBLE) 상품만 200이고 숨긴 상품은 404. version · 재고 수량 · visibility는 주지 않는다.
// TODO(api): 판매자 상세 API가 생기면 그것으로 바꾼다. 지금은 공용 상세 조회(shared/api/productDetail.ts)를 쓴다.
export const getProductDetail = fetchProductDetail

// ─── 상점 프로필 ─────────────────────────────────────────

// ✅ GET /api/v1/sellers/me/profile. 404 = 아직 등록하지 않음(등록 화면으로)
export async function fetchMyProfile(): Promise<SellerProfileResponse> {
  const { data } = await apiClient.get<SellerProfileResponse>('/api/v1/sellers/me/profile')
  return data
}

// ✅ POST /api/v1/sellers/me/profile → 201. 409 이미 등록함(수정 API로), 422 검증 실패·프로필용으로 올리지 않은 사진 주소
export async function createMyProfile(body: SellerProfileRequest): Promise<SellerProfileResponse> {
  const { data } = await apiClient.post<SellerProfileResponse>('/api/v1/sellers/me/profile', body)
  return data
}

// ✅ PUT /api/v1/sellers/me/profile → 200 전체 교체. profileImageUrl null이면 사진 삭제. 404 미등록(등록 API로)
export async function updateMyProfile(body: SellerProfileRequest): Promise<SellerProfileResponse> {
  const { data } = await apiClient.put<SellerProfileResponse>('/api/v1/sellers/me/profile', body)
  return data
}

// ─── 지갑 ────────────────────────────────────────────────

// ✅ GET /api/v1/wallets/sellers/me/balance → { balance }. 판매자 지갑은 승인 뒤 만들어지며 아직 없으면 0
export async function fetchSellerBalance(): Promise<SellerBalanceResponse> {
  const { data } = await apiClient.get<SellerBalanceResponse>('/api/v1/wallets/sellers/me/balance')
  return data
}

// ─── 정산 ────────────────────────────────────────────────
// from(포함)·to(미포함)은 ISO LocalDateTime("yyyy-MM-ddTHH:mm:ss") 필수, 최대 1년(넘으면 422). 누구 것인지는 토큰으로 정한다.
// 403 판매자가 아님 · 남의 정산(시스템 몫 포함)

// ✅ GET /api/v1/payouts/me?from&to&page&size → 확정 시각 최신순
export async function getPayouts(
  params: SellerPayoutListParams,
): Promise<PageResponse<PayoutSummary>> {
  const { data } = await apiClient.get<PageResponse<PayoutSummary>>('/api/v1/payouts/me', {
    params,
  })
  return data
}

// ✅ GET /api/v1/payouts/me/{id}. 남의 정산이면 403, 없으면 404
export async function getPayout(payoutId: number): Promise<PayoutSellerDetail> {
  const { data } = await apiClient.get<PayoutSellerDetail>(`/api/v1/payouts/me/${payoutId}`)
  return data
}

// ✅ GET /api/v1/payouts/me/{id}/items?page&size → 항목 ID 순. 조정 건이면 사유만 함께
export async function getPayoutItems(
  payoutId: number,
  params: { page: number; size: number },
): Promise<PageResponse<PayoutSellerItem>> {
  const { data } = await apiClient.get<PageResponse<PayoutSellerItem>>(
    `/api/v1/payouts/me/${payoutId}/items`,
    { params },
  )
  return data
}

// ✅ GET /api/v1/payouts/me/candidates?from&to&unsettledOnly&page&size → 후보 생성 시각 최신순.
// 구매확정으로 생긴 정산 대상(수수료 후보 제외). unsettledOnly=true면 아직 정산 전인 것만 → 정산 예정 금액
export async function getPayoutCandidates(
  params: SellerPayoutCandidateParams,
): Promise<PageResponse<PayoutSellerCandidate>> {
  const { data } = await apiClient.get<PageResponse<PayoutSellerCandidate>>(
    '/api/v1/payouts/me/candidates',
    { params },
  )
  return data
}
