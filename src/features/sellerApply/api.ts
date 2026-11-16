import { apiClient } from '@/shared/api/client'
import type { SellerApplyRequest, SellerApplyResponse } from '@/shared/api/types'

// 판매자 등록 신청. Bearer(일반 회원). 403 관리자 계정.
// 내 신청 내역·한 건 조회는 seller도 써서 shared/api/sellerApplication.ts에 있다.

// ✅ POST /api/v1/sellers/me/applications → 201 { applicationId }. 심사 대기(PENDING)로 저장.
// 409 진행 중인 신청이 있음("심사 중인 판매자 신청이 있습니다.") · 이미 판매자 · 사업자등록번호 중복("이미 신청된 사업자등록번호입니다.")
// 422 검증 실패(errors[].path = businessNumber·originPostalCode 등)
export async function applySeller(body: SellerApplyRequest): Promise<SellerApplyResponse> {
  const { data } = await apiClient.post<SellerApplyResponse>(
    '/api/v1/sellers/me/applications',
    body,
  )
  return data
}
