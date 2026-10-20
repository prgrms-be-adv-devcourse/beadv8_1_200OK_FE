import { screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { SellerLayout } from '@/app/layouts/SellerLayout'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { cancelClaims, sellerOrders } from '../fixtures'
import { SellerClaimsPage, SellerOrdersPage } from './SellerWorkPages'

// 주문·출고 · 취소 요청 처리: 판매자 주문 목록·클레임 API가 없어 화면 전체가 연결 전이다(샘플 데이터를 그리지 않는다).
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
  it('제목은 두고 본문은 연결 전 안내만 보여 준다', async () => {
    renderSeller('/seller/orders')
    expect(await screen.findByText('아직 연결되지 않은 화면이에요')).toBeInTheDocument()
    expect(screen.getAllByText('주문·출고 관리')).not.toHaveLength(0)
    expect(screen.getByText(/필요한 API: 📝 판매자 주문 목록/)).toBeInTheDocument()
    for (const order of sellerOrders) {
      expect(screen.queryByText(order.orderNumber, { exact: false })).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: '송장 등록' })).not.toBeInTheDocument()
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
