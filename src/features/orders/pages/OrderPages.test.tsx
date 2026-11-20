import { notifications } from '@mantine/notifications'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { pageOf } from '@/mocks/handlers/_shared'
import { server } from '@/mocks/server'
import { render } from '@/test/render'
import { myRefunds, orderDetails, orderSummaries, shipmentDetails } from '../fixtures'
import { OrderDetailPage } from './OrderDetailPage'
import { OrderListPage } from './OrderListPage'
import { RefundListPage } from './RefundListPage'
import { ShipmentPage } from './ShipmentPage'
import { SupportPage } from './SupportPage'

// 주문 목록·상세 라우트. 기본 응답(mocks/handlers/orders.ts): 목록 5건(10건씩), 상세는 fixtures, 없는 주문 404

const problem = (status: number, detail: string) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail, instance: '/api/v1/orders' },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

// 토스트는 한 번에 몇 개까지만 보이고 나머지는 줄을 선다. 앞 테스트의 토스트가 뒤 테스트의 토스트를 가리지 않게 비운다
afterEach(() => notifications.clean())

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/orders', Component: OrderListPage },
      { path: '/orders/refunds', Component: RefundListPage },
      { path: '/orders/:orderId', Component: OrderDetailPage },
      { path: '/orders/:orderId/shipments/:shipmentId', Component: ShipmentPage },
      { path: '/orders/:orderId/inquiry', Component: SupportPage },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return { router, user: userEvent.setup() }
}

describe('OrderListPage', () => {
  it('주문을 최신순으로 보여 주고 더 보기로 다음 페이지를 이어 받는다', async () => {
    const [first] = orderSummaries
    if (!first) throw new Error('fixtures: 주문 없음')
    const many = Array.from({ length: 12 }, (_, i) => ({
      ...first,
      orderId: 1000 + i,
      representativeProductName: `상품 ${i}`,
      itemCount: 1,
    }))
    const pages: string[] = []
    server.use(
      http.get('*/api/v1/orders', ({ request }) => {
        const params = new URL(request.url).searchParams
        pages.push(`${params.get('page')}/${params.get('size')}`)
        const page = Number(params.get('page'))
        return HttpResponse.json({
          content: many.slice(page * 10, page * 10 + 10),
          page,
          size: 10,
          totalElements: many.length,
          totalPages: 2,
        })
      }),
    )
    const { user } = renderAt('/orders')

    expect(await screen.findByText('상품 0')).toBeInTheDocument()
    expect(screen.queryByText('상품 10')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '주문 더 보기' }))
    expect(await screen.findByText('상품 11')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '주문 더 보기' })).not.toBeInTheDocument()
    expect(pages).toEqual(['0/10', '1/10'])
  })

  it('대표 상품명과 종류 수·주문 상태·금액을 한 줄로 보여 준다', async () => {
    renderAt('/orders')
    expect(await screen.findByText('청송 꿀사과 부사 외 1건')).toBeInTheDocument()
    expect(screen.getAllByText('결제 완료').length).toBeGreaterThan(0)
    expect(screen.getByText('주문 취소')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '주문번호 184 주문 상세' })).toHaveAttribute(
      'href',
      '/orders/184',
    )
  })

  it('불러오기에 실패하면 서버 문구와 다시 시도를 보여 준다', async () => {
    let fail = true
    server.use(
      http.get('*/api/v1/orders', () =>
        fail
          ? problem(500, '주문 목록을 불러오지 못했습니다.')
          : HttpResponse.json({
              content: orderSummaries,
              page: 0,
              size: 10,
              totalElements: 5,
              totalPages: 1,
            }),
      ),
    )
    const { user } = renderAt('/orders')

    expect(await screen.findByText('주문 목록을 불러오지 못했습니다.')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText('청송 꿀사과 부사 외 1건')).toBeInTheDocument()
  })

  it('주문이 없으면 장보러 가기로 안내한다', async () => {
    server.use(
      http.get('*/api/v1/orders', () =>
        HttpResponse.json({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 }),
      ),
    )
    renderAt('/orders')
    expect(await screen.findByText('아직 주문한 상품이 없어요')).toBeInTheDocument()
  })
})

