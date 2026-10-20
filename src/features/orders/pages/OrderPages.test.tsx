import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { server } from '@/mocks/server'
import { render } from '@/test/render'
import { orderDetails, orderSummaries, shipmentDetails } from '../fixtures'
import { OrderDetailPage } from './OrderDetailPage'
import { OrderListPage } from './OrderListPage'
import { ShipmentPage } from './ShipmentPage'
import { SupportPage } from './SupportPage'

// 주문 목록·상세 라우트. 기본 응답(mocks/handlers/orders.ts): 목록 5건(10건씩), 상세는 fixtures, 없는 주문 404

const problem = (status: number, detail: string) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail, instance: '/api/v1/orders' },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/orders', Component: OrderListPage },
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
