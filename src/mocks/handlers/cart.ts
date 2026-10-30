import { HttpResponse, http } from 'msw'
import { cartGroups } from '@/features/cart/fixtures'
import type { Cart } from '@/shared/api/types'

// 장바구니 기본 응답 (cart fixtures의 사과·고구마 두 줄). 옵션은 products fixtures의 상품(101·102)에 있다.
// 상태를 들고 있지 않다: 변경 요청은 성공만 하고 조회는 늘 같은 장바구니를 준다.
// 실패 시나리오(401·404·409·422)는 테스트에서 server.use(...)로 덮는다.

export const mockCart: Cart = {
  cartId: 1,
  items: cartGroups.flatMap((group) =>
    group.lines.map(({ cartItemId, productOptionId, quantity, selected }) => ({
      cartItemId,
      productOptionId,
      quantity,
      selected,
    })),
  ),
}

const noContent = () => new HttpResponse(null, { status: 204 })

export const cartHandlers = [
  http.get('*/api/v1/cart', () => HttpResponse.json(mockCart)),
  http.post('*/api/v1/cart/items', () => HttpResponse.json({ cartItemId: 99 }, { status: 201 })),
  // 고정 경로(selection·selected)를 {cartItemId}보다 먼저 둔다
  http.patch('*/api/v1/cart/items/selection', noContent),
  http.delete('*/api/v1/cart/items/selected', noContent),
  http.patch('*/api/v1/cart/items/:cartItemId', noContent),
  http.patch('*/api/v1/cart/items/:cartItemId/selection', noContent),
  http.delete('*/api/v1/cart/items/:cartItemId', noContent),
]