describe('OrderDetailPage', () => {
  it('주문 상세를 그린다', async () => {
    renderAt('/orders/184')
    expect(await screen.findByText(/주문번호 184/)).toBeInTheDocument()
    expect(screen.getByText('청송 꿀사과 부사')).toBeInTheDocument()
  })

  it('결제 전에 무산된 주문(CANCELED)은 주문과 상품 모두 주문 취소로 보여 준다', async () => {
    renderAt('/orders/140')
    expect(await screen.findByText('평창 고랭지 알배기배추')).toBeInTheDocument()
    expect(screen.getAllByText('주문 취소')).toHaveLength(2)
    expect(screen.queryByText('환불 완료')).not.toBeInTheDocument()
  })

  it('없는 주문(404)이나 잘못된 번호는 찾을 수 없다고 알린다', async () => {
    renderAt('/orders/999999')
    expect(await screen.findByText('주문을 찾을 수 없어요')).toBeInTheDocument()
  })

  it('숫자가 아닌 번호는 요청하지 않고 찾을 수 없다고 알린다', async () => {
    let called = false
    server.use(
      http.get('*/api/v1/orders/:orderId', () => {
        called = true
        return problem(400, 'bad')
      }),
    )
    renderAt('/orders/abc')
    expect(await screen.findByText('주문을 찾을 수 없어요')).toBeInTheDocument()
    expect(called).toBe(false)
  })
})

