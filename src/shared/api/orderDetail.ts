import { queryOptions } from '@tanstack/react-query'
import { apiClient } from './client'
import { queryKeyPrefix } from './queryKeys'
import type { OrderDetail } from './types'

// 주문 상세는 orders · reviews(작성 대상) · checkout(완료 화면)이 함께 써서 shared로 올렸다(ADR-0003).
// 키는 orders의 키 팩토리(orderKeys.detail)와 같은 모양이라 캐시를 나눠 쓴다.

// ✅ GET /api/v1/orders/{orderId}. 없거나 다른 회원의 주문이면 404
export async function fetchOrderDetail(orderId: number): Promise<OrderDetail> {
  const { data } = await apiClient.get<OrderDetail>(`/api/v1/orders/${orderId}`)
  return data
}

export const orderDetailQueryOptions = (orderId: number) =>
  queryOptions({
    queryKey: [queryKeyPrefix.orders, 'detail', orderId] as const,
    queryFn: () => fetchOrderDetail(orderId),
    staleTime: 30_000,
  })
