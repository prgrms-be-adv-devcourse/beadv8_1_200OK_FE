import { useQuery } from '@tanstack/react-query'
import { storeProfileQueryOptions } from '@/shared/api/storeProfile'

// 상점 프로필 쿼리는 상품 상세도 쓸 예정이라 shared/api/storeProfile.ts가 키·요청을 갖는다

/** 잘못된 번호(null)면 부르지 않는다 */
export function useStoreProfile(sellerId: number | null) {
  return useQuery({ ...storeProfileQueryOptions(sellerId ?? 0), enabled: sellerId !== null })
}
