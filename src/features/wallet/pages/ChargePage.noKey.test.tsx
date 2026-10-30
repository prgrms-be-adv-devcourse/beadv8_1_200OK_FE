import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { walletTerms } from '../fixtures'
import { ChargePage } from './ChargePage'

// VITE_PG_CLIENT_KEY가 비어 있으면 충전을 막고 이유를 보여 준다(충전 요청도 보내지 않는다). env mock 때문에 파일을 따로 둔다

vi.mock('@/shared/lib/env', () => ({ apiBaseUrl: '', pgClientKey: '' }))
vi.mock('../toss', () => ({
  openTossCardPayment: vi.fn(),
  tossCustomerKey: (id: number) => `paldo-member-${id}`,
  tossErrorOf: () => ({ code: 'UNKNOWN', message: '' }),
}))

beforeEach(() => setAccessToken(fakeToken({ memberId: 2, role: MemberRole.BUYER })))
afterEach(() => clearAccessToken())

describe('ChargePage (결제 키 없음)', () => {
  it('충전 버튼을 막고 이유를 보여 주며 충전 요청을 보내지 않는다', async () => {
    let requested = false
    server.use(
      http.get('*/api/v1/wallets/me/terms', () =>
        Response.json({ terms: walletTerms.map((item) => ({ ...item, agreed: true })) }),
      ),
      http.post('*/api/v1/wallets/me/charges', () => {
        requested = true
        return Response.json({ chargeNo: 'x', amount: 0 }, { status: 201 })
      }),
    )
    const router = createMemoryRouter([{ path: '/wallet/charge', Component: ChargePage }], {
      initialEntries: ['/wallet/charge'],
    })
    render(<RouterProvider router={router} />)
    const user = userEvent.setup()

    const button = await screen.findByRole('button', { name: '충전하기' })
    expect(button).toBeDisabled()
    expect(
      screen.getByText('결제 서비스를 준비하고 있어요. 지금은 충전할 수 없어요'),
    ).toBeInTheDocument()
    await user.click(button)
    expect(requested).toBe(false)
  })
})
