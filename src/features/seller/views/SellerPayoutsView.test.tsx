import { screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { render } from '@/test/render'
import {
  adjustedPayoutDetail,
  adjustedPayoutItems,
  payoutDetails,
  payoutItems,
  payoutOutlook,
  payouts,
} from '../fixtures'
import { SellerPayoutsView, type SellerPayoutsViewProps } from './SellerPayoutsView'

const monthSummary = { month: '2026-10-18T02:00:00', amount: 353682, count: 4 }

function renderPayouts(props: Partial<SellerPayoutsViewProps> = {}) {
  render(
    <MemoryRouter>
      <SellerPayoutsView
        status="success"
        payouts={payouts}
        outlook={payoutOutlook}
        monthSummary={monthSummary}
        detail={null}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('SellerPayoutsView', () => {
  it('정산마다 금액과 상세 주소를 보여 준다', () => {
    renderPayouts()
    const table = screen.getByRole('table', { name: '정산 목록' })
    expect(within(table).getByText('103,762')).toBeInTheDocument()
    expect(
      within(table).getByRole('link', { name: '10월 18일 정산 1021 상세 보기' }),
    ).toHaveAttribute('href', '/seller/payouts/1021')
    expect(screen.getByText('10월 · 정산 4건')).toBeInTheDocument()
  })

  it('정산이 없으면 빈 상태와 주문·출고 바로가기', () => {
    renderPayouts({ payouts: [] })
    expect(screen.getByText('아직 정산된 내역이 없어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '주문·출고로 가기' })).toHaveAttribute(
      'href',
      '/seller/orders',
    )
  })

  it('상세는 주문 상품별로 대금 · 수수료(−) · 배송비(+)를 나눠 보여 준다', async () => {
    const payout = payoutDetails[0] ?? null
    renderPayouts({
      detail: {
        onClose: () => {},
        status: 'success',
        payout,
        items: payoutItems[1021] ?? [],
      },
    })
    const dialog = await screen.findByRole('dialog', { name: '정산 상세' })
    const groups = within(dialog).getByRole('list', { name: '주문 상품별 정산 항목' })
    const first = within(groups).getAllByRole('listitem')[0] as HTMLElement
    expect(first).toHaveTextContent('주문 상품 1210')
    expect(first).toHaveTextContent('상품판매 수수료 3%−717원')
    // 배송비 항목은 orderItemId가 null이라 주문 단위로 묶인다
    expect(groups).toHaveTextContent('주문 121 배송비')
    expect(groups).toHaveTextContent('상품판매 배송비+3,000원')
    expect(dialog).toHaveTextContent('정산 금액103,762원')
  })

  it('정산 조정은 사유와 함께 받은 부호대로 보여 준다', async () => {
    renderPayouts({
      detail: {
        onClose: () => {},
        status: 'success',
        payout: adjustedPayoutDetail,
        items: adjustedPayoutItems,
      },
    })
    const dialog = await screen.findByRole('dialog', { name: '정산 상세' })
    expect(
      within(dialog).getByText('배송 중 파손으로 구매자에게 일부 환불한 금액이에요'),
    ).toBeInTheDocument()
    expect(dialog).toHaveTextContent(
      '정산 조정배송 중 파손으로 구매자에게 일부 환불한 금액이에요−3,000원',
    )
  })
})