describe('OrderDetailPage 배송·구매확정', () => {
  it('이 주문의 배송을 찾아 배송 조회 링크를 보여 준다', async () => {
    renderAt('/orders/151')
    const link = await screen.findByRole('link', { name: '배송 중 배송 조회' })
    expect(link).toHaveAttribute('href', '/orders/151/shipments/3')
  })

  it('배송 목록을 못 받아도 주문 상세는 그대로 그린다', async () => {
    server.use(http.get('*/api/v1/shipments', () => problem(500, '서버 오류')))
    renderAt('/orders/151')
    expect(await screen.findByText(/주문번호 151/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /배송 조회/ })).not.toBeInTheDocument()
  })

  it('배송 완료 상품은 확인 창에서 구매확정하고 주문 상세를 다시 받는다', async () => {
    let confirmed: string[] = []
    let detailCalls = 0
    server.use(
      http.get('*/api/v1/orders/93', () => {
        detailCalls += 1
        return HttpResponse.json(orderDetails.find((o) => o.orderId === 93))
      }),
      http.post('*/api/v1/orders/:orderId/items/:orderItemId/confirm', ({ params }) => {
        confirmed = [String(params.orderId), String(params.orderItemId)]
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderAt('/orders/93')
    await user.click(await screen.findByRole('button', { name: /구매확정$/ }))
    const dialog = await screen.findByRole('dialog', { name: '구매확정할까요?' })
    await user.click(within(dialog).getByRole('button', { name: '구매확정' }))

    expect((await screen.findAllByText('구매확정했어요')).length).toBeGreaterThan(0)
    expect(confirmed).toEqual(['93', '931'])
    await waitFor(() => expect(detailCalls).toBeGreaterThan(1))
  })

  it('구매확정이 거절되면(409) 서버 문구를 알린다', async () => {
    server.use(
      http.post('*/api/v1/orders/:orderId/items/:orderItemId/confirm', () =>
        problem(409, '배송 완료된 상품만 구매확정할 수 있습니다.'),
      ),
    )
    const { user } = renderAt('/orders/93')
    await user.click(await screen.findByRole('button', { name: /구매확정$/ }))
    const dialog = await screen.findByRole('dialog', { name: '구매확정할까요?' })
    await user.click(within(dialog).getByRole('button', { name: '구매확정' }))
    expect(
      await screen.findByText('배송 완료된 상품만 구매확정할 수 있습니다.'),
    ).toBeInTheDocument()
  })
})

describe('OrderDetailPage 취소 요청', () => {
  it('출고 전 상품을 개수·사유와 함께 요청하고 요청 목록을 다시 받는다', async () => {
    let body: unknown
    let listCalls = 0
    server.use(
      http.get('*/api/v1/refunds', ({ request }) => {
        listCalls += 1
        return HttpResponse.json(pageOf(myRefunds, new URL(request.url).searchParams, 25))
      }),
      http.post('*/api/v1/refunds', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(myRefunds[0], { status: 201 })
      }),
    )
    const { user } = renderAt('/orders/184')
    await user.click(await screen.findByRole('button', { name: '청송 꿀사과 부사 취소 요청' }))
    const dialog = await screen.findByRole('dialog', { name: '취소를 요청할까요?' })
    await user.type(within(dialog).getByLabelText(/취소 사유/), '옵션을 잘못 골랐어요')
    await user.click(within(dialog).getByRole('button', { name: '취소 요청' }))

    expect(
      (await screen.findAllByText('취소를 요청했어요. 판매자가 승인하면 환불돼요')).length,
    ).toBeGreaterThan(0)
    expect(body).toEqual({
      orderId: 184,
      orderItemId: 1841,
      quantity: 1,
      cancelReason: '옵션을 잘못 골랐어요',
    })
    await waitFor(() => expect(listCalls).toBeGreaterThan(1))
  })

  it('사유를 비우면 cancelReason을 보내지 않는다', async () => {
    let body: unknown
    server.use(
      http.post('*/api/v1/refunds', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(myRefunds[0], { status: 201 })
      }),
    )
    const { user } = renderAt('/orders/184')
    await user.click(await screen.findByRole('button', { name: '청송 꿀사과 부사 취소 요청' }))
    const dialog = await screen.findByRole('dialog', { name: '취소를 요청할까요?' })
    await user.click(within(dialog).getByRole('button', { name: '취소 요청' }))
    await waitFor(() => expect(body).toEqual({ orderId: 184, orderItemId: 1841, quantity: 1 }))
  })

  it('주문 시각보다 먼저 한 요청이 나오면 다음 쪽을 받지 않는다', async () => {
    const pages: string[] = []
    const older = { ...myRefunds[3], orderId: 1, requestedAt: '2026-10-01T00:00:00' }
    server.use(
      http.get('*/api/v1/refunds', ({ request }) => {
        const page = new URL(request.url).searchParams.get('page') ?? '0'
        pages.push(page)
        return HttpResponse.json({
          content: [...myRefunds.slice(0, 2), older],
          page: Number(page),
          size: 25,
          totalElements: 80,
          totalPages: 4,
        })
      }),
    )
    renderAt('/orders/184')
    expect(await screen.findByText('취소 승인 대기 중')).toBeInTheDocument()
    expect(pages).toEqual(['0'])
  })
})

describe('RefundListPage', () => {
  it('내 취소 요청을 상태와 함께 보여 주고, 승인 대기 요청만 철회할 수 있다', async () => {
    let withdrawn = ''
    server.use(
      http.post('*/api/v1/refunds/:refundId/withdraw', ({ params }) => {
        withdrawn = String(params.refundId)
        return HttpResponse.json({ ...myRefunds[0], status: 'WITHDRAWN' })
      }),
    )
    const { user } = renderAt('/orders/refunds')
    expect(await screen.findByText('평창 고랭지 알배기배추')).toBeInTheDocument()
    expect(screen.getByText('이미 포장을 마쳐 오늘 출고했어요')).toBeInTheDocument()
    const failed = screen.getByRole('article', { name: '성주 참외 꿀참외' })
    expect(within(failed).getByText('취소 실패')).toBeInTheDocument()
    expect(within(failed).getByText(/환불 처리에 실패해 취소를 되돌렸습니다/)).toBeInTheDocument()
    expect(within(failed).getByText(/주문은 그대로 유지돼요/)).toBeInTheDocument()
    const withdrawButtons = screen.getAllByRole('button', { name: /취소 요청 철회$/ })
    expect(withdrawButtons).toHaveLength(1)
    await user.click(withdrawButtons[0] as HTMLElement)
    expect((await screen.findAllByText('취소 요청을 철회했어요')).length).toBeGreaterThan(0)
    expect(withdrawn).toBe('41')
  })

  it('이미 처리된 요청을 철회하면(409) 서버 문구를 알린다', async () => {
    server.use(
      http.post('*/api/v1/refunds/:refundId/withdraw', () =>
        problem(409, '요청됨 상태의 환불만 처리할 수 있습니다.'),
      ),
    )
    const { user } = renderAt('/orders/refunds')
    await user.click(await screen.findByRole('button', { name: /취소 요청 철회$/ }))
    expect(
      (await screen.findAllByText('요청됨 상태의 환불만 처리할 수 있습니다.')).length,
    ).toBeGreaterThan(0)
  })
})

