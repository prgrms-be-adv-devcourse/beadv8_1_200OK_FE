import { notifications } from '@mantine/notifications'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { orderPaymentSequence } from '@/mocks/handlers/checkout'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { type Checkout, MemberRole, OrderStatus } from '@/shared/api/types'
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
// 기본 응답: 주문서 39,800원(checkout.ts), 견적 추가 운임 0(shipments.ts), 주문 생성 201 { orderId: 184 }, 잔액 128,000(wallet.ts), 주문 상세 184(orders.ts, 결제 완료)
// 주문 직후 결제 대기(PAYMENT_PENDING)에서 바뀌는 경우는 orderPaymentSequence로 덮고, 1초 간격 조회·10초/30초 대기는 가짜 시계로 넘긴다(#76).

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

function renderCheckout(initialEntry = '/checkout') {
  const router = createMemoryRouter(
    [
      { path: '/checkout', Component: CheckoutPage },
      { path: '/checkout/complete', Component: CheckoutCompletePage },
    ],
    { initialEntries: [initialEntry] },
  )
  const { unmount } = render(<RouterProvider router={router} />)
  // 가짜 시계를 쓰는 테스트에서도 입력이 멈추지 않게 시계를 같이 넘긴다
  const advanceTimers = (ms: number) => {
    if (vi.isFakeTimers()) vi.advanceTimersByTime(ms)
  }
  return { router, unmount, user: userEvent.setup({ advanceTimers }) }
}

type User = ReturnType<typeof userEvent.setup>

async function fillAndAgree(user: User) {
  await user.click(await screen.findByRole('button', { name: '배송지 입력' }))
  await user.type(await screen.findByLabelText('받는 분'), '이서연')
  await user.type(screen.getByLabelText('연락처'), '010-2468-1357')
  await user.click(screen.getByRole('button', { name: '우편번호 찾기' }))
  await user.type(screen.getByLabelText('상세주소'), '3층')
  await user.click(screen.getByRole('button', { name: '이번 주문에 적용' }))
  await user.click(screen.getByLabelText('[필수] 주문 정보를 판매자에게 제공하는 데 동의해요'))
}

async function pay(user: User, label: string) {
  const [button] = screen.getAllByRole('button', { name: label })
  if (!button) throw new Error('결제 버튼 없음')
  await user.click(button)
}

