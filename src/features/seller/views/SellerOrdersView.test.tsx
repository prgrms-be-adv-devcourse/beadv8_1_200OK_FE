import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { OrderItemStatus } from '@/shared/api/types'
import { render } from '@/test/render'
import { cancelClaims, sellerOrders } from '../fixtures'
import { SellerOrderTab } from '../types'
import { SellerClaimsView } from './SellerClaimsView'
import { SellerOrdersView, type SellerOrdersViewProps } from './SellerOrdersView'

const waiting = sellerOrders.filter((o) => o.status === OrderItemStatus.PREPARING)

function renderOrders(props: Partial<SellerOrdersViewProps> = {}) {
  const handlers = {
    onRegisterInvoice: vi.fn(),
    onNotifyDelay: vi.fn(),
    onSellerCancel: vi.fn(),
    onAnswerAddressChange: vi.fn(),
  }
  render(
    <MemoryRouter>
      <SellerOrdersView
        status="success"
        orders={waiting}
        tab={SellerOrderTab.WAITING}
        onTabChange={() => {}}
        counts={{ WAITING: 5, SHIPPING: 2, DELIVERED: 1, CANCELED: 1 }}
        today={new Date('2026-10-18T15:00:00')}
        {...handlers}
        {...props}
      />
    </MemoryRouter>,
  )
  return { ...handlers, user: userEvent.setup() }
}

describe('SellerOrdersView', () => {
  it('취소 요청이 있는 주문은 송장 등록·지연을 막는다', () => {
    renderOrders({ orders: waiting.filter((o) => o.cancelRequested).slice(0, 1) })
    const list = screen.getByRole('list', { name: '주문 목록' })
    expect(within(list).getByRole('button', { name: '송장 등록' })).toBeDisabled()
    expect(within(list).getByRole('button', { name: '출고 지연 알리기' })).toBeDisabled()
    expect(within(list).getByText('취소 요청을 먼저 처리해 주세요')).toBeInTheDocument()
  })

  it('송장번호는 숫자 9~14자리만 받는다', async () => {
    const { user, onRegisterInvoice } = renderOrders({
      defaultModal: { type: 'invoice', shipmentId: 1 },
    })
    const input = await screen.findByLabelText('송장번호')
    await user.type(input, '1234')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '송장 등록' }))
    expect(screen.getByText('송장번호는 숫자 9~14자리로 입력해 주세요')).toBeInTheDocument()

    await user.clear(input)
    await user.type(input, '6842 1937 5520')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '송장 등록' }))
    expect(onRegisterInvoice).toHaveBeenCalledWith(1, {
      carrier: 'CJ대한통운',
      trackingNumber: '684219375520',
    })
  })

  it('출고 지연은 사유와 날짜를 골라야 알릴 수 있다', async () => {
    renderOrders({ defaultModal: { type: 'delay', shipmentId: 1 } })
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: '지연 알리기' })).toBeDisabled()
    expect(within(dialog).getByText('지연 사유를 골라 주세요')).toBeInTheDocument()
  })
})

describe('SellerClaimsView', () => {
  const pending = cancelClaims.filter((c) => c.reason && c.rejectReason === null).slice(0, 2)

  it('거절은 사유가 있어야 한다', async () => {
    const onReject = vi.fn()
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SellerClaimsView
          status="success"
          claims={pending}
          tab="PENDING"
          onTabChange={() => {}}
          counts={{ PENDING: 2, DONE: 2 }}
          onApprove={() => {}}
          onReject={onReject}
          defaultModal={{ type: 'reject', claimId: 31 }}
        />
      </MemoryRouter>,
    )
    const dialog = await screen.findByRole('dialog', { name: '취소 요청 거절' })
    await user.click(within(dialog).getByRole('button', { name: '거절하기' }))
    expect(within(dialog).getByText('거절 사유를 입력해 주세요')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText(/거절 사유/), '이미 출고 준비를 마쳤어요')
    await user.click(within(dialog).getByRole('button', { name: '거절하기' }))
    expect(onReject).toHaveBeenCalledWith(31, '이미 출고 준비를 마쳤어요')
  })
})
