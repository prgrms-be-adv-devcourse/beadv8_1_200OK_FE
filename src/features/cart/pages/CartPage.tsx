import { useNavigate } from 'react-router'
import {
  cartErrorMessage,
  useCartGroups,
  useChangeAllCartSelection,
  useChangeCartQuantity,
  useChangeCartSelection,
  useDeleteCartItems,
  useDeleteSelectedCartItems,
  useSettleCart,
} from '../queries'
import { CartView } from '../views/CartView'

// B-03 장바구니 라우트 /cart. 조회 + 옵션별 상품 상세 보강, 수량·선택·전체 선택(낙관적)·삭제·선택 삭제.
// 실패하면 되돌리고 서버 문구를 토스트로 알린다(queries.ts).

export function CartPage() {
  const navigate = useNavigate()
  const cart = useCartGroups()
  const changeQuantity = useChangeCartQuantity()
  const changeSelection = useChangeCartSelection()
  const changeAll = useChangeAllCartSelection()
  const remove = useDeleteCartItems('장바구니에서 뺐어요')
  const removeUnavailable = useDeleteCartItems('구매할 수 없는 상품을 뺐어요')
  const removeSelected = useDeleteSelectedCartItems()
  const settle = useSettleCart()

  const unavailableIds = cart.groups
    .flatMap((group) => group.lines)
    .filter((line) => line.unavailableReason)
    .map((line) => line.cartItemId)

  return (
    <CartView
      status={cart.status}
      groups={cart.groups}
      errorMessage={cart.status === 'error' ? cartErrorMessage(cart.error) : undefined}
      onRetry={cart.refetch}
      onQuantityChange={(cartItemId, quantity) => changeQuantity.mutate({ cartItemId, quantity })}
      onToggleSelect={(cartItemId, selected) => changeSelection.mutate({ cartItemId, selected })}
      onToggleAll={(selected) => changeAll.mutate(selected)}
      onRemove={(cartItemId) => remove.mutate([cartItemId])}
      onRemoveSelected={() => removeSelected.mutate()}
      onRemoveUnavailable={() => removeUnavailable.mutate(unavailableIds)}
      onOrder={async () => {
        await settle()
        navigate('/checkout')
      }}
    />
  )
}
