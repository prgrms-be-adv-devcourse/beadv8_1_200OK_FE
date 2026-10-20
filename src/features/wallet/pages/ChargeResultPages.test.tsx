import { screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { server } from '@/mocks/server'
import { ChargeStatus } from '@/shared/api/types'
import { render } from '@/test/render'
import { SAMPLE_CHARGE_NO } from '../fixtures'
import { ChargeFailPage, ChargeSuccessPage } from './ChargeResultPages'

// 토스 복귀. 기본 응답(mocks/handlers/wallet.ts): 승인 COMPLETED, 상태 조회 COMPLETED, 잔액 128,000

const problem = (status: number, detail: string) =>
  HttpResponse.json(
    { type: 'about:blank', title: 'Error', status, detail, instance: '/x' },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

const SUCCESS = `/wallet/charge/success?paymentType=NORMAL&orderId=${SAMPLE_CHARGE_NO}&paymentKey=pk_1&amount=50000`

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/wallet/charge/success',
        element: <ChargeSuccessPage pollIntervalMs={10} maxPolls={3} />,
      },
      { path: '/wallet/charge/fail', Component: ChargeFailPage },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
}

describe('ChargeSuccessPage', () => {
  it('successUrl 값으로 승인하고 COMPLETED면 새 잔액과 함께 성공을 보여 준다', async () => {
    let body: unknown
    server.use(
      http.post('*/api/v1/wallets/me/charges/confirm', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({
          chargeNo: SAMPLE_CHARGE_NO,
          status: ChargeStatus.COMPLETED,
          amount: 50000,
        })
      }),
      http.get('*/api/v1/wallets/me/balance', () =>
        HttpResponse.json({ balance: 178000, maxBalance: 500000 }),
      ),
    )
    renderAt(`${SUCCESS}&returnTo=%2Fcheckout`)

    expect(await screen.findByText('50,000원을 충전했어요')).toBeInTheDocument()
    expect(await screen.findByText('178,000원')).toBeInTheDocument()
    expect(body).toEqual({ chargeNo: SAMPLE_CHARGE_NO, paymentKey: 'pk_1', amount: 50000 })
    expect(screen.getByRole('link', { name: '주문서로 돌아가기' })).toHaveAttribute(
      'href',
      '/checkout',
    )
  })

  it('IN_PROGRESS면 상태를 다시 확인해 COMPLETED로 바뀌면 성공을 보여 준다', async () => {
    let polls = 0
    server.use(
      http.post('*/api/v1/wallets/me/charges/confirm', () =>
        HttpResponse.json({
          chargeNo: SAMPLE_CHARGE_NO,
          status: ChargeStatus.IN_PROGRESS,
          amount: 50000,
        }),
      ),
      http.get('*/api/v1/wallets/me/charges/:chargeNo', () => {
        polls += 1
        return HttpResponse.json({
          chargeNo: SAMPLE_CHARGE_NO,
          status: polls < 2 ? ChargeStatus.IN_PROGRESS : ChargeStatus.COMPLETED,
          amount: 50000,
        })
      }),
    )
    renderAt(SUCCESS)

    expect(await screen.findByText('충전 결과를 확인하고 있어요')).toBeInTheDocument()
    expect(await screen.findByText('50,000원을 충전했어요')).toBeInTheDocument()
    expect(polls).toBe(2)
  })

  it('몇 번 확인해도 IN_PROGRESS면 확인 중으로 두고 멈춘다', async () => {
    let polls = 0
    server.use(
      http.post('*/api/v1/wallets/me/charges/confirm', () =>
        HttpResponse.json({
          chargeNo: SAMPLE_CHARGE_NO,
          status: ChargeStatus.IN_PROGRESS,
          amount: 50000,
        }),
      ),
      http.get('*/api/v1/wallets/me/charges/:chargeNo', () => {
        polls += 1
        return HttpResponse.json({
          chargeNo: SAMPLE_CHARGE_NO,
          status: ChargeStatus.IN_PROGRESS,
          amount: 50000,
        })
      }),
    )
    renderAt(SUCCESS)

    expect(await screen.findByText('충전 결과를 확인하고 있어요')).toBeInTheDocument()
    await waitFor(() => expect(polls).toBe(3))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(polls).toBe(3)
    expect(screen.getByText('충전 결과를 확인하고 있어요')).toBeInTheDocument()
  })

  it('FAILED면 실패를 보여 준다', async () => {
    server.use(
      http.post('*/api/v1/wallets/me/charges/confirm', () =>
        HttpResponse.json({ chargeNo: SAMPLE_CHARGE_NO, status: ChargeStatus.FAILED, amount: 0 }),
      ),
    )
    renderAt(SUCCESS)
    expect(await screen.findByText('충전하지 못했어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '다시 충전하기' })).toHaveAttribute(
      'href',
      '/wallet/charge',
    )
  })

  it('승인이 거절되면(422 금액 불일치) 서버 문구로 알린다', async () => {
    server.use(
      http.post('*/api/v1/wallets/me/charges/confirm', () =>
        problem(422, '결제 금액이 충전 요청 금액과 다릅니다.'),
      ),
    )
    renderAt(SUCCESS)
    expect(await screen.findByText('충전하지 못했어요')).toBeInTheDocument()
    expect(screen.getByText(/결제 금액이 충전 요청 금액과 다릅니다\./)).toBeInTheDocument()
  })

  it('필요한 값이 없으면 승인하지 않고 실패로 안내한다', async () => {
    let called = false
    server.use(
      http.post('*/api/v1/wallets/me/charges/confirm', () => {
        called = true
        return problem(422, 'x')
      }),
    )
    renderAt('/wallet/charge/success?amount=50000')
    expect(await screen.findByText('충전하지 못했어요')).toBeInTheDocument()
    expect(screen.getByText(/결제 정보를 확인하지 못했어요/)).toBeInTheDocument()
    expect(called).toBe(false)
  })
})

describe('ChargeFailPage', () => {
  it('failUrl 값으로 충전 건을 실패로 바꾸고 토스 문구를 보여 준다', async () => {
    let body: unknown
    server.use(
      http.post('*/api/v1/wallets/me/charges/fail', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({
          chargeNo: SAMPLE_CHARGE_NO,
          status: ChargeStatus.FAILED,
          amount: 0,
        })
      }),
    )
    renderAt(
      `/wallet/charge/fail?code=PAY_PROCESS_CANCELED&message=${encodeURIComponent('사용자가 결제를 취소했습니다.')}&orderId=${SAMPLE_CHARGE_NO}&returnTo=%2Fcheckout`,
    )

    expect(await screen.findByText('충전하지 못했어요')).toBeInTheDocument()
    expect(screen.getByText(/사용자가 결제를 취소했습니다\./)).toBeInTheDocument()
    await waitFor(() =>
      expect(body).toEqual({
        chargeNo: SAMPLE_CHARGE_NO,
        code: 'PAY_PROCESS_CANCELED',
        message: '사용자가 결제를 취소했습니다.',
      }),
    )
    expect(screen.getByRole('link', { name: '다시 충전하기' })).toHaveAttribute(
      'href',
      `/wallet/charge?returnTo=${encodeURIComponent('/checkout')}`,
    )
  })
})
