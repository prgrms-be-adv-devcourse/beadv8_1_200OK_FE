import type { ScreenPreview } from '@/shared/lib/screenPreview'
import { cartGroups, unavailableGroup } from './fixtures'
import { CartView, type CartViewProps } from './views/CartView'

// /__design 화면 상태 갤러리 (개발 전용, app/dev만 import한다)

const noop = () => {}

const cart = (props: Partial<CartViewProps> = {}) => (
  <CartView
    status="success"
    groups={cartGroups}
    onQuantityChange={noop}
    onToggleSelect={noop}
    onToggleAll={noop}
    onRemove={noop}
    onRemoveSelected={noop}
    onRemoveUnavailable={noop}
    onOrder={noop}
    onRetry={noop}
    {...props}
  />
)

const unselected = cartGroups.map((group) => ({
  ...group,
  lines: group.lines.map((line) => ({ ...line, selected: false })),
}))

export const cartPreviews: ScreenPreview[] = [
  {
    id: 'cart',
    title: 'B-03 장바구니',
    layout: 'public',
    path: '/cart',
    states: [
      { id: 'default', label: '기본 (농가별 묶음)', render: () => cart() },
      { id: 'none-selected', label: '선택 없음', render: () => cart({ groups: unselected }) },
      {
        id: 'unavailable',
        label: '구매할 수 없는 상품 포함',
        render: () => cart({ groups: [...cartGroups, unavailableGroup] }),
      },
      {
        id: 'unavailable-selected',
        label: '구매 불가 상품 선택됨',
        render: () =>
          cart({
            groups: [
              ...cartGroups,
              {
                ...unavailableGroup,
                lines: unavailableGroup.lines.map((line) => ({ ...line, selected: true })),
              },
            ],
          }),
      },
      {
        id: 'merged',
        label: '중복 담기 안내',
        render: () => cart({ notice: '이미 담겨 있던 상품이라 수량을 더했어요' }),
      },
      { id: 'empty', label: '빈 장바구니', render: () => cart({ groups: [] }) },
      { id: 'loading', label: '로딩', render: () => cart({ status: 'pending' }) },
      { id: 'error', label: '불러오기 실패', render: () => cart({ status: 'error' }) },
      {
        id: 'removed',
        label: '삭제 토스트',
        toast: { message: '장바구니에서 뺐어요' },
        render: () => cart(),
      },
    ],
  },
]
