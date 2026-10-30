import { screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { AdminLayout } from './AdminLayout'

// 관리자 메뉴의 심사 대기 배지는 GET /admin/seller-applications?status=PENDING&size=1 (MSW admin 핸들러: 3건)

beforeEach(() => setAccessToken(fakeToken({ memberId: 1, role: MemberRole.ADMIN })))
afterEach(() => clearAccessToken())

describe('AdminLayout', () => {
  it('판매자 심사 메뉴에 심사 대기 수를 배지로 보여 준다', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/admin',
          Component: AdminLayout,
          children: [
            { path: 'payouts', element: <p>정산 본문</p>, handle: { title: '정산 관리' } },
          ],
        },
      ],
      { initialEntries: ['/admin/payouts'] },
    )
    render(<RouterProvider router={router} />)

    const nav = screen.getAllByRole('navigation', { name: '관리자 메뉴' })[0] as HTMLElement
    const sellers = within(nav).getByRole('link', { name: /판매자 심사/ })
    expect(await within(sellers).findByText('3')).toBeInTheDocument()
    expect(within(sellers).getByText('건')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: '정산 관리' })).toBeInTheDocument()
  })
})
