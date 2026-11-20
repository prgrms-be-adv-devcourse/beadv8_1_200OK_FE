import { queryOptions } from '@tanstack/react-query'
import { isApiError } from './ApiError'
import { apiClient } from './client'
import { queryKeyPrefix } from './queryKeys'
import type { StoreProfile } from './types'

// 상점 프로필은 farms(상점 화면)가 쓰고, 상품 상세의 판매자 영역도 쓸 예정이라 shared에 둔다(ADR-0003).
// 상품 상세는 응답에 sellerId가 생기면(BE #741) 이 쿼리를 그대로 붙인다.
// 판매자가 자기 프로필을 저장하면 seller feature가 접두어(queryKeyPrefix.farms)로 이 캐시를 비운다.

// ✅ GET /api/v1/stores/{sellerId}. 로그인 없이 부른다(토큰을 보내도 서버가 보지 않는다).
// 404(SELLER_PROFILE_NOT_FOUND): 판매자가 아니거나 상점 프로필을 아직 등록하지 않았다
export async function fetchStoreProfile(sellerId: number): Promise<StoreProfile> {
  const { data } = await apiClient.get<StoreProfile>(`/api/v1/stores/${sellerId}`)
  return data
}

export const storeProfileQueryOptions = (sellerId: number) =>
  queryOptions({
    queryKey: [queryKeyPrefix.farms, 'store', sellerId] as const,
    queryFn: () => fetchStoreProfile(sellerId),
    staleTime: 60_000,
  })

/** 상점이 없다(404). 서버에 경로 자체가 없을 때의 404(No static resource)는 상점이 없다는 뜻이 아니라 빼낸다 */
export const isStoreNotFound = (error: unknown) =>
  isApiError(error) && error.status === 404 && !error.detail.startsWith('No static resource')
