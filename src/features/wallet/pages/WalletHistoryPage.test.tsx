import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import { HttpResponse, http } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { server } from '@/mocks/server'
import { render } from '@/test/render'
import { WalletHistoryPage } from './WalletHistoryPage'

// 이용 내역: GET /wallets/me/ledgers?from&to&type. 기본 응답(mocks/handlers/wallet.ts)은 fixtures 9건(10건씩)

function renderHistory() {
  const router = createMemoryRouter([{ path: '/me/wallet', Component: WalletHistoryPage }], {
    initialEntries: ['/me/wallet'],
  })
  render(<RouterProvider router={router} />)
  return { user: userEvent.setup() }
}

describe('WalletHistoryPage', () => {
  it('최근 1개월·전체로 조회하고 유형을 바꾸면 type을 보낸다', async () => {
    const queries: Record<string, string | null>[] = []
    server.use(
      http.get('*/api/v1/wallets/me/ledgers', ({ request }) => {
        const p = new URL(request.url).searchParams
        queries.push({ from: p.get('from'), to: p.get('to'), type: p.get('type') })
        return HttpResponse.json({
          content: [
            {
              occurredAt: '2026-10-18T14:30:00',
              type: 'PAYMENT',
              orderId: 184,
              orderSummary: null,
              amount: 39800,
              balanceAfter: 128000,
            },
          ],
          page: 0,
          size: 20,
          totalElements: 1,
          totalPages: 1,
        })
      }),
    )
    const { user } = renderHistory()

    expect((await screen.findAllByText('128,000')).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: '주문 184 결제' })[0]).toHaveAttribute(
      'href',
      '/orders/184',
    )
    const today = dayjs()
    expect(queries[0]).toEqual({
      from: today.subtract(1, 'month').format('YYYY-MM-DD'),
      to: today.format('YYYY-MM-DD'),
      type: null,
    })

    await user.click(screen.getByRole('radio', { name: '충전' }))
    await waitFor(() => expect(queries.at(-1)?.type).toBe('CHARGE'))
    await user.click(screen.getByRole('radio', { name: '환불' }))
    await waitFor(() => expect(queries.at(-1)?.type).toBe('REFUND'))
    await user.click(screen.getByRole('radio', { name: '환불 취소' }))
    await waitFor(() => expect(queries.at(-1)?.type).toBe('REFUND_REVERT'))
  })

  it('환불·환불 취소 줄을 부호와 주문 요약으로 보이고, 요약·주문 번호가 없어도 그린다', async () => {
    server.use(
      http.get('*/api/v1/wallets/me/ledgers', () =>
        HttpResponse.json({
          content: [
            {
              occurredAt: '2026-10-12T12:00:00',
              type: 'REFUND_REVERT',
              orderId: 1001,
              orderSummary: '사과 외 3건',
              amount: 3000,
              balanceAfter: 0,
            },
            {
              occurredAt: '2026-10-11T12:00:00',
              type: 'REFUND',
              orderId: 1001,
              orderSummary: '사과 외 3건',
              amount: 3000,
              balanceAfter: 3000,
            },
            {
              occurredAt: '2026-10-10T12:00:00',
              type: 'REFUND',
              orderId: null,
              orderSummary: null,
              amount: 1000,
              balanceAfter: 0,
            },
          ],
          page: 0,
          size: 10,
          totalElements: 3,
          totalPages: 1,
        }),
      ),
    )
    renderHistory()

    const links = await screen.findAllByRole('link', { name: '사과 외 3건' })
    for (const link of links) expect(link).toHaveAttribute('href', '/orders/1001')
    expect(screen.getAllByText('−3,000').length).toBeGreaterThan(0)
    expect(screen.getAllByText('+').length).toBeGreaterThan(0)
    expect(screen.getAllByTitle('환불').length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: '환불' })).not.toBeInTheDocument()
  })
})
