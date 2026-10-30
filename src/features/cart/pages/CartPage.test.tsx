import { notifications } from '@mantine/notifications'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { mockCart } from '@/mocks/handlers/cart'
import { server } from '@/mocks/server'
import type { Cart } from '@/shared/api/types'
import { render } from '@/test/render'
import { rememberOptionProduct } from '../optionProducts'
import { CartPage } from './CartPage'

// 장바구니는 옵션 ID만 주므로 이 브라우저에서 담을 때 적어 둔 옵션 → 상품 표로 상품 상세(products MSW)를 붙인다.
// 기본 장바구니(mocks/handlers/cart.ts): 사과 2kg(1012, 상품 101) · 고구마 3kg(1021, 상품 102), 각 1개 선택됨

const problem = (status: number, detail: string) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail, instance: '/api/v1/cart' },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

/** 응답을 테스트가 정할 때까지 붙잡아 두는 문 */
function gate() {
  let open = () => {}
  const opened = new Promise<void>((resolve) => {
    open = resolve
  })
  return { open, opened }
}

function renderCart() {
  const router = createMemoryRouter(
    [
      { path: '/cart', Component: CartPage },
      { path: '/checkout', element: <h1>주문서 화면</h1> },
    ],
    { initialEntries: ['/cart'] },
  )
  render(<RouterProvider router={router} />)
  return { router, user: userEvent.setup() }
}

beforeEach(() => {
  rememberOptionProduct(1012, 101)
  rememberOptionProduct(1021, 102)
})
afterEach(() => {
  localStorage.clear()
  notifications.clean()
})

describe('CartPage', () => {
  it('옵션별 상품 상세로 이름·가격을 붙이고, 상품을 모르는 옵션은 구매할 수 없다고 알린다', async () => {
    const cart: Cart = {
      ...mockCart,
      items: [
        ...mockCart.items,
        { cartItemId: 9, productOptionId: 7777, quantity: 1, selected: false },
      ],
    }
    server.use(http.get('*/api/v1/cart', () => HttpResponse.json(cart)))
    renderCart()

    expect(await screen.findByRole('link', { name: '청송 꿀사과 부사' })).toHaveAttribute(
      'href',
      '/products/101',
    )
    expect(screen.getByRole('link', { name: '해남 꿀고구마 베니하루카' })).toBeInTheDocument()
    expect(screen.getByText('상품 정보를 찾을 수 없어요')).toBeInTheDocument()
    expect(screen.getByText('빼고 상품 페이지에서 다시 담아 주세요')).toBeInTheDocument()
    // 선택한 사과 23,900 + 고구마 15,900
    expect(screen.getAllByText('39,800').length).toBeGreaterThan(0)
  })

  it('수량 변경은 바로 보이고, 실패하면 되돌린 뒤 서버 문구를 알린다', async () => {
    const response = gate()
    const sent: unknown[] = []
    server.use(
      http.patch('*/api/v1/cart/items/:cartItemId', async ({ request }) => {
        sent.push(await request.json())
        await response.opened
        return problem(409, '재고가 부족합니다.')
      }),
    )
    const { user } = renderCart()

    const stepper = await screen.findByRole('group', {
      name: '청송 꿀사과 부사 2kg (11~13과) 수량',
    })
    await user.click(within(stepper).getByRole('button', { name: '수량 늘리기' }))

    expect(within(stepper).getByRole('status')).toHaveTextContent('2')
    await waitFor(() => expect(sent).toEqual([{ quantity: 2 }]))

    response.open()
    expect(await screen.findByText('재고가 부족합니다.')).toBeInTheDocument()
    expect(within(stepper).getByRole('status')).toHaveTextContent('1')
  })

  it('주문하기는 보내는 중인 선택 변경이 끝난 뒤 주문서로 간다', async () => {
    const response = gate()
    const sent: unknown[] = []
    server.use(
      http.patch('*/api/v1/cart/items/:cartItemId/selection', async ({ request, params }) => {
        sent.push({ cartItemId: params.cartItemId, ...((await request.json()) as object) })
        await response.opened
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { router, user } = renderCart()

    await user.click(
      await screen.findByRole('checkbox', { name: '해남 꿀고구마 베니하루카 3kg 한입 크기 선택' }),
    )
    const [order] = screen.getAllByRole('button', { name: '1개 주문하기' })
    if (!order) throw new Error('주문 버튼 없음')
    await user.click(order)

    expect(sent).toEqual([{ cartItemId: '2', selected: false }])
    expect(router.state.location.pathname).toBe('/cart')
    response.open()
    await waitFor(() => expect(router.state.location.pathname).toBe('/checkout'))
  })

  it('장바구니를 못 불러오면 서버 문구와 다시 시도를 보여 준다', async () => {
    let fail = true
    server.use(
      http.get('*/api/v1/cart', () =>
        fail ? problem(500, '일시적인 오류가 발생했습니다.') : HttpResponse.json(mockCart),
      ),
    )
    const { user } = renderCart()

    expect(await screen.findByText('일시적인 오류가 발생했습니다.')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByRole('link', { name: '청송 꿀사과 부사' })).toBeInTheDocument()
  })

  it('선택 삭제를 보내고 알린다', async () => {
    let deleted = false
    server.use(
      http.delete('*/api/v1/cart/items/selected', () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderCart()

    await user.click(await screen.findByRole('button', { name: '선택 삭제' }))
    expect(await screen.findByText('선택한 상품을 뺐어요')).toBeInTheDocument()
    expect(deleted).toBe(true)
  })
})
