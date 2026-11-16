import { apiClient } from '@/shared/api/client'
import type { Refund, RefundCreateRequest, RefundPage } from '@/shared/api/refund'
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

// ─── 취소 요청(환불, 출고 전) ────────────────────────────
// 요청만으로는 주문 상품 상태가 바뀌지 않는다(상세의 status는 PREPARING 그대로). 요청 상태는 아래 목록으로 안다.

// ✅ GET /api/v1/refunds?page → 내 취소 요청, 최신순 25건 고정. 주문으로 거르는 파라미터는 없다
export async function fetchMyRefunds(page: number): Promise<RefundPage> {
  const { data } = await apiClient.get<RefundPage>('/api/v1/refunds', { params: { page } })
  return data
}

// ✅ POST /api/v1/refunds → 201 REQUESTED. 404 없거나 남의 주문 상품,
// 409 출고 전이 아님 · 산 개수 초과 · 진행 중인 요청 있음 · 이 상품만 취소할 수 없음(무료배송이 깨져 뺄 배송비가 더 큼),
// 422 개수 1 미만·사유 255자 초과, 503 주문 확인 실패
export async function requestRefund(body: RefundCreateRequest): Promise<Refund> {
  const { data } = await apiClient.post<Refund>('/api/v1/refunds', body)
  return data
}

// ✅ POST /api/v1/refunds/{refundId}/withdraw → 200 WITHDRAWN. 승인 전(REQUESTED)만. 404 없거나 남의 요청, 409 이미 처리됨
export async function withdrawRefund(refundId: number): Promise<Refund> {
  const { data } = await apiClient.post<Refund>(`/api/v1/refunds/${refundId}/withdraw`)
  return data
}
