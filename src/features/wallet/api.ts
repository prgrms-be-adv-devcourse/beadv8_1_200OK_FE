import { apiClient } from '@/shared/api/client'
import type {
  ChargeConfirmRequest,
  ChargeFailRequest,
  ChargeStatusResponse,
  LedgerEntry,
  LedgerParams,
  PageResponse,
  TermsAgreeRequest,
  TermsResponse,
  WalletChargeRequest,
  WalletChargeResponse,
} from '@/shared/api/types'

// 지갑(06 Wallet): 충전 약관 · 충전(토스페이먼츠) · 이용 내역. 모두 로그인 필요. 잔액 조회는 shared/api/walletBalance.ts(checkout·me도 씀).
// 2026-10-18 로컬 서버 확인: 동의 422 "필수 약관에 모두 동의해야 합니다." · "알 수 없는 약관 유형입니다."(errors 없이 detail만),
//   409 "약관이 변경되었습니다. 최신 약관을 확인해 주세요."(받은 version이 현재 버전이 아님)
// 2026-10-20 확인: 충전 건 없음 404 "충전 내역을 찾을 수 없습니다."

// ✅ GET /api/v1/wallets/me/terms → 200 { terms[] } (현재 버전 + 동의 여부)
export async function fetchWalletTerms(): Promise<TermsResponse> {
  const { data } = await apiClient.get<TermsResponse>('/api/v1/wallets/me/terms')
  return data
}

// ✅ POST /api/v1/wallets/me/terms/agreements → 204. 조회에서 받은 type·version 그대로, 필수 약관은 모두. 이미 동의했어도 204
export async function agreeWalletTerms(body: TermsAgreeRequest): Promise<void> {
  await apiClient.post('/api/v1/wallets/me/terms/agreements', body)
}

// ✅ POST /api/v1/wallets/me/charges → 201 { chargeNo, amount }. chargeNo를 토스 결제창 orderId로 넘긴다.
// 오류: 409 필수 약관 미동의·잔액 보유 한도 초과, 422 금액 규칙(10,000원 이상·단위) 위반
export async function requestCharge(body: WalletChargeRequest): Promise<WalletChargeResponse> {
  const { data } = await apiClient.post<WalletChargeResponse>('/api/v1/wallets/me/charges', body)
  return data
}

// ✅ POST /api/v1/wallets/me/charges/confirm → 200 { status }. successUrl 쿼리(orderId·paymentKey·amount)로 승인한다.
// 같은 충전 건으로 다시 불러도 승인은 한 번만 일어나고 현재 상태를 준다(멱등). 오류: 404 충전 건 없음, 409 한도 초과, 422 금액 불일치
export async function confirmCharge(body: ChargeConfirmRequest): Promise<ChargeStatusResponse> {
  const { data } = await apiClient.post<ChargeStatusResponse>(
    '/api/v1/wallets/me/charges/confirm',
    body,
  )
  return data
}

// ✅ POST /api/v1/wallets/me/charges/fail → 200 { status }. failUrl 쿼리(orderId·code·message)로 결제 전 충전 건을 실패로 바꾼다.
// 이미 승인이 시작됐거나 끝난 건은 바꾸지 않고 현재 상태를 준다
export async function failCharge(body: ChargeFailRequest): Promise<ChargeStatusResponse> {
  const { data } = await apiClient.post<ChargeStatusResponse>(
    '/api/v1/wallets/me/charges/fail',
    body,
  )
  return data
}

// ✅ GET /api/v1/wallets/me/charges/{chargeNo} → 200 { status }. 승인이 IN_PROGRESS였을 때 잠시 뒤 다시 확인하는 용도
export async function fetchChargeStatus(chargeNo: string): Promise<ChargeStatusResponse> {
  const { data } = await apiClient.get<ChargeStatusResponse>(
    `/api/v1/wallets/me/charges/${encodeURIComponent(chargeNo)}`,
  )
  return data
}

// ✅ GET /api/v1/wallets/me/ledgers?from&to&type&page&size → 이용 내역(최신순). from·to는 yyyy-MM-dd(둘 다 포함), size 1~50
export async function fetchLedgers(params: LedgerParams): Promise<PageResponse<LedgerEntry>> {
  const { data } = await apiClient.get<PageResponse<LedgerEntry>>('/api/v1/wallets/me/ledgers', {
    params,
  })
  return data
}
