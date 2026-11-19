import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { render } from '@/test/render'
import { BALANCE_DEFAULT, LONG_ORDER_SUMMARY, walletTransactions } from '../fixtures'
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
    renderHistory({ transactions: walletTransactions.slice(5, 7) })
    expect(screen.getAllByText('예치금 충전').length).toBeGreaterThan(0)
    expect(screen.getAllByText('+').length).toBeGreaterThan(0)
    expect(screen.getAllByText('−23,900').length).toBeGreaterThan(0)
  })

  it('결제 줄은 주문 요약을 말줄임해 보이고 전체는 title에 두며 주문 상세로 이어진다', () => {
    renderHistory({ transactions: walletTransactions.slice(0, 1) })
    const links = screen.getAllByRole('link', { name: LONG_ORDER_SUMMARY })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/orders/184')
      expect(link).toHaveAttribute('title', LONG_ORDER_SUMMARY)
    }
  })

  it('환불은 +, 환불 취소는 −와 배지로 구분하고 주문 상세로 이어진다', () => {
    // 1: 환불 취소 −13,900, 2: 환불 +13,900 (주문 151)
    renderHistory({ transactions: walletTransactions.slice(1, 3) })
    expect(screen.getAllByText('환불').length).toBeGreaterThan(0)
    expect(screen.getAllByText('환불 취소').length).toBeGreaterThan(0)
    expect(screen.getAllByText('+').length).toBeGreaterThan(0)
    expect(screen.getAllByText('−13,900').length).toBeGreaterThan(0)
    for (const link of screen.getAllByRole('link', { name: '제주 노지 조생 감귤' }))
      expect(link).toHaveAttribute('href', '/orders/151')
  })

  it('주문 번호가 없는 환불은 링크 없이 문구만 보인다', () => {
    renderHistory({
      transactions: walletTransactions
        .slice(2, 3)
        .map((tx) => ({ ...tx, description: '환불', orderId: null })),
    })
    expect(screen.queryByRole('link', { name: '환불' })).not.toBeInTheDocument()
    expect(screen.getAllByTitle('환불').length).toBeGreaterThan(0)
  })

  it('유형 필터에 환불·환불 취소가 있다', () => {
    renderHistory()
    for (const name of ['전체', '충전', '결제', '환불', '환불 취소'])
      expect(screen.getByRole('radio', { name })).toBeInTheDocument()
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
