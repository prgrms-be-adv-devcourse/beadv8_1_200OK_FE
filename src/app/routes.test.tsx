import { screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { render } from '@/test/render'
import { appRoutes } from './routes'

// SCREENS.md의 라우트가 모두 화면으로 이어지는지(만든 화면은 그 제목, 나머지는 빈 페이지 제목).
// 가드 동작은 guards.test에서 본다. 여기서는 세션을 'unknown'으로 두어 가드를 통과시킨다.
vi.mock('./session', () => ({ useSession: () => ({ status: 'unknown' }) }))

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: '/', children: appRoutes }], {
    initialEntries: [path],
  })
  render(<RouterProvider router={router} />)
  return router
}

const screens: [path: string, title: string][] = [
  ['/', '이번 주 산지에서 막 수확했어요'],
  ['/products?category=FRUIT', '과일'],
  ['/products/101', '청송 꿀사과 부사'],
  ['/farms/7', '청송 햇살농원'],
  ['/terms/PREPAID_PAYMENT_INSTRUMENT', '약관 보기'],
  ['/login?returnTo=%2Fcart', '로그인'],
  ['/signup', '회원가입'],
  ['/find-account', '아이디·비밀번호 찾기'],
  ['/find-account/reset?token=abc', '새 비밀번호 정하기'],
  ['/cart', '장바구니'],
  ['/checkout', '주문서'],
  ['/checkout/complete?orderId=1', '주문이 완료됐어요'],
  [
    '/wallet/charge/success?orderId=CHG-TEST-1&paymentKey=pk_1&amount=20000',
    '20,000원을 충전했어요',
  ],
  ['/wallet/charge/fail', '충전하지 못했어요'],
  ['/wallet/charge', '예치금 충전'],
  ['/orders', '주문 내역'],
  ['/orders/184', '주문 상세'],
  ['/orders/151/shipments/3', '배송 조회'],
  ['/orders/1/inquiry', '고객센터 문의'],
  ['/reviews/new?orderId=27&orderItemId=271', '리뷰 쓰기'],
  ['/reviews/5003/edit', '리뷰 수정'],
  ['/me', '마이페이지'],
  ['/me/likes?tab=products', '관심 상품'],
  ['/me/wallet', '지갑 이용 내역'],
  ['/me/likes?tab=farms', '팔로우한 농가'],
  ['/me/account?tab=address', '계정 관리'],
  ['/seller/apply', '판매자 등록 신청'],
  ['/seller/apply/status', '판매자 신청 현황'],
  ['/seller', '센터 홈'],
  ['/seller/products?status=ON_SALE', '상품 관리'],
  ['/seller/products/new', '상품 등록'],
  ['/seller/products/7/edit', '상품 수정'],
  ['/seller/orders', '주문·출고 관리'],
  ['/seller/claims', '취소 요청 처리'],
  ['/seller/payouts', '정산 내역'],
  ['/seller/payouts/1021', '정산 내역'], // 상세는 목록 위 모달
  ['/seller/wallet', '지갑·출금'],
  ['/seller/profile', '상점 프로필'],
  ['/admin/sellers?status=PENDING', '판매자 심사'],
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
