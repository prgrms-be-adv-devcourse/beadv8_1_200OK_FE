import { apiClient } from '@/shared/api/client'
import type {
  Checkout,
  CreateOrderRequest,
  CreateOrderResponse,
  ShippingFeeQuote,
  ShippingFeeQuoteRequest,
} from '@/shared/api/types'

// 주문서 조회·주문 생성(07 Order)·배송비 견적(배송). 주문은 로그인 필요, 장바구니에서 selected = true인 상품이 대상.
// 2026-10-20 로컬 서버 확인: 견적은 판매자별 기본 배송비 3,000원, 제주(63000)는 regionGroup JEJU_ISLANDS · 추가 운임 5,000원,
//   우편번호 형식 오류 422 errors[].path "postalCode" "우편번호는 숫자 5자리여야 합니다."

// ✅ GET /api/v1/orders/checkout → 200 Checkout. totalAmount에 도서산간 운임이 빠져 있다 → 견적의 regionSurcharge를 더해 expectedTotalAmount로 보낸다
// 오류: 400 선택한 상품 없음·본인 상품, 404 옵션 없음, 409 판매 중 아님·재고 부족
export async function fetchCheckout(): Promise<Checkout> {
  const { data } = await apiClient.get<Checkout>('/api/v1/orders/checkout')
  return data
}

// ✅ POST /api/v1/orders → 201 { orderId }. 잔액(예치금)에서 결제한다.
// 오류: 409 금액 변경(ORDER_AMOUNT_CHANGED → 주문서 다시 조회)·잔액 부족·재고 부족, 400 선택 상품 없음·동의 안 함, 422 입력 검증
export async function createOrder(body: CreateOrderRequest): Promise<CreateOrderResponse> {
  const { data } = await apiClient.post<CreateOrderResponse>('/api/v1/orders', body)
  return data
}

// ✅ POST /api/v1/shipments/fee-quotes → 200 ShippingFeeQuote (로그인 불필요). 표시용이며 결제 금액은 주문이 서버에서 다시 계산한다.
// 오류: 422 우편번호 형식·판매자 목록(비었거나 100개 초과·중복)·금액 음수
export async function fetchShippingFeeQuote(
  body: ShippingFeeQuoteRequest,
): Promise<ShippingFeeQuote> {
  const { data } = await apiClient.post<ShippingFeeQuote>('/api/v1/shipments/fee-quotes', body)
  return data
}
