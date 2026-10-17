import { screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { render } from '@/test/render'
import { appRoutes } from './routes'

// SCREENS.md의 라우트가 모두 화면(지금은 빈 페이지)으로 이어지는지. 세션이 'unknown'이라 가드는 통과한다.

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: '/', children: appRoutes }], {
    initialEntries: [path],
  })
  render(<RouterProvider router={router} />)
  return router
}

const screens: [path: string, title: string][] = [
  ['/', '홈'],
  ['/products?category=FRUIT', '상품 목록'],
  ['/products/7', '상품 상세'],
  ['/farms/3', '판매자 상점'],
  ['/terms/PREPAID_PAYMENT_INSTRUMENT', '약관'],
  ['/login?returnTo=%2Fcart', '로그인'],
  ['/signup', '회원가입'],
  ['/find-account', '아이디·비밀번호 찾기'],
  ['/cart', '장바구니'],
  ['/checkout', '주문서'],
  ['/checkout/complete?orderId=1', '주문 완료'],
  ['/wallet/charge', '예치금 충전'],
  ['/orders', '주문 내역'],
  ['/orders/1', '주문 상세'],
  ['/orders/1/shipments/2', '배송 조회'],
  ['/orders/1/inquiry', '고객센터 문의'],
  ['/reviews/new?orderItemId=1', '리뷰 쓰기'],
  ['/reviews/5/edit', '리뷰 수정'],
  ['/me', '마이페이지'],
  ['/me/wallet', '지갑 이용 내역'],
  ['/me/likes?tab=farms', '관심'],
  ['/me/account?tab=address', '계정 관리'],
  ['/seller/apply', '판매자 신청'],
  ['/seller/apply/status', '신청 현황'],
  ['/seller', '센터 홈'],
  ['/seller/products?status=ON_SALE', '상품 관리'],
  ['/seller/products/new', '상품 등록'],
  ['/seller/products/7/edit', '상품 수정'],
  ['/seller/orders', '주문·출고'],
  ['/seller/claims', '취소 요청'],
  ['/seller/payouts', '정산 내역'],
  ['/seller/payouts/9', '정산 상세'],
  ['/seller/wallet', '지갑·출금'],
  ['/seller/profile', '상점 프로필'],
  ['/admin/sellers?status=APPLIED', '판매자 심사'],
  ['/admin/sellers/4', '판매자 심사 상세'],
  ['/admin/payouts', '정산 관리'],
]

describe('라우트 뼈대', () => {
  it.each(screens)('%s → %s', async (path, title) => {
    renderAt(path)
    expect(
      (await screen.findAllByRole('heading', { level: 1, name: title })).length,
    ).toBeGreaterThan(0)
  })

  it('/admin은 판매자 심사로 보낸다', async () => {
    const router = renderAt('/admin')
    await screen.findAllByRole('heading', { level: 1, name: '판매자 심사' })
    expect(router.state.location.pathname).toBe('/admin/sellers')
  })

  it('없는 주소는 404', async () => {
    renderAt('/no-such-page')
    expect(await screen.findByText('찾으시는 페이지가 없어요')).toBeInTheDocument()
  })
})
