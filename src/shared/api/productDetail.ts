import { queryOptions } from '@tanstack/react-query'
import { apiClient } from './client'
import { queryKeyPrefix } from './queryKeys'
import type { ProductDetail } from './types'

// 상품 상세는 products · cart · reviews · seller가 함께 써서 shared로 올렸다(ADR-0003: 둘 이상이 쓰면 승격).
// 키는 products의 키 팩토리(productKeys.detail)와 같은 모양이라 캐시를 나눠 쓴다.

// ✅ GET /api/v1/products/{productId}. 없음·삭제·숨김은 404
export async function fetchProductDetail(productId: number): Promise<ProductDetail> {
  const { data } = await apiClient.get<ProductDetail>(`/api/v1/products/${productId}`)
  return data
}

export const productDetailQueryOptions = (productId: number) =>
  queryOptions({
    queryKey: [queryKeyPrefix.products, 'detail', productId] as const,
    queryFn: () => fetchProductDetail(productId),
    staleTime: 60_000,
  })
