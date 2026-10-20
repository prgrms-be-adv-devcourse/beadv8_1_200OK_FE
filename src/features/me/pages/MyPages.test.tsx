import { screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { MyPage } from './MyPages'

// 마이페이지 예치금: GET /wallets/me/balance(기본 128,000 / 한도 500,000)

function renderMy() {
  const router = createMemoryRouter([{ path: '/me', Component: MyPage }], {
    initialEntries: ['/me'],
  })
  render(<RouterProvider router={router} />)
}

afterEach(() => clearAccessToken())

describe('MyPage', () => {
  it('서버 잔액과 남은 한도를 보여 준다', async () => {
    renderMy()
    expect(await screen.findByText('128,000')).toBeInTheDocument()
    expect(screen.getByText('지금 최대 372,000원까지 충전할 수 있어요')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /상품 준비 중/ })[0]).toHaveAttribute(
      'href',
      '/orders',
    )
  })

  it('잔액을 못 받으면 다시 시도를 보여 준다', async () => {
    server.use(
      http.get('*/api/v1/wallets/me/balance', () =>
        HttpResponse.json(
          { type: 'about:blank', title: 'Error', status: 500, detail: 'x', instance: '/x' },
          { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    )
    renderMy()
    expect(await screen.findByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })

  it('판매자 신청이 심사 중이면 판매자 카드가 신청 현황으로 안내한다', async () => {
    server.use(
      http.get('*/api/v1/sellers/me/applications', () =>
        HttpResponse.json({
          applications: [
            {
              applicationId: 1,
              status: 'IN_REVIEW',
              appliedAt: '2026-10-19T10:00:00',
              reviewStartedAt: '2026-10-20T09:00:00',
              approvedAt: null,
              rejectedAt: null,
              rejectReason: null,
            },
          ],
        }),
      ),
    )
    setAccessToken(fakeToken({ role: MemberRole.BUYER }))
    renderMy()
    expect(await screen.findByRole('link', { name: '신청 현황 보기' })).toHaveAttribute(
      'href',
      '/seller/apply/status',
    )
    expect(screen.getByText('판매자 심사 중')).toBeInTheDocument()
  })

  it('판매자 토큰이면 판매자 센터로 안내한다', async () => {
    setAccessToken(fakeToken({ role: MemberRole.SELLER }))
    renderMy()
    expect(await screen.findByRole('link', { name: '판매자 센터로 가기' })).toHaveAttribute(
      'href',
      '/seller',
    )
  })
})
