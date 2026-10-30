import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { server } from '@/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import { MemberRole } from '@/shared/api/types'
import { render } from '@/test/render'
import { fakeToken } from '@/test/token'
import { SAMPLE_CHARGE_NO, walletTerms } from '../fixtures'
import { ChargePage } from './ChargePage'

// 충전 흐름: 잔액(GET /wallets/me/balance) → 약관 동의(첫 충전) → POST /wallets/me/charges → 토스 결제창(이 모듈은 mock).
// 기본 응답(mocks/handlers/wallet.ts): 잔액 128,000 / 한도 500,000, 약관 모두 동의 전, 충전 번호 CHG-TEST-1

const toss = vi.hoisted(() => ({
  openTossCardPayment: vi.fn<(params: unknown) => Promise<void>>(),
}))
vi.mock('../toss', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../toss')>()),
  openTossCardPayment: toss.openTossCardPayment,
}))
vi.mock('@/shared/lib/env', () => ({ apiBaseUrl: '', pgClientKey: 'test_ck_key' }))

const problem = (status: number, detail: string) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail, instance: '/api/v1/wallets/me' },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

function renderCharge(path = '/wallet/charge') {
  const router = createMemoryRouter([{ path: '/wallet/charge', Component: ChargePage }], {
    initialEntries: [path],
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

beforeEach(() => {
  setAccessToken(fakeToken({ memberId: 2, role: MemberRole.BUYER }))
  toss.openTossCardPayment.mockReset()
  toss.openTossCardPayment.mockResolvedValue(undefined)
})

afterEach(() => clearAccessToken())

describe('ChargePage', () => {
  it('서버 잔액·한도로 그린다', async () => {
    renderCharge()
    expect((await screen.findAllByText('128,000')).length).toBeGreaterThan(0)
    expect(
      screen.getByText('지금 최대 372,000원까지 충전할 수 있어요 · 보유 한도 500,000원'),
    ).toBeInTheDocument()
  })

  it('받은 약관 type·version으로 동의한 뒤 충전 번호를 받아 토스 결제창을 연다', async () => {
    const bodies: unknown[] = []
    let chargeBody: unknown
    server.use(
      http.post('*/api/v1/wallets/me/terms/agreements', async ({ request }) => {
        bodies.push(await request.json())
        return new HttpResponse(null, { status: 204 })
      }),
      http.post('*/api/v1/wallets/me/charges', async ({ request }) => {
        chargeBody = await request.json()
        return HttpResponse.json({ chargeNo: SAMPLE_CHARGE_NO, amount: 50000 }, { status: 201 })
      }),
    )
    const { user } = renderCharge('/wallet/charge?returnTo=%2Fcheckout')

    await agreeAll(user)

    expect(
      await screen.findByText('토스페이먼츠 결제창에서 50,000원 결제를 진행해 주세요'),
    ).toBeInTheDocument()
    // 시트에는 동의 안 한 약관만 있지만, 서버는 필수 약관 전체를 받아야 해서 이미 동의한 것도 보낸다
    const sent = (bodies[0] as { agreements: { type: string }[] }).agreements
    expect(sent.map((item) => item.type).sort()).toEqual(
      walletTerms.map((item) => item.type).sort(),
    )
    expect(chargeBody).toEqual({ amount: 50000 })
    await waitFor(() => expect(toss.openTossCardPayment).toHaveBeenCalledTimes(1))
    expect(toss.openTossCardPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        clientKey: 'test_ck_key',
        customerKey: 'paldo-member-2',
        amount: 50000,
        orderId: SAMPLE_CHARGE_NO,
        orderName: '예치금 충전',
        successUrl: `http://localhost:3000/wallet/charge/success?returnTo=${encodeURIComponent('/checkout')}`,
        failUrl: `http://localhost:3000/wallet/charge/fail?returnTo=${encodeURIComponent('/checkout')}`,
      }),
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
    expect(toss.openTossCardPayment).not.toHaveBeenCalled()
  })

  it('충전 요청이 거절되면(409 한도 초과) 서버 문구를 보여 주고 결제창을 열지 않는다', async () => {
    server.use(
      http.post('*/api/v1/wallets/me/charges', () =>
        problem(409, '충전 후 잔액이 보유 한도를 초과합니다.'),
      ),
    )
    const { user } = renderCharge()

    await agreeAll(user)

    expect(await screen.findByText('충전 후 잔액이 보유 한도를 초과합니다.')).toBeInTheDocument()
    expect(toss.openTossCardPayment).not.toHaveBeenCalled()
  })

  it('결제창을 닫으면 충전 건을 실패로 바꾸고 다시 충전할 수 있게 한다', async () => {
    let failBody: unknown
    server.use(
      http.post('*/api/v1/wallets/me/charges/fail', async ({ request }) => {
        failBody = await request.json()
        return HttpResponse.json({ chargeNo: SAMPLE_CHARGE_NO, status: 'FAILED', amount: 50000 })
      }),
    )
    toss.openTossCardPayment.mockRejectedValue({
      code: 'USER_CANCEL',
      message: '결제를 취소했어요',
    })
    const { user } = renderCharge()

    await agreeAll(user)

    expect(await screen.findByText('결제창을 닫았어요. 예치금은 그대로예요')).toBeInTheDocument()
    await waitFor(() =>
      expect(failBody).toEqual({
        chargeNo: SAMPLE_CHARGE_NO,
        code: 'USER_CANCEL',
        message: '결제를 취소했어요',
      }),
    )
    expect(screen.getByRole('button', { name: '50,000원 충전하기' })).toBeEnabled()
  })
})
