import { screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { render } from '@/test/render'
import { MyPageLayoutView } from './MyPageLayout'

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
})