describe('ShipmentPage', () => {
  it('배송 상태·송장·배송지를 그린다', async () => {
    renderAt('/orders/151/shipments/3')
    expect(await screen.findByText('상품이 배송 중이에요')).toBeInTheDocument()
    expect(screen.getByText('CJ대한통운')).toBeInTheDocument()
    expect(screen.getByText('684219375520')).toBeInTheDocument()
    expect(screen.getByText(/서울 중구 세종대로 110/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '주문 상세로' })).toHaveAttribute('href', '/orders/151')
    expect(screen.queryByRole('button', { name: /구매확정$/ })).not.toBeInTheDocument()
  })

  it('배송 완료 상품은 여기서도 구매확정할 수 있다', async () => {
    let confirmed: string[] = []
    server.use(
      http.post('*/api/v1/orders/:orderId/items/:orderItemId/confirm', ({ params }) => {
        confirmed = [String(params.orderId), String(params.orderItemId)]
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderAt('/orders/93/shipments/4')
    await user.click(await screen.findByRole('button', { name: /구매확정$/ }))
    const dialog = await screen.findByRole('dialog', { name: '구매확정할까요?' })
    await user.click(within(dialog).getByRole('button', { name: '구매확정' }))
    expect((await screen.findAllByText('구매확정했어요')).length).toBeGreaterThan(0)
    expect(confirmed).toEqual(['93', '1511'])
  })

  it('없는 배송(404)과 숫자가 아닌 번호는 찾을 수 없다고 알린다', async () => {
    renderAt('/orders/151/shipments/999')
    expect(await screen.findByText('배송 정보를 찾을 수 없어요')).toBeInTheDocument()
  })

  it('숫자가 아닌 번호는 요청하지 않는다', async () => {
    let called = false
    server.use(
      http.get('*/api/v1/shipments/:shipmentId', () => {
        called = true
        return problem(400, 'bad')
      }),
    )
    renderAt('/orders/151/shipments/abc')
    expect(await screen.findByText('배송 정보를 찾을 수 없어요')).toBeInTheDocument()
    expect(called).toBe(false)
  })

  it('불러오기에 실패하면 다시 시도할 수 있다', async () => {
    let fail = true
    server.use(
      http.get('*/api/v1/shipments/3', () =>
        fail ? problem(500, '잠시 문제가 생겼어요') : HttpResponse.json(shipmentDetails[0]),
      ),
    )
    const { user } = renderAt('/orders/151/shipments/3')
    expect(await screen.findByText('잠시 문제가 생겼어요')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText('상품이 배송 중이에요')).toBeInTheDocument()
  })
})

describe('고객센터 문의 (연결 전)', () => {
  it('고객센터 문의는 폼 대신 연결 전 안내를 보여 준다', async () => {
    renderAt('/orders/93/inquiry')
    expect(
      await screen.findByRole('heading', { level: 1, name: '고객센터 문의' }),
    ).toBeInTheDocument()
    expect(screen.getByText('고객센터 문의는 아직 연결되지 않았어요')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '주문 상세로' })).toHaveAttribute('href', '/orders/93')
  })
})
