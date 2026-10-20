import { screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { SellerLayout } from '@/app/layouts/SellerLayout'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { SellerWalletPage } from './SellerMoneyPages'
import { SellerHomePage } from './SellerPages'

// 센터 홈 + 판매자 레이아웃: 상호(GET /sellers/me/profile) · 잔액(GET /wallets/sellers/me/balance) · 상품 현황(GET /sellers/me/products)

const problem = (status: number, detail: string) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

function renderSeller(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/seller',
        Component: SellerLayout,
        handle: { title: '센터 홈' },
        children: [
          { index: true, Component: SellerHomePage },
          { path: 'wallet', Component: SellerWalletPage },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
}

beforeEach(() => setAccessToken(fakeToken({ memberId: 7, role: MemberRole.SELLER })))
afterEach(() => clearAccessToken())

describe('SellerHomePage · SellerLayout', () => {
  it('상호·지갑 잔액·상품 현황을 API로 채운다', async () => {
    renderSeller('/seller')
    expect(await screen.findAllByText('청송 햇살농원')).not.toHaveLength(0)
    const wallet = await screen.findByRole('region', { name: '판매자 지갑 잔액' })
    expect(wallet).toHaveTextContent('1,086,420')
    const products = screen.getByRole('region', { name: '상품' })
    expect(products).toHaveTextContent('판매 중2개')
    expect(products).toHaveTextContent('판매 준비1개')
    expect(products).toHaveTextContent('재고 5개 이하 상품1개')
  })

  it('프로필을 아직 등록하지 않았으면(404) 입력 안내를 띄운다', async () => {
    server.use(
      http.get('*/api/v1/sellers/me/profile', () => problem(404, '프로필을 찾을 수 없습니다.')),
    )
    renderSeller('/seller')
    expect(await screen.findByText('상점 프로필을 입력해 주세요')).toBeInTheDocument()
  })

  it('잔액 조회가 실패하면 서버 detail과 다시 시도를 보여 준다', async () => {
    server.use(
      http.get('*/api/v1/wallets/sellers/me/balance', () => problem(403, '판매자가 아닙니다.')),
    )
    renderSeller('/seller')
    expect(await screen.findByText('판매자가 아닙니다.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })
})

describe('SellerWalletPage', () => {
  it('잔액만 API로 받고, 출금 신청은 이유를 보여 주며 닫아 둔다', async () => {
    renderSeller('/seller/wallet')
    const summary = await screen.findByRole('region', { name: '지갑 요약' })
    expect(summary).toHaveTextContent('1,086,420')
    expect(summary).toHaveTextContent('계좌 등록 기능은 준비 중이에요')
    const request = screen.getByRole('button', { name: '출금 신청' })
    expect(request).toBeDisabled()
    expect(request).toHaveAccessibleDescription('출금 신청은 아직 열리지 않았어요')
    expect(screen.queryByRole('button', { name: '계좌 변경 요청' })).not.toBeInTheDocument()
    expect(screen.getByText('아직 출금한 내역이 없어요')).toBeInTheDocument()
  })
})
