import { apiClient } from '@/shared/api/client'
import { fetchProductDetail } from '@/shared/api/productDetail'
import type {
  PayoutDetail,
  PayoutItem,
  PayoutListParams,
  PayoutPage,
  PayoutSummary,
  ProductCreateRequest,
  ProductCreateResponse,
  ProductStatusRequest,
  ProductUpdateRequest,
  ProductVisibilityRequest,
} from '@/shared/api/types'

// 판매자 상품 쓰기 · 정산 요청. 모두 임시 헤더(X-Member-Id · X-Member-Role)를 받는다 → shared/api/memberHeaders가 붙인다.
// 오류는 서버 detail을 그대로 보여 준다. 403 SELLER가 아니거나 본인 상품·정산이 아님, 404 없거나 삭제됨.

// ─── 상품 ────────────────────────────────────────────────

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

// ✅ PATCH /api/v1/products/{id}/status → 204. version을 받지 않는다(성공하면 서버 version이 2 오른다, 2026-10-18 확인).
// TODO(api): 화면 연결 없음 — 시안에 목록 행 컨트롤이 없고, version을 로컬에서 세므로 폼은 PUT 하나로 저장한다.
export async function changeProductStatus(productId: number, body: ProductStatusRequest) {
  await apiClient.patch(`/api/v1/products/${productId}/status`, body)
}

// ✅ PATCH /api/v1/products/{id}/visibility → 204. 위 상태 변경과 같은 규칙
// TODO(api): 화면 연결 없음 — 위 상태 변경과 같은 이유(노출은 폼의 PUT 본문으로 저장)
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

// ─── 정산 ────────────────────────────────────────────────

// ✅ GET /api/v1/payouts?payeeId&from&to&page&size. from(포함)·to(미포함) 필수, 최대 1년(넘으면 422).
// 판매자는 payeeId에 본인 회원 번호가 없으면 403
export async function getPayouts(params: PayoutListParams): Promise<PayoutPage<PayoutSummary>> {
  const { data } = await apiClient.get<PayoutPage<PayoutSummary>>('/api/v1/payouts', { params })
  return data
}

// ✅ GET /api/v1/payouts/{id}. 내 정산이 아니면 403, 없으면 404
export async function getPayout(payoutId: number): Promise<PayoutDetail> {
  const { data } = await apiClient.get<PayoutDetail>(`/api/v1/payouts/${payoutId}`)
  return data
}

// ✅ GET /api/v1/payouts/{id}/items?page&size
export async function getPayoutItems(
  payoutId: number,
  params: { page: number; size: number },
): Promise<PayoutPage<PayoutItem>> {
  const { data } = await apiClient.get<PayoutPage<PayoutItem>>(
    `/api/v1/payouts/${payoutId}/items`,
    { params },
  )
  return data
}
