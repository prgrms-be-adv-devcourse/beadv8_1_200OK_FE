import { apiClient } from './client'
import { queryKeyPrefix } from './queryKeys'
import type { SellerApplicationHistoryResponse, SellerApplicationResponse } from './types'

// 내 판매자 신청 조회는 sellerApply(신청·현황)와 seller(프로필 출고지 우편번호 기본값)가 함께 써서 shared로 올렸다
// (ADR-0003: 둘 이상이 쓰면 승격). 키도 여기 두고 sellerApplyKeys가 그대로 써서 두 feature가 캐시를 나눠 쓴다.
// BUYER 권한 API라 승인된 판매자(BUYER+SELLER)도 부를 수 있다.

// ✅ GET /api/v1/sellers/me/applications → { applications } 최근 신청부터. 거절된 신청도 이력으로 포함. 없으면 빈 목록
export async function fetchMyApplications(): Promise<SellerApplicationHistoryResponse> {
  const { data } = await apiClient.get<SellerApplicationHistoryResponse>(
    '/api/v1/sellers/me/applications',
  )
  return data
}

// ✅ GET /api/v1/sellers/me/applications/{id} → 상호·대표자·사업자등록번호·출고지 우편번호·신청일. 404 없거나 남의 신청
export async function fetchMyApplication(
  applicationId: number,
): Promise<SellerApplicationResponse> {
  const { data } = await apiClient.get<SellerApplicationResponse>(
    `/api/v1/sellers/me/applications/${applicationId}`,
  )
  return data
}

/** 내 신청 내역 키 (= sellerApplyKeys.history()) */
export const myApplicationsQueryKey = () => [queryKeyPrefix.sellerApply, 'history'] as const

/** 내 신청 한 건 키 (= sellerApplyKeys.detail(id)) */
export const myApplicationQueryKey = (applicationId: number) =>
  [queryKeyPrefix.sellerApply, 'detail', applicationId] as const
