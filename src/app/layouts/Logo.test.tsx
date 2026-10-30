import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { render } from '@/test/render'
import { AdminLayoutView } from './AdminLayout'
import { AuthLayoutView } from './AuthLayout'
import { PublicLayoutView } from './PublicLayout'
import { SellerLayoutView } from './SellerLayout'

// 로고 적용 위치·preset은 design/BRAND.md ‘프론트 적용 위치’

const sealOf = (link: HTMLElement) => link.querySelector('img')?.getAttribute('src') ?? ''

function inRouter(ui: React.ReactElement) {
  render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('로고', () => {
  it('구매자 헤더: 워드마크가 링크 이름이고, 데스크톱은 네 글자 인장 · 모바일은 작은 인장', () => {
    inRouter(
      <PublicLayoutView session={{ status: 'guest' }} showMobileHeader>
        <p>본문</p>
      </PublicLayoutView>,
    )
    const [desktop, mobile] = screen.getAllByRole('link', { name: '팔도곳간' })
    expect(desktop).toHaveAttribute('href', '/')
    expect(sealOf(desktop as HTMLElement)).toMatch(/logo-seal\.svg/)
    expect(sealOf(mobile as HTMLElement)).toMatch(/logo-seal-small\.svg/)
    // 인장은 장식
    expect((desktop as HTMLElement).querySelector('img')).toHaveAttribute('alt', '')
  })

  it('로그인 화면: 카드 위 로고 링크는 홈으로', () => {
    inRouter(
      <AuthLayoutView>
        <p>본문</p>
      </AuthLayoutView>,
    )
    const link = screen.getByRole('link', { name: '팔도곳간' })
    expect(link).toHaveAttribute('href', '/')
    expect(sealOf(link)).toMatch(/logo-seal\.svg/)
  })

  it('판매자 센터: 상단 바는 밝은 작은 인장, 드로어는 로고 아래 상점명 · 이름', async () => {
    inRouter(
      <SellerLayoutView title="센터 홈" storeName="청송 햇살농원" userName="김영수">
        <p>본문</p>
      </SellerLayoutView>,
    )
    const top = screen.getByRole('link', { name: '팔도곳간' })
    expect(top).toHaveAttribute('href', '/seller')
    expect(sealOf(top)).toMatch(/logo-seal-small\.svg/)

    await userEvent.setup().click(screen.getByRole('button', { name: '메뉴 열기' }))
    const drawer = await screen.findByRole('dialog')
    expect(within(drawer).getByRole('link', { name: '팔도곳간' })).toHaveAttribute(
      'href',
      '/seller',
    )
    expect(within(drawer).getByText('청송 햇살농원 · 김영수')).toBeInTheDocument()
  })

  it('관리자 콘솔: 어두운 상단 바는 반전 인장, 드로어는 밝은 인장', async () => {
    inRouter(
      <AdminLayoutView title="판매자 심사" adminName="운영팀 정민호">
        <p>본문</p>
      </AdminLayoutView>,
    )
    const top = screen.getByRole('link', { name: '팔도곳간' })
    expect(top).toHaveAttribute('href', '/admin')
    expect(sealOf(top)).toMatch(/logo-seal-small-reverse\.svg/)

    await userEvent.setup().click(screen.getByRole('button', { name: '메뉴 열기' }))
    const drawer = await screen.findByRole('dialog')
    expect(sealOf(within(drawer).getByRole('link', { name: '팔도곳간' }))).toMatch(
      /logo-seal-small\.svg/,
    )
  })
})
