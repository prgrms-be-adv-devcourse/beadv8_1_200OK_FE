import { apiClient } from '@/shared/api/client'
import type {
  OrderListParams,
  OrderSummary,
  PageResponse,
  ShipmentDetail,
  ShipmentPage,
} from '@/shared/api/types'

// 주문 조회(07 Order)·내 배송(06 Shipping)·구매확정. 로그인 필요. 상세 GET /orders/{orderId}는 reviews·checkout도 써서 shared/api/orderDetail.ts에 있다.

// ✅ GET /api/v1/orders?page&size → 내 주문 목록(최신순). size 1~50, 기본 10. 필터 파라미터는 없다
export async function fetchOrders(params: OrderListParams): Promise<PageResponse<OrderSummary>> {
  const { data } = await apiClient.get<PageResponse<OrderSummary>>('/api/v1/orders', { params })
  return data
}

// ✅ GET /api/v1/shipments?page → 내 배송(BUYER), 최신순 25건 고정. 판매자마다 배송이 따로라 한 주문이 여러 건일 수 있다.
// 403 BUYER가 아님(관리자), 422 page가 음수
export async function fetchShipments(page: number): Promise<ShipmentPage> {
  const { data } = await apiClient.get<ShipmentPage>('/api/v1/shipments', { params: { page } })
  return data
}

// ✅ GET /api/v1/shipments/{shipmentId} → 배송 상세. 404 없거나 다른 구매자의 배송
export async function fetchShipmentDetail(shipmentId: number): Promise<ShipmentDetail> {
  const { data } = await apiClient.get<ShipmentDetail>(`/api/v1/shipments/${shipmentId}`)
  return data
}

// ✅ POST /api/v1/orders/{orderId}/items/{orderItemId}/confirm → 204. 배송 완료(DELIVERED)된 주문 상품 1건을 구매확정한다.
// 직접 안 눌러도 배송 완료 3일 뒤 서버가 자동으로 확정한다. 404 없거나 남의 주문, 409 배송 완료가 아니거나(환불 중 포함) 이미 확정
export async function confirmOrderItem(orderId: number, orderItemId: number): Promise<void> {
  await apiClient.post(`/api/v1/orders/${orderId}/items/${orderItemId}/confirm`)
}
