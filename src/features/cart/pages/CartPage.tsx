import { useState } from 'react'
import { useNavigate } from 'react-router'
import { showToast } from '@/shared/ui'
import { cartGroups, unavailableGroup } from '../fixtures'
import type { CartGroup, CartLine } from '../types'
import { CartView } from '../views/CartView'

// B-03 장바구니 라우트 /cart. 1단계: fixtures를 화면 안에서만 바꾼다.
// TODO(api): 2-3 조회·수량(낙관적 업데이트)·선택·전체 선택·삭제·선택 삭제. 상품 정보는 옵션별 상세로 보강

const mapLines = (groups: CartGroup[], fn: (line: CartLine) => CartLine | null) =>
  groups
    .map((group) => ({
      ...group,
      lines: group.lines.map(fn).filter((line): line is CartLine => line !== null),
    }))
    .filter((group) => group.lines.length > 0)

export function CartPage() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<CartGroup[]>([...cartGroups, unavailableGroup])

  const update = (fn: (line: CartLine) => CartLine | null) => setGroups(mapLines(groups, fn))

  return (
    <CartView
      status="success"
      groups={groups}
      onQuantityChange={(id, quantity) =>
        update((line) => (line.cartItemId === id ? { ...line, quantity } : line))
      }
      onToggleSelect={(id, selected) =>
        update((line) => (line.cartItemId === id ? { ...line, selected } : line))
      }
      onToggleAll={(selected) => update((line) => ({ ...line, selected }))}
      onRemove={(id) => {
        update((line) => (line.cartItemId === id ? null : line))
        showToast({ message: '장바구니에서 뺐어요' })
      }}
      onRemoveSelected={() => {
        update((line) => (line.selected ? null : line))
        showToast({ message: '선택한 상품을 뺐어요' })
      }}
      onRemoveUnavailable={() => {
        update((line) => (line.unavailableReason ? null : line))
        showToast({ message: '구매할 수 없는 상품을 뺐어요' })
      }}
      onOrder={() => navigate('/checkout')}
    />
  )
}
