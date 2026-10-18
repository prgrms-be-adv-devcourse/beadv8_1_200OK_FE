import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { render } from '@/test/render'
import { cartGroups, unavailableGroup } from '../fixtures'
import { CartView, type CartViewProps } from './CartView'

function renderCart(props: Partial<CartViewProps> = {}) {
  const handlers = {
    onQuantityChange: vi.fn(),
    onToggleSelect: vi.fn(),
    onToggleAll: vi.fn(),
    onRemove: vi.fn(),
    onRemoveSelected: vi.fn(),
    onRemoveUnavailable: vi.fn(),
    onOrder: vi.fn(),
  }
  render(
    <MemoryRouter>
      <CartView status="success" groups={cartGroups} {...handlers} {...props} />
    </MemoryRouter>,
  )
  return { ...handlers, user: userEvent.setup() }
}

describe('CartView', () => {
  it('선택한 상품 금액을 보여 주고 주문한다', async () => {
    const { user, onOrder } = renderCart()

    expect(screen.getAllByText('39,800').length).toBeGreaterThan(0)
    const [order] = screen.getAllByRole('button', { name: '2개 주문하기' })
    if (!order) throw new Error('주문 버튼 없음')
    await user.click(order)
    expect(onOrder).toHaveBeenCalled()
  })

  it('선택이 없으면 주문을 막고 이유를 보여 준다', () => {
    renderCart({
      groups: cartGroups.map((g) => ({
        ...g,
        lines: g.lines.map((l) => ({ ...l, selected: false })),
      })),
    })

    for (const button of screen.getAllByRole('button', { name: '주문하기' })) {
      expect(button).toBeDisabled()
    }
    expect(screen.getAllByText('주문할 상품을 골라 주세요').length).toBeGreaterThan(0)
  })

  it('구매할 수 없는 상품을 한 번에 뺄 수 있다', async () => {
    const { user, onRemoveUnavailable } = renderCart({ groups: [...cartGroups, unavailableGroup] })

    expect(screen.getByText('일시 품절이라 지금은 구매할 수 없어요')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '구매할 수 없는 상품 빼기' }))
    expect(onRemoveUnavailable).toHaveBeenCalled()
  })

  it('전체 선택을 알린다', async () => {
    const { user, onToggleAll } = renderCart()
    await user.click(screen.getByLabelText('전체 선택 (2/2)'))
    expect(onToggleAll).toHaveBeenCalledWith(false)
  })
})
