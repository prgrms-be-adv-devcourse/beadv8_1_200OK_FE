import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { render } from '@/test/render'
import { BALANCE_DEFAULT, walletTransactions } from '../fixtures'
import { WalletHistoryView, type WalletHistoryViewProps } from './WalletHistoryView'

function renderHistory(props: Partial<WalletHistoryViewProps> = {}) {
  render(
    <MemoryRouter>
      <WalletHistoryView
        status="success"
        balance={BALANCE_DEFAULT}
        transactions={walletTransactions}
        period="1m"
        onPeriodChange={() => {}}
        range={[null, null]}
        onRangeChange={() => {}}
        type="ALL"
        onTypeChange={() => {}}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('WalletHistoryView', () => {
  it('들어온 돈은 +, 나간 돈은 −로 보여 준다', () => {
    renderHistory({ transactions: walletTransactions.slice(3, 5) })
    expect(screen.getAllByText('예치금 충전').length).toBeGreaterThan(0)
    expect(screen.getAllByText('+').length).toBeGreaterThan(0)
    expect(screen.getAllByText('−23,900').length).toBeGreaterThan(0)
  })

  it('결제 줄은 주문 상세로 이어진다', () => {
    renderHistory({ transactions: walletTransactions.slice(0, 1) })
    const links = screen.getAllByRole('link', { name: '주문 184 결제' })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) expect(link).toHaveAttribute('href', '/orders/184')
  })

  it('시작일이 종료일보다 늦으면 알린다', () => {
    renderHistory({
      period: 'custom',
      range: [new Date('2026-10-18T00:00:00'), new Date('2026-10-01T00:00:00')],
    })
    expect(screen.getByText('시작일이 종료일보다 늦어요')).toBeInTheDocument()
    expect(screen.getByText('기간을 다시 골라 주세요')).toBeInTheDocument()
  })

  it('내역이 없으면 빈 상태', () => {
    renderHistory({ transactions: [] })
    expect(screen.getByText('이 기간에는 이용 내역이 없어요')).toBeInTheDocument()
  })
})
