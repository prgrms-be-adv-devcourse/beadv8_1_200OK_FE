import { screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole, TermsType } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { walletTerms } from '../fixtures'
import { TermsPage } from './TermsPage'

// 약관 조회(GET /wallets/me/terms)는 로그인이 필요하다. 비회원은 본문 대신 로그인 안내

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: '/terms/:type', Component: TermsPage }], {
    initialEntries: [path],
  })
  render(<RouterProvider router={router} />)
}

afterEach(() => clearAccessToken())

describe('TermsPage', () => {
  it('비회원이면 약관 본문 대신 돌아올 주소를 담은 로그인 안내를 보여 준다', async () => {
    renderAt(`/terms/${TermsType.PREPAID_PAYMENT_INSTRUMENT}`)

    expect(await screen.findByText('로그인하면 약관을 볼 수 있어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute(
      'href',
      `/login?returnTo=${encodeURIComponent(`/terms/${TermsType.PREPAID_PAYMENT_INSTRUMENT}`)}`,
    )
    const sample = walletTerms.find((t) => t.type === TermsType.PREPAID_PAYMENT_INSTRUMENT)
    if (sample) expect(screen.queryByText(sample.content)).not.toBeInTheDocument()
  })

  it('로그인했으면 서버 약관을 보여 준다', async () => {
    setAccessToken(fakeToken({ role: MemberRole.BUYER }))
    renderAt(`/terms/${TermsType.ELECTRONIC_FINANCIAL_TRANSACTION}`)

    const sample = walletTerms.find((t) => t.type === TermsType.ELECTRONIC_FINANCIAL_TRANSACTION)
    expect(
      await screen.findByRole('heading', { level: 2, name: sample?.title }),
    ).toBeInTheDocument()
    expect(screen.queryByText('로그인하면 약관을 볼 수 있어요')).not.toBeInTheDocument()
  })
})
