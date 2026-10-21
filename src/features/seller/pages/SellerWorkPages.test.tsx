import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { SellerLayout } from '@/app/layouts/SellerLayout'
import { pageOf, problem } from '@/mocks/handlers/_shared'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { cancelClaims, sellerShipments } from '../fixtures'
import { SellerClaimsPage, SellerOrdersPage } from './SellerWorkPages'

// 주문·출고(출고 목록·송장·배송지 변경 승인·거절은 MSW로 연결) · 취소 요청 처리(클레임 API가 없어 화면 전체가 연결 전, 샘플 데이터를 그리지 않는다).
// 모바일 제목 줄은 판매자 레이아웃이 그리므로 레이아웃 안에서 렌더한다.

function renderSeller(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/seller',
        Component: SellerLayout,
        children: [
          { path: 'orders', Component: SellerOrdersPage, handle: { title: '주문·출고 관리' } },
          { path: 'claims', Component: SellerClaimsPage, handle: { title: '취소 요청 처리' } },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
}

beforeEach(() => setAccessToken(fakeToken({ memberId: 7, role: MemberRole.SELLER })))
afterEach(() => clearAccessToken())

describe('SellerOrdersPage', () => {
  it('내 출고 목록을 그리고 출고 전 배송에만 송장 등록을 둔다', async () => {
    renderSeller('/seller/orders')
    const list = await screen.findByRole('list', { name: '주문 목록' })
    expect(within(list).getAllByText(/청송 꿀사과 부사/).length).toBe(sellerShipments.length)
    expect(within(list).getAllByRole('button', { name: /송장 등록$/ })).toHaveLength(3)
    expect(within(list).getByText('도착 지연')).toBeInTheDocument()
    expect(within(list).getByText(/684219371180/)).toBeInTheDocument()
    expect(
      screen.getByText(/출고 지연 알리기와 판매자 취소는 아직 연결되지 않았어요/),
    ).toBeInTheDocument()
  })

  it('송장을 등록하면 택배사 코드와 숫자만 보내고 목록을 다시 받는다', async () => {
    let body: unknown
    let listCalls = 0
    server.use(
      http.get('*/api/v1/seller/shipments', ({ request }) => {
        listCalls += 1
        return HttpResponse.json(pageOf(sellerShipments, new URL(request.url).searchParams, 25))
      }),
      http.post('*/api/v1/seller/shipments/:shipmentId/dispatch', async ({ params, request }) => {
        body = { shipmentId: params.shipmentId, ...((await request.json()) as object) }
        return HttpResponse.json({ ok: true })
      }),
    )
    const user = userEvent.setup()
    renderSeller('/seller/orders')
    const list = await screen.findByRole('list', { name: '주문 목록' })
    await user.click(within(list).getByRole('button', { name: '주문 184 송장 등록' }))
    const dialog = await screen.findByRole('dialog', { name: '송장 등록' })
    await user.type(within(dialog).getByLabelText('송장번호'), '6842 1937 5520')
    await user.click(within(dialog).getByRole('button', { name: '송장 등록' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(body).toEqual({
      shipmentId: '1',
      carrier: 'CJ_LOGISTICS',
      trackingNumber: '684219375520',
    })
    expect(listCalls).toBeGreaterThan(1)
  })

  it('서버가 송장을 거절하면(409) 모달을 열어 둔 채 서버 문구를 보여 준다', async () => {
    server.use(
      http.post('*/api/v1/seller/shipments/:shipmentId/dispatch', () =>
        problem(409, '이미 사용된 송장번호입니다.'),
      ),
    )
    const user = userEvent.setup()
    renderSeller('/seller/orders')
    const list = await screen.findByRole('list', { name: '주문 목록' })
    await user.click(within(list).getByRole('button', { name: '주문 184 송장 등록' }))
    const dialog = await screen.findByRole('dialog', { name: '송장 등록' })
    await user.type(within(dialog).getByLabelText('송장번호'), '1234567890')
    await user.click(within(dialog).getByRole('button', { name: '송장 등록' }))

    expect(await within(dialog).findByText('이미 사용된 송장번호입니다.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: '송장 등록' })).toBeInTheDocument()
  })

  it('배송지 변경 요청은 상세에서 요청 주소를 받아 보여 주고 승인한다', async () => {
    let patched: unknown
    server.use(
      http.patch(
        '*/api/v1/seller/shipments/:shipmentId/address-change-requests/:requestId',
        async ({ params, request }) => {
          patched = {
            shipmentId: params.shipmentId,
            requestId: params.requestId,
            ...((await request.json()) as object),
          }
          return HttpResponse.json({ ok: true })
        },
      ),
    )
    const user = userEvent.setup()
    renderSeller('/seller/orders')
    const list = await screen.findByRole('list', { name: '주문 목록' })
    await user.click(within(list).getByRole('button', { name: '주문 178 배송지 변경 요청 확인' }))
    const dialog = await screen.findByRole('dialog', { name: '배송지 변경 요청' })
    expect(await within(dialog).findByText(/제주특별자치도 제주시 첨단로 242/)).toBeInTheDocument()
    expect(within(dialog).getByText(/추가 운임 3,000원/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '승인' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(patched).toEqual({ shipmentId: '2', requestId: '9', decision: 'APPROVE' })
  })

  it('이미 처리된 변경 요청(409)이면 서버 문구를 보여 준다', async () => {
    server.use(
      http.patch('*/api/v1/seller/shipments/:shipmentId/address-change-requests/:requestId', () =>
        problem(409, '이미 처리된 배송지 변경 요청입니다.'),
      ),
    )
    const user = userEvent.setup()
    renderSeller('/seller/orders')
    const list = await screen.findByRole('list', { name: '주문 목록' })
    await user.click(within(list).getByRole('button', { name: '주문 178 배송지 변경 요청 확인' }))
    const dialog = await screen.findByRole('dialog', { name: '배송지 변경 요청' })
    await user.click(await within(dialog).findByRole('button', { name: '거절' }))
    expect(
      await within(dialog).findByText('이미 처리된 배송지 변경 요청입니다.'),
    ).toBeInTheDocument()
  })

  it('쪽이 여러 개면 ?page로 다음 쪽을 받는다', async () => {
    const pages: string[] = []
    server.use(
      http.get('*/api/v1/seller/shipments', ({ request }) => {
        const page = new URL(request.url).searchParams.get('page') ?? '0'
        pages.push(page)
        return HttpResponse.json({
          content: sellerShipments.slice(0, 1),
          page: Number(page),
          size: 25,
          totalElements: 40,
          totalPages: 2,
        })
      }),
    )
    const user = userEvent.setup()
    renderSeller('/seller/orders')
    await screen.findByRole('list', { name: '주문 목록' })
    await user.click(screen.getByRole('button', { name: '다음 쪽' }))
    await waitFor(() => expect(pages).toContain('1'))
  })

  it('목록을 못 받으면 다시 시도할 수 있다', async () => {
    let fail = true
    server.use(
      http.get('*/api/v1/seller/shipments', () =>
        fail
          ? problem(500, '잠시 문제가 생겼어요')
          : HttpResponse.json(pageOf(sellerShipments, new URLSearchParams(), 25)),
      ),
    )
    const user = userEvent.setup()
    renderSeller('/seller/orders')
    const retry = await screen.findByRole('button', { name: '다시 시도' })
    fail = false
    await user.click(retry)
    expect(await screen.findByRole('list', { name: '주문 목록' })).toBeInTheDocument()
  })
})

describe('SellerClaimsPage', () => {
  it('제목은 두고 본문은 연결 전 안내만 보여 준다', async () => {
    renderSeller('/seller/claims')
    expect(await screen.findByText('아직 연결되지 않은 화면이에요')).toBeInTheDocument()
    expect(screen.getAllByText('취소 요청 처리')).not.toHaveLength(0)
    expect(screen.getByText(/필요한 API: 📝 판매자 취소 요청 목록/)).toBeInTheDocument()
    for (const claim of cancelClaims) {
      expect(screen.queryByText(claim.orderNumber, { exact: false })).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: /승인/ })).not.toBeInTheDocument()
  })
})
