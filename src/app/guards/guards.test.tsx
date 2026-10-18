import { screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { MemberRole } from '@/shared/api/types'
import { safeReturnTo } from '@/shared/lib/returnTo'
import { render } from '@/test/render'
import type { Session } from '../session'
import { GuestOnly, RequireAdmin, RequireAuth, RequireSeller } from './guards'

let session: Session = { status: 'unknown' }
vi.mock('../session', () => ({ useSession: () => session }))

function show(text: string) {
  return () => <p>{text}</p>
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/login', Component: show('로그인 화면') },
      { path: '/seller/apply', Component: show('판매자 신청') },
      { path: '/', Component: show('홈') },
      { Component: RequireAuth, children: [{ path: '/cart', Component: show('장바구니') }] },
      { Component: RequireSeller, children: [{ path: '/seller', Component: show('센터 홈') }] },
      { Component: RequireAdmin, children: [{ path: '/admin', Component: show('관리자') }] },
      { Component: GuestOnly, children: [{ path: '/signup', Component: show('가입') }] },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return router
}

const buyer: Session = { status: 'authenticated', role: MemberRole.BUYER }

describe('가드', () => {
  it('세션을 모르면(API 연결 전) 모두 통과시킨다', () => {
    session = { status: 'unknown' }
    renderAt('/seller')
    expect(screen.getByText('센터 홈')).toBeInTheDocument()
  })

  it('RequireAuth: 비회원은 지금 경로를 returnTo로 붙여 로그인으로', () => {
    session = { status: 'guest' }
    const router = renderAt('/cart?from=detail')
    expect(screen.getByText('로그인 화면')).toBeInTheDocument()
    expect(router.state.location.search).toBe(
      `?returnTo=${encodeURIComponent('/cart?from=detail')}`,
    )
  })

  it('RequireSeller: 구매자는 판매자 신청으로', () => {
    session = buyer
    renderAt('/seller')
    expect(screen.getByText('판매자 신청')).toBeInTheDocument()
  })

  it('RequireAdmin: 관리자가 아니면 권한 제한 화면', () => {
    session = buyer
    renderAt('/admin')
    expect(screen.getByText('관리자만 볼 수 있는 화면이에요')).toBeInTheDocument()
  })

  it('GuestOnly: 로그인 상태면 returnTo로 보낸다', () => {
    session = buyer
    renderAt('/signup?returnTo=%2Fcart')
    expect(screen.getByText('장바구니')).toBeInTheDocument()
  })
})

describe('safeReturnTo', () => {
  it('같은 사이트 경로만 허용한다', () => {
    expect(safeReturnTo('/orders/1')).toBe('/orders/1')
    expect(safeReturnTo('//evil.com')).toBe('/')
    expect(safeReturnTo('https://evil.com')).toBe('/')
    expect(safeReturnTo(null)).toBe('/')
  })
})
