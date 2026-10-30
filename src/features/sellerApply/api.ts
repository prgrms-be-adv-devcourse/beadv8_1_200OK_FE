import { apiClient } from '@/shared/api/client'
import type {
  SellerApplicationHistoryResponse,
  SellerApplicationResponse,
  SellerApplyRequest,
  SellerApplyResponse,
} from '@/shared/api/types'

// 판매자 등록 신청 · 내 신청 내역. 모두 Bearer(일반 회원). 403 관리자 계정.

// ✅ POST /api/v1/sellers/me/applications → 201 { applicationId }. 심사 대기(PENDING)로 저장.
// 409 진행 중인 신청이 있음("심사 중인 판매자 신청이 있습니다.") · 이미 판매자 · 사업자등록번호 중복("이미 신청된 사업자등록번호입니다.")
// 422 검증 실패(errors[].path = businessNumber 등)
export async function applySeller(body: SellerApplyRequest): Promise<SellerApplyResponse> {
  const { data } = await apiClient.post<SellerApplyResponse>(
    '/api/v1/sellers/me/applications',
    body,
  )
  return data
}

// ✅ GET /api/v1/sellers/me/applications → { applications } 최근 신청부터. 거절된 신청도 이력으로 포함. 없으면 빈 목록
export async function fetchMyApplications(): Promise<SellerApplicationHistoryResponse> {
  const { data } = await apiClient.get<SellerApplicationHistoryResponse>(
    '/api/v1/sellers/me/applications',
  )
  return data
}

// ✅ GET /api/v1/sellers/me/applications/{id} → 상호·대표자·사업자등록번호·신청일. 404 없거나 남의 신청
export async function fetchMyApplication(
  applicationId: number,
): Promise<SellerApplicationResponse> {
  const { data } = await apiClient.get<SellerApplicationResponse>(
    `/api/v1/sellers/me/applications/${applicationId}`,
  )
  return data
}
