import { apiClient } from '@/shared/api/client'
import type { Cart, CartItemAddRequest, CartItemAddResponse } from '@/shared/api/types'

// 장바구니(05 Cart). 모두 로그인 필요.
// 2026-10-18 로컬 서버 확인: 담기 409 "이미 장바구니에 담긴 상품입니다.", 수량 1 미만 422(errors[].path quantity),
//   없는 장바구니 상품 404 "장바구니 상품을 찾을 수 없습니다."
// ⚠️ 서버가 담기에서 옵션 존재·판매 상태를 아직 확인하지 않는다(없는 옵션·판매 예정·품절 옵션도 201).
//   그래서 화면이 상품 상세로 살 수 있는지 다시 판단한다(cartLines.ts).

// GET /api/v1/cart → 200 { cartId, items[] } (옵션 ID 순)
// 헤더 장바구니 개수도 이것을 쓴다. 401이어도 로그인 화면으로 보내지 않는다:
// 토큰이 거절되면 세션이 끝나 /cart는 가드가 로그인으로 보내고, 공개 화면은 개수만 사라진다.
export async function fetchCart(): Promise<Cart> {
  const { data } = await apiClient.get<Cart>('/api/v1/cart', { skipAuthRedirect: true })
  return data
}

// POST /api/v1/cart/items → 201 { cartItemId }. 담은 상품은 selected = true로 시작
export async function addCartItem(body: CartItemAddRequest): Promise<CartItemAddResponse> {
  const { data } = await apiClient.post<CartItemAddResponse>('/api/v1/cart/items', body)
  return data
}

// PATCH /api/v1/cart/items/{cartItemId} → 204. quantity ≥ 1
export async function changeCartQuantity(cartItemId: number, quantity: number): Promise<void> {
  await apiClient.patch(`/api/v1/cart/items/${cartItemId}`, { quantity })
}

// PATCH /api/v1/cart/items/{cartItemId}/selection → 204
export async function changeCartSelection(cartItemId: number, selected: boolean): Promise<void> {
  await apiClient.patch(`/api/v1/cart/items/${cartItemId}/selection`, { selected })
}

// PATCH /api/v1/cart/items/selection → 204
export async function changeAllCartSelection(selected: boolean): Promise<void> {
  await apiClient.patch('/api/v1/cart/items/selection', { selected })
}

// DELETE /api/v1/cart/items/{cartItemId} → 204
export async function deleteCartItem(cartItemId: number): Promise<void> {
  await apiClient.delete(`/api/v1/cart/items/${cartItemId}`)
}

// DELETE /api/v1/cart/items/selected → 204
export async function deleteSelectedCartItems(): Promise<void> {
  await apiClient.delete('/api/v1/cart/items/selected')
}
