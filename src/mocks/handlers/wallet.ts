import { HttpResponse, http } from 'msw'
import {
  SAMPLE_CHARGE_NO,
  walletBalance,
  walletLedgers,
  walletTerms,
} from '@/features/wallet/fixtures'
import { ChargeStatus } from '@/shared/api/types'
import { pageOf } from './_shared'

// 지갑 기본 응답 (wallet fixtures). 약관은 모두 동의 전, 잔액 128,000 / 한도 500,000, 충전은 요청 → 승인 COMPLETED.
// 409 약관 개정·한도 초과, 422, IN_PROGRESS·FAILED는 테스트에서 server.use(...)로 덮는다.

export const walletHandlers = [
  http.get('*/api/v1/wallets/me/terms', () => HttpResponse.json({ terms: walletTerms })),
  http.post('*/api/v1/wallets/me/terms/agreements', () => new HttpResponse(null, { status: 204 })),
  http.get('*/api/v1/wallets/me/balance', () => HttpResponse.json(walletBalance)),
  http.post('*/api/v1/wallets/me/charges', async ({ request }) => {
    const { amount } = (await request.json()) as { amount: number }
    return HttpResponse.json({ chargeNo: SAMPLE_CHARGE_NO, amount }, { status: 201 })
  }),
  http.post('*/api/v1/wallets/me/charges/confirm', async ({ request }) => {
    const { chargeNo, amount } = (await request.json()) as { chargeNo: string; amount: number }
    return HttpResponse.json({ chargeNo, status: ChargeStatus.COMPLETED, amount })
  }),
  http.post('*/api/v1/wallets/me/charges/fail', async ({ request }) => {
    const { chargeNo } = (await request.json()) as { chargeNo: string }
    return HttpResponse.json({ chargeNo, status: ChargeStatus.FAILED, amount: 0 })
  }),
  http.get('*/api/v1/wallets/me/charges/:chargeNo', ({ params }) =>
    HttpResponse.json({ chargeNo: params.chargeNo, status: ChargeStatus.COMPLETED, amount: 0 }),
  ),
  http.get('*/api/v1/wallets/me/ledgers', ({ request }) => {
    const searchParams = new URL(request.url).searchParams
    const type = searchParams.get('type')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const rows = walletLedgers.filter((entry) => {
      const day = entry.occurredAt.slice(0, 10)
      if (type && entry.type !== type) return false
      if (from && day < from) return false
      if (to && day > to) return false
      return true
    })
    return HttpResponse.json(pageOf(rows, searchParams, 10))
  }),
]
