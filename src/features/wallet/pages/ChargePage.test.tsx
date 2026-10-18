import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { server } from '@/mocks/server'
import { render } from '@/test/render'
import { walletTerms } from '../fixtures'
import { ChargePage } from './ChargePage'

// 첫 충전 약관: GET /wallets/me/terms(모두 동의 전) → 동의 시트 → POST .../agreements → 충전 진행.
// 충전 요청 API는 아직 없어(📝) 동의가 끝나면 결제창 진행 화면만 확인한다.

const problem = (status: number, detail: string) =>
  HttpResponse.json(
    {
      type: 'about:blank',
      title: 'Error',
      status,
      detail,
      instance: '/api/v1/wallets/me/terms/agreements',
    },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

function renderCharge() {
  const router = createMemoryRouter([{ path: '/wallet/charge', Component: ChargePage }], {
    initialEntries: ['/wallet/charge'],
  })
  render(<RouterProvider router={router} />)
  return { user: userEvent.setup() }
}

async function agreeAll(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: '+5만' }))
  await user.click(await screen.findByRole('button', { name: '50,000원 충전하기' }))
  await user.click(await screen.findByLabelText('전체 동의'))
  await user.click(screen.getByRole('button', { name: '동의하고 충전하기' }))
}

describe('ChargePage 약관', () => {
  it('받은 약관 type·version으로 동의한 뒤 충전을 이어 간다', async () => {
    const bodies: unknown[] = []
    server.use(
      http.post('*/api/v1/wallets/me/terms/agreements', async ({ request }) => {
        bodies.push(await request.json())
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderCharge()

    await agreeAll(user)

    expect(
      await screen.findByText('토스페이먼츠 결제창에서 50,000원 결제를 진행해 주세요'),
    ).toBeInTheDocument()
    // 시트에는 동의 안 한 약관만 있지만, 서버는 필수 약관 전체를 받아야 해서 이미 동의한 것도 보낸다
    const sent = (bodies[0] as { agreements: { type: string }[] }).agreements
    expect(sent.map((item) => item.type).sort()).toEqual(
      walletTerms.map((item) => item.type).sort(),
    )
  })

  it('약관이 바뀌었으면(409) 서버 문구를 보여 주고 바뀐 약관을 다시 받는다', async () => {
    let loads = 0
    server.use(
      http.get('*/api/v1/wallets/me/terms', () => {
        loads += 1
        return HttpResponse.json({
          terms: walletTerms.map((item) => ({ ...item, version: loads })),
        })
      }),
      http.post('*/api/v1/wallets/me/terms/agreements', () =>
        problem(409, '약관이 변경되었습니다. 최신 약관을 확인해 주세요.'),
      ),
    )
    const { user } = renderCharge()

    await agreeAll(user)

    expect(
      await screen.findByText('약관이 변경되었습니다. 최신 약관을 확인해 주세요.'),
    ).toBeInTheDocument()
    expect(loads).toBe(2)
    expect(screen.queryByText(/결제를 진행해 주세요/)).not.toBeInTheDocument()
  })
})
