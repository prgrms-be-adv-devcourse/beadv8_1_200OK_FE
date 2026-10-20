import { notifications } from '@mantine/notifications'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { type Checkout, MemberRole } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import {
  CHECKOUT_DRAFT_STORAGE_KEY,
  clearCheckoutDraft,
  useCheckoutDraftStore,
} from '../draftStore'
import { checkoutSample, remoteQuoteSample, SAMPLE_ORDER_ID } from '../fixtures'
import { CheckoutCompletePage } from './CheckoutCompletePage'
import { CheckoutPage } from './CheckoutPage'

// 주문서 → 배송비 견적 → 주문 생성 → 주문 완료.
// 기본 응답: 주문서 39,800원(checkout.ts), 견적 추가 운임 0(shipments.ts), 주문 생성 201 { orderId: 184 }, 잔액 128,000(wallet.ts), 주문 상세 184(orders.ts)

const openPostcode = vi.hoisted(() =>
  vi.fn(async (onPick: (picked: { zipCode: string; address: string }) => void) =>
    onPick({ zipCode: '04524', address: '서울 중구 세종대로 110' }),
  ),
)
vi.mock('@/shared/lib/daumPostcode', () => ({ openPostcode }))

const problem = (status: number, detail: string) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail, instance: '/api/v1/orders' },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

function renderCheckout() {
  const router = createMemoryRouter(
    [
      { path: '/checkout', Component: CheckoutPage },
      { path: '/checkout/complete', Component: CheckoutCompletePage },
    ],
    { initialEntries: ['/checkout'] },
  )
  const { unmount } = render(<RouterProvider router={router} />)
  return { router, unmount, user: userEvent.setup() }
}

type User = ReturnType<typeof userEvent.setup>

async function fillAndAgree(user: User) {
  await user.click(await screen.findByRole('button', { name: '배송지 입력' }))
  await user.type(await screen.findByLabelText('받는 분'), '이서연')
  await user.type(screen.getByLabelText('연락처'), '010-2468-1357')
  await user.click(screen.getByRole('button', { name: '우편번호 찾기' }))
  await user.click(screen.getByRole('button', { name: '이번 주문에 적용' }))
  await user.click(screen.getByLabelText('[필수] 주문 정보를 판매자에게 제공하는 데 동의해요'))
}

async function pay(user: User, label: string) {
  const [button] = screen.getAllByRole('button', { name: label })
  if (!button) throw new Error('결제 버튼 없음')
  await user.click(button)
}

afterEach(() => {
  notifications.clean()
  clearAccessToken()
  clearCheckoutDraft()
  sessionStorage.clear()
})

