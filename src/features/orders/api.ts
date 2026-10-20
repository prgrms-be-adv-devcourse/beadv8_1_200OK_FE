import { apiClient } from '@/shared/api/client'
import type { OrderListParams, OrderSummary, PageResponse } from '@/shared/api/types'

// 주문 조회(07 Order). 로그인 필요. 상세 GET /orders/{orderId}는 reviews·checkout도 써서 shared/api/orderDetail.ts에 있다.

// ✅ GET /api/v1/orders?page&size → 내 주문 목록(최신순). size 1~50, 기본 10. 필터 파라미터는 없다
export async function fetchOrders(params: OrderListParams): Promise<PageResponse<OrderSummary>> {
  const { data } = await apiClient.get<PageResponse<OrderSummary>>('/api/v1/orders', { params })
  return data
}
