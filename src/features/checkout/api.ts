import { apiClient } from '@/shared/api/client'
import type { Checkout, CreateOrderRequest, CreateOrderResponse } from '@/shared/api/types'

// 주문서 조회·주문 생성(07 Order). 로그인 필요. 둘 다 장바구니에서 selected = true인 상품이 대상.
// TODO(api): 2026-10-18 로컬 서버(dev)에는 주문 API가 아직 없어 404(No static resource). Bruno 계약대로 연결하고
//   성공 흐름은 MSW로만 확인했다. 오류 문구 처리는 errors.ts

// GET /api/v1/orders/checkout → 200 Checkout. totalAmount에 도서산간 운임이 빠져 있다(조회 API 없음 → 0원으로 본다)
// 오류: 400 선택한 상품 없음·본인 상품, 404 옵션 없음, 409 판매 중 아님·재고 부족
export async function fetchCheckout(): Promise<Checkout> {
  const { data } = await apiClient.get<Checkout>('/api/v1/orders/checkout')
  return data
}

// POST /api/v1/orders → 201 { orderId }. 잔액(예치금)에서 결제한다.
// 오류: 409 금액 변경(ORDER_AMOUNT_CHANGED → 주문서 다시 조회)·잔액 부족·재고 부족, 400 선택 상품 없음·동의 안 함, 422 입력 검증
export async function createOrder(body: CreateOrderRequest): Promise<CreateOrderResponse> {
  const { data } = await apiClient.post<CreateOrderResponse>('/api/v1/orders', body)
  return data
}