describe('CheckoutPage', () => {
  it('배송지를 넣으면 견적을 받고, 결제하면 주문을 만들어 주문 완료에서 주문 상세·잔액을 보여 준다', async () => {
    const bodies: unknown[] = []
    let quoteBody: unknown
    server.use(
      http.post('*/api/v1/shipments/fee-quotes', async ({ request }) => {
        quoteBody = await request.json()
        return HttpResponse.json({
          ...remoteQuoteSample,
          regionGroup: 'GENERAL',
          sellers: remoteQuoteSample.sellers.map((s) => ({ ...s, regionSurcharge: 0 })),
        })
      }),
      http.post('*/api/v1/orders', async ({ request }) => {
        bodies.push(await request.json())
        return HttpResponse.json({ orderId: SAMPLE_ORDER_ID }, { status: 201 })
      }),
      http.get('*/api/v1/wallets/me/balance', () =>
        HttpResponse.json({ balance: 88200, maxBalance: 500000 }),
      ),
    )
    const { router, user } = renderCheckout()

    expect((await screen.findAllByText('88,200')).length).toBeGreaterThan(0)
    await fillAndAgree(user)
    await waitFor(() =>
      expect(quoteBody).toEqual({
        postalCode: '04524',
        sellers: [
          { sellerId: 7, itemAmount: 23900 },
          { sellerId: 8, itemAmount: 15900 },
        ],
      }),
    )
    expect((await screen.findAllByText('10월 27일~10월 28일(수)')).length).toBe(2)
    await pay(user, '39,800원 결제하기')

    expect(await screen.findByText(/주문번호 184/)).toBeInTheDocument()
    expect(router.state.location.search).toBe(`?orderId=${SAMPLE_ORDER_ID}`)
    expect(bodies).toEqual([
      {
        recipientName: '이서연',
        recipientPhone: '010-2468-1357',
        zipCode: '04524',
        address: '서울 중구 세종대로 110',
        thirdPartyProvisionAgreed: true,
        expectedTotalAmount: 39800,
      },
    ])
    expect(await screen.findByText('청송 꿀사과 부사 2kg (11~13과) × 1')).toBeInTheDocument()
    expect(screen.getByText('결제 금액')).toBeInTheDocument()
    expect(screen.getByText('남은 예치금')).toBeInTheDocument()
  })

  it('도서산간이면 추가 운임을 더한 금액으로 주문한다', async () => {
    const bodies: unknown[] = []
    server.use(
      http.post('*/api/v1/shipments/fee-quotes', () => HttpResponse.json(remoteQuoteSample)),
      http.post('*/api/v1/orders', async ({ request }) => {
        bodies.push(await request.json())
        return HttpResponse.json({ orderId: SAMPLE_ORDER_ID }, { status: 201 })
      }),
    )
    const { user } = renderCheckout()

    await fillAndAgree(user)
    await pay(user, '45,800원 결제하기')

    expect(await screen.findByText(/주문번호 184/)).toBeInTheDocument()
    expect(bodies[0]).toMatchObject({ expectedTotalAmount: 45800 })
  })

  it('잔액이 부족하면 부족한 만큼 충전하러 보낸다', async () => {
    server.use(
      http.get('*/api/v1/wallets/me/balance', () =>
        HttpResponse.json({ balance: 32000, maxBalance: 500000 }),
      ),
    )
    const { user } = renderCheckout()
    await fillAndAgree(user)
    expect(await screen.findByRole('link', { name: '예치금 충전하기' })).toHaveAttribute(
      'href',
      `/wallet/charge?shortfall=7800&returnTo=${encodeURIComponent('/checkout')}`,
    )
  })

  it('금액이 바뀌면(409) 주문서를 다시 불러와 바뀐 금액을 알리고, 입력한 배송지는 그대로 둔다', async () => {
    const changed: Checkout = { ...checkoutSample, totalProductAmount: 41800, totalAmount: 41800 }
    let loads = 0
    server.use(
      http.get('*/api/v1/orders/checkout', () => {
        loads += 1
        return HttpResponse.json(loads === 1 ? checkoutSample : changed)
      }),
      http.post('*/api/v1/orders', () =>
        problem(409, '주문 금액이 변경되었습니다. 주문서를 다시 확인해 주세요.'),
      ),
    )
    const { user } = renderCheckout()

    await fillAndAgree(user)
    await pay(user, '39,800원 결제하기')

    expect(await screen.findByText('주문 금액이 바뀌었어요')).toBeInTheDocument()
    expect(screen.getByText(/39,800원 → 41,800원/)).toBeInTheDocument()
    expect(loads).toBe(2)
    expect(screen.getByText('이서연')).toBeInTheDocument()
    for (const button of screen.getAllByRole('button', { name: '41,800원 결제하기' })) {
      expect(button).toBeEnabled()
    }
  })

  it('잔액 부족 같은 다른 실패는 서버 문구로 알리고 다시 결제할 수 있다', async () => {
    let fail = true
    server.use(
      http.post('*/api/v1/orders', () =>
        fail
          ? problem(409, '예치금 잔액이 부족합니다.')
          : HttpResponse.json({ orderId: SAMPLE_ORDER_ID }, { status: 201 }),
      ),
    )
    const { user } = renderCheckout()

    await fillAndAgree(user)
    await pay(user, '39,800원 결제하기')

    expect(await screen.findByText('결제하지 못했어요')).toBeInTheDocument()
    expect(screen.getByText('예치금 잔액이 부족합니다.')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: '다시 결제하기' }))
    await waitFor(() => expect(screen.getByText(/주문번호 184/)).toBeInTheDocument())
  })

  it('충전에 다녀와도(다시 그려도) 적어 둔 배송지를 채우고, 주문하면 초안을 지운다', async () => {
    setAccessToken(fakeToken({ memberId: 2, role: MemberRole.BUYER }))
    const first = renderCheckout()
    await fillAndAgree(first.user)
    first.unmount()

    // PG 충전 뒤 주문서로 돌아온 상황: 동의는 다시 받고 배송지는 그대로
    const { user } = renderCheckout()
    expect(await screen.findByText('이서연')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '배송지 입력' })).not.toBeInTheDocument()
    expect(
      screen.getByLabelText('[필수] 주문 정보를 판매자에게 제공하는 데 동의해요'),
    ).not.toBeChecked()

    await user.click(screen.getByLabelText('[필수] 주문 정보를 판매자에게 제공하는 데 동의해요'))
    await pay(user, '39,800원 결제하기')
    expect(await screen.findByText(/주문번호 184/)).toBeInTheDocument()
    expect(useCheckoutDraftStore.getState().draft).toBeNull()
    expect(sessionStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY)).not.toContain('이서연')
  })
})
