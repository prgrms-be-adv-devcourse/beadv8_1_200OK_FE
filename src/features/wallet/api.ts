import { apiClient } from '@/shared/api/client'
import type { TermsAgreeRequest, TermsResponse } from '@/shared/api/types'

// 충전 약관(06 Wallet Terms). 로그인 필요. 충전·잔액·이용 내역 API는 아직 없다(📝).
// 2026-10-18 로컬 서버 확인: 동의 422 "필수 약관에 모두 동의해야 합니다." · "알 수 없는 약관 유형입니다."(errors 없이 detail만),
//   409 "약관이 변경되었습니다. 최신 약관을 확인해 주세요."(받은 version이 현재 버전이 아님)

// GET /api/v1/wallets/me/terms → 200 { terms[] } (현재 버전 + 동의 여부)
export async function fetchWalletTerms(): Promise<TermsResponse> {
  const { data } = await apiClient.get<TermsResponse>('/api/v1/wallets/me/terms')
  return data
}

// POST /api/v1/wallets/me/terms/agreements → 204. 조회에서 받은 type·version 그대로, 필수 약관은 모두. 이미 동의했어도 204
export async function agreeWalletTerms(body: TermsAgreeRequest): Promise<void> {
  await apiClient.post('/api/v1/wallets/me/terms/agreements', body)
}
