import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { server } from '@/mocks/server'
import { render } from '@/test/render'
import { orderSummaries } from '../fixtures'
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

describe('배송 조회·고객센터 문의 (연결 전)', () => {
  it('배송 조회는 가짜 배송 정보 대신 연결 전 안내와 주문 상세 링크를 보여 준다', async () => {
    renderAt('/orders/151/shipments/3')
    expect(await screen.findByRole('heading', { level: 1, name: '배송 조회' })).toBeInTheDocument()
    expect(screen.getByText('배송 조회는 아직 연결되지 않았어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '주문 상세로' })).toHaveAttribute('href', '/orders/151')
  })

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
