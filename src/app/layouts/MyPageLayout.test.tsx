import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router'
import { applications } from '@/features/sellerApply/fixtures'
import { server } from '@/mocks/server'
import { clearAccessToken, getAuthSession, setAccessToken } from '@/shared/api/authToken'
import { MemberRole } from '@/shared/api/types'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { MyPageLayout, MyPageLayoutView } from './MyPageLayout'

function renderLayout(path: string, sellerStatus: 'none' | 'applying' | 'approved' = 'none') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <MyPageLayoutView sellerStatus={sellerStatus} onLogout={() => {}}>
        <p>본문</p>
      </MyPageLayoutView>
    </MemoryRouter>,
  )
}

describe('MyPageLayout', () => {
  it('지금 화면 메뉴를 표시한다 (탭까지)', () => {
    renderLayout('/me/likes?tab=farms')
    const nav = screen.getByRole('navigation', { name: '마이페이지 메뉴' })
    expect(within(nav).getByRole('link', { name: '팔로우한 농가' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav).getByRole('link', { name: '관심 상품' })).not.toHaveAttribute('aria-current')
  })

  it('판매자 상태에 따라 메뉴 문구가 바뀐다', () => {
    renderLayout('/me', 'applying')
    expect(screen.getAllByRole('link', { name: '판매자 신청 현황' })[0]).toHaveAttribute(
      'href',
      '/seller/apply/status',
    )
  })

  it('마이 홈에서만 모바일 메뉴 목록을 둔다', () => {
    renderLayout('/me/wallet')
    expect(
      screen.queryByRole('navigation', { name: '마이페이지 메뉴 목록' }),
    ).not.toBeInTheDocument()
  })

  it('일반 회원이 심사 중인 신청이 있으면 ‘판매자 신청 현황’, 판매자면 ‘판매자 센터’', async () => {
    server.use(
      http.get('*/api/v1/sellers/me/applications', () =>
        HttpResponse.json({ applications: [applications[SellerApplicationStatus.IN_REVIEW]] }),
      ),
    )
    setAccessToken(fakeToken({ role: MemberRole.BUYER }))
    const routes = [
      { path: '/me', Component: MyPageLayout, children: [{ index: true, element: <p>마이</p> }] },
    ]
    const { unmount } = render(
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/me'] })} />,
    )
    expect(await screen.findAllByRole('link', { name: '판매자 신청 현황' })).not.toHaveLength(0)
    unmount()

    setAccessToken(fakeToken({ role: MemberRole.SELLER }))
    render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/me'] })} />)
    expect(screen.getAllByRole('link', { name: '판매자 센터' })[0]).toHaveAttribute(
      'href',
      '/seller',
    )
    clearAccessToken()
  })

  it('로그아웃하면 홈으로 가고 토큰을 지운다', async () => {
    setAccessToken(fakeToken({ role: MemberRole.BUYER }))
    const router = createMemoryRouter(
      [
        { path: '/', element: <h1>홈</h1> },
        { path: '/me', Component: MyPageLayout, children: [{ index: true, element: <p>마이</p> }] },
      ],
      { initialEntries: ['/me'] },
    )
    render(<RouterProvider router={router} />)

    await userEvent
      .setup()
      .click(screen.getAllByRole('button', { name: '로그아웃' })[0] as HTMLElement)

    expect(await screen.findByRole('heading', { name: '홈' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(getAuthSession()).toBeNull()
    clearAccessToken()
  })
})