afterEach(() => {
  vi.useRealTimers()
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
      orderPaymentSequence([OrderStatus.PAID]).handler,
      http.post('*/api/v1/shipments/fee-quotes', async ({ request }) => {
        quoteBody = await request.json()
        return HttpResponse.json({
          ...remoteQuoteSample,
          regionGroup: 'GENERAL',
          sellers: remoteQuoteSample.sellers.map((s) => ({
            ...s,
            regionSurcharge: 0,
            shippingFee: 0,
          })),
          totalShippingFee: 0,
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
        addressDetail: '3층',
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

  it('견적에 실패하면 결제를 막고, 다시 불러오면 견적 금액으로 결제할 수 있다', async () => {
    let fail = true
    server.use(
      http.post('*/api/v1/shipments/fee-quotes', () =>
        fail ? problem(500, '서버 오류') : HttpResponse.json(remoteQuoteSample),
      ),
    )
    const { user } = renderCheckout()

    await fillAndAgree(user)
    expect(await screen.findByText('배송비를 불러오지 못했어요')).toBeInTheDocument()
    for (const button of screen.getAllByRole('button', { name: '결제하기' })) {
      expect(button).toBeDisabled()
    }
    fail = false
    await user.click(screen.getByRole('button', { name: '배송비 다시 불러오기' }))
    for (const button of await screen.findAllByRole('button', { name: '45,800원 결제하기' })) {
      expect(button).toBeEnabled()
    }
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
    const changed: Checkout = { ...checkoutSample, totalProductAmount: 41800 }
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

  it('주문에 Idempotency-Key를 보내고, 다시 결제할 때도 같은 키를 쓴다', async () => {
    const keys: (string | null)[] = []
    server.use(
      http.post('*/api/v1/orders', ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'))
        return keys.length === 1
          ? problem(409, '예치금 잔액이 부족합니다.')
          : HttpResponse.json({ orderId: SAMPLE_ORDER_ID }, { status: 201 })
      }),
    )
    const { user } = renderCheckout()

    await fillAndAgree(user)
    await pay(user, '39,800원 결제하기')
    await user.click(await screen.findByRole('button', { name: '다시 결제하기' }))

    expect(await screen.findByText(/주문번호 184/)).toBeInTheDocument()
    expect(keys).toHaveLength(2)
    expect(keys[0]).toMatch(/^[\w-]{1,64}$/)
    expect(keys[1]).toBe(keys[0])
  })

  it('주문서에 새로 들어오면 새 키를 쓴다', async () => {
    const keys: (string | null)[] = []
    server.use(
      http.post('*/api/v1/orders', ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'))
        return problem(409, '예치금 잔액이 부족합니다.')
      }),
    )
    const first = renderCheckout()
    await fillAndAgree(first.user)
    await pay(first.user, '39,800원 결제하기')
    await screen.findByText('결제하지 못했어요')
    first.unmount()

    const { user } = renderCheckout()
    await fillAndAgree(user)
    await pay(user, '39,800원 결제하기')
    await screen.findByText('결제하지 못했어요')

    expect(keys).toHaveLength(2)
    expect(keys[1]).not.toBe(keys[0])
  })

  it('같은 키의 처음 주문을 아직 처리 중이면(409) 잠시 뒤 다시 누르라고 해요체로 알린다', async () => {
    server.use(
      http.post('*/api/v1/orders', () =>
        problem(409, '같은 주문 요청을 처리하고 있습니다. 잠시 후 주문 내역을 확인해 주세요.'),
      ),
    )
    const { user } = renderCheckout()

    await fillAndAgree(user)
    await pay(user, '39,800원 결제하기')

    expect(await screen.findByText('결제하지 못했어요')).toBeInTheDocument()
    expect(screen.getByText(/앞서 보낸 주문을 아직 처리하고 있어요/)).toBeInTheDocument()
    expect(screen.queryByText(/처리하고 있습니다/)).not.toBeInTheDocument()
    expect(screen.queryByText('주문 금액이 바뀌었어요')).not.toBeInTheDocument()
  })

  it('배송 요청사항을 적으면 앞뒤 공백을 지워 보내고, 비우면 보내지 않는다', async () => {
    const bodies: Record<string, unknown>[] = []
    server.use(
      http.post('*/api/v1/orders', async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>)
        return problem(409, '예치금 잔액이 부족합니다.')
      }),
    )
    const { user } = renderCheckout()

    await fillAndAgree(user)
    await pay(user, '39,800원 결제하기')
    await screen.findByText('결제하지 못했어요')
    await user.type(screen.getByLabelText('배송 요청사항 (선택)'), '  문 앞에 놓아 주세요 ')
    await user.click(screen.getByRole('button', { name: '다시 결제하기' }))

    await waitFor(() => expect(bodies).toHaveLength(2))
    expect(bodies[0]).not.toHaveProperty('deliveryNote')
    expect(bodies[1]).toMatchObject({ deliveryNote: '문 앞에 놓아 주세요' })
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

  describe('기본 배송지', () => {
    const buyer = () => setAccessToken(fakeToken({ memberId: 2, role: MemberRole.BUYER }))
    const registered = http.get('*/api/v1/shipments/addresses/default', () =>
      HttpResponse.json({
        recipientName: '박영희',
        recipientPhone: '01099998888',
        postalCode: '06236',
        address: '서울시 강남구 테헤란로 1',
        addressDetail: '101동 202호',
        deliveryNote: null,
      }),
    )

    it('서버 기본 배송지(연락처 하이픈 붙임)로 배송지를 채워 바로 주문할 수 있다', async () => {
      buyer()
      const bodies: unknown[] = []
      server.use(
        registered,
        http.post('*/api/v1/orders', async ({ request }) => {
          bodies.push(await request.json())
          return HttpResponse.json({ orderId: SAMPLE_ORDER_ID }, { status: 201 })
        }),
      )
      const { user } = renderCheckout()
      expect(await screen.findByText('박영희')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '배송지 입력' })).not.toBeInTheDocument()
      await user.click(screen.getByLabelText('[필수] 주문 정보를 판매자에게 제공하는 데 동의해요'))
      await pay(user, '39,800원 결제하기')
      expect(await screen.findByText(/주문번호 184/)).toBeInTheDocument()
      expect(bodies).toEqual([
        {
          recipientName: '박영희',
          recipientPhone: '010-9999-8888',
          zipCode: '06236',
          address: '서울시 강남구 테헤란로 1',
          addressDetail: '101동 202호',
          thirdPartyProvisionAgreed: true,
          expectedTotalAmount: 39800,
        },
      ])
    })

    it('충전에 다녀온 초안이 있으면 기본 배송지보다 초안을 먼저 쓴다', async () => {
      buyer()
      const first = renderCheckout()
      await fillAndAgree(first.user)
      first.unmount()

      server.use(registered)
      renderCheckout()
      expect(await screen.findByText('이서연')).toBeInTheDocument()
      expect(screen.queryByText('박영희')).not.toBeInTheDocument()
    })

    it('기본 배송지가 없으면(204) 빈 배송지로 시작한다', async () => {
      buyer()
      renderCheckout()
      expect(await screen.findByRole('button', { name: '배송지 입력' })).toBeInTheDocument()
    })

    it('기본 배송지를 못 받아도 주문서는 막히지 않는다', async () => {
      buyer()
      server.use(http.get('*/api/v1/shipments/addresses/default', () => problem(500, '서버 오류')))
      renderCheckout()
      expect(await screen.findByRole('button', { name: '배송지 입력' })).toBeInTheDocument()
    })

    it('관리자는 기본 배송지를 부르지 않는다', async () => {
      setAccessToken(fakeToken({ memberId: 3, role: MemberRole.ADMIN }))
      let called = false
      server.use(
        http.get('*/api/v1/shipments/addresses/default', () => {
          called = true
          return new HttpResponse(null, { status: 204 })
        }),
      )
      renderCheckout()
      expect(await screen.findByRole('button', { name: '배송지 입력' })).toBeInTheDocument()
      expect(called).toBe(false)
    })
  })
})

describe('결제 확인 (#76: 주문은 결제 대기로 만들어지고 지갑 결제는 뒤에서 끝난다)', () => {
  const { PAYMENT_PENDING, PAID, PAYMENT_FAILED, CANCELED } = OrderStatus

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  /** 주문서·잔액 조회 횟수를 센다. 잔액은 결제를 확인한 뒤부터 결제 후 금액(88,200)을 준다 */
  function countLoads(paidAfter: () => boolean) {
    const loads = { checkout: 0, balance: 0 }
    server.use(
      http.get('*/api/v1/orders/checkout', () => {
        loads.checkout += 1
        return HttpResponse.json(checkoutSample)
      }),
      http.get('*/api/v1/wallets/me/balance', () => {
        loads.balance += 1
        return HttpResponse.json({ balance: paidAfter() ? 88200 : 128000, maxBalance: 500000 })
      }),
    )
    return loads
  }

  const tick = (ms = 1000) => act(() => vi.advanceTimersByTimeAsync(ms))

  describe('주문서', () => {
    it('결제 대기 동안은 결제 중으로 남고 주문서·잔액을 다시 받지 않다가, 결제 완료가 되면 완료 화면에서 결제 후 잔액을 보여 준다', async () => {
      const payment = orderPaymentSequence([PAYMENT_PENDING, PAYMENT_PENDING, PAID])
      server.use(payment.handler)
      const loads = countLoads(() => payment.calls() >= 3)
      const { router, user } = renderCheckout()

      await fillAndAgree(user)
      await pay(user, '39,800원 결제하기')
      await waitFor(() => expect(payment.calls()).toBe(1))
      await tick()
      expect(payment.calls()).toBe(2)

      expect(router.state.location.pathname).toBe('/checkout')
      expect(screen.getByText('결제를 확인하고 있어요')).toBeInTheDocument()
      expect(loads).toEqual({ checkout: 1, balance: 1 })

      await tick()
      expect(await screen.findByText('주문이 완료됐어요')).toBeInTheDocument()
      expect(router.state.location.search).toBe(`?orderId=${SAMPLE_ORDER_ID}`)
      expect(await screen.findByText('남은 예치금')).toBeInTheDocument()
      expect(screen.getByText('88,200')).toBeInTheDocument()
      expect(screen.queryByText('128,000')).not.toBeInTheDocument()
    })

    it.each([
      [PAYMENT_FAILED, '결제 실패'],
      [CANCELED, '주문 취소'],
    ])(
      '%s(%s)면 주문서에 남아 실패를 알리고, 주문서·잔액을 다시 받고, 다시 결제할 때 새 멱등키를 보낸다',
      async (status) => {
        const keys: (string | null)[] = []
        const nextOrderId = SAMPLE_ORDER_ID + 1
        server.use(
          orderPaymentSequence([PAYMENT_PENDING, status]).handler,
          orderPaymentSequence([PAID], nextOrderId).handler,
          http.post('*/api/v1/orders', ({ request }) => {
            keys.push(request.headers.get('Idempotency-Key'))
            const orderId = keys.length === 1 ? SAMPLE_ORDER_ID : nextOrderId
            return HttpResponse.json({ orderId }, { status: 201 })
          }),
        )
        const loads = countLoads(() => false)
        const { router, user } = renderCheckout()

        await fillAndAgree(user)
        await pay(user, '39,800원 결제하기')
        await tick()

        expect(await screen.findByText('결제하지 못했어요')).toBeInTheDocument()
        expect(screen.getByText(/예치금은 빠져나가지 않았어요/)).toBeInTheDocument()
        expect(router.state.location.pathname).toBe('/checkout')
        expect(screen.getByText('이서연')).toBeInTheDocument()
        expect(screen.getAllByText('청송 꿀사과 부사').length).toBeGreaterThan(0)
        await waitFor(() => expect(loads).toEqual({ checkout: 2, balance: 2 }))

        await user.click(screen.getByRole('button', { name: '다시 결제하기' }))
        expect(await screen.findByText('주문이 완료됐어요')).toBeInTheDocument()
        expect(router.state.location.search).toBe(`?orderId=${nextOrderId}`)
        expect(keys).toHaveLength(2)
        expect(keys[1]).not.toBe(keys[0])
      },
    )

    it('10초가 지나도 결제 대기면 완료 화면으로 넘기고, 완료 화면이 결제 확인 중으로 이어 간다', async () => {
      const payment = orderPaymentSequence([PAYMENT_PENDING])
      server.use(payment.handler)
      const { router, user } = renderCheckout()

      await fillAndAgree(user)
      await pay(user, '39,800원 결제하기')
      await tick(9000)
      expect(router.state.location.pathname).toBe('/checkout')

      await tick(1000)
      expect(await screen.findByText('결제 확인 중이에요')).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/checkout/complete')
      expect(screen.queryByText('남은 예치금')).not.toBeInTheDocument()
    })
  })

  describe('완료 화면', () => {
    it('결제 대기면 결제 확인 중으로 두고 잔액 줄을 숨기다가, 결제 완료가 되면 잔액을 보여 준다', async () => {
      const payment = orderPaymentSequence([PAYMENT_PENDING, PAID])
      server.use(payment.handler)
      const loads = countLoads(() => payment.calls() >= 2)
      renderCheckout(`/checkout/complete?orderId=${SAMPLE_ORDER_ID}`)

      expect(await screen.findByText('결제 확인 중이에요')).toBeInTheDocument()
      expect(await screen.findByText('주문 금액')).toBeInTheDocument()
      expect(screen.queryByText('남은 예치금')).not.toBeInTheDocument()
      expect(loads.balance).toBe(0)

      await tick()
      expect(await screen.findByText('주문이 완료됐어요')).toBeInTheDocument()
      expect(await screen.findByText('남은 예치금')).toBeInTheDocument()
      expect(screen.getByText('88,200')).toBeInTheDocument()
    })

    it('30초가 지나도 결제 대기면 조회를 멈추고 주문 내역에서 확인하게 한다', async () => {
      const payment = orderPaymentSequence([PAYMENT_PENDING])
      server.use(payment.handler)
      renderCheckout(`/checkout/complete?orderId=${SAMPLE_ORDER_ID}`)

      expect(await screen.findByText('결제 확인 중이에요')).toBeInTheDocument()
      await tick(30_000)

      expect(await screen.findByText('결제 확인이 늦어지고 있어요')).toBeInTheDocument()
      expect(screen.getByText('주문 내역에서 결제 결과를 확인해 주세요.')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: '주문 내역 보기' })).toHaveAttribute(
        'href',
        '/orders',
      )
      expect(screen.queryByText('남은 예치금')).not.toBeInTheDocument()

      const calls = payment.calls()
      await tick(5000)
      expect(payment.calls()).toBe(calls)
    })

    it.each([PAYMENT_FAILED, CANCELED])(
      '%s면 결제하지 못했다고 알리고 장바구니로 보낸다',
      async (status) => {
        server.use(orderPaymentSequence([status]).handler)
        renderCheckout(`/checkout/complete?orderId=${SAMPLE_ORDER_ID}`)

        expect(await screen.findByText('결제하지 못했어요')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: '장바구니로' })).toHaveAttribute('href', '/cart')
        expect(screen.queryByText('남은 예치금')).not.toBeInTheDocument()
        expect(screen.queryByText('결제 금액')).not.toBeInTheDocument()
      },
    )
  })
})
