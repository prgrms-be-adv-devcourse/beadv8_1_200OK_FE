import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { ShipmentCarrier } from '@/shared/api/types'
import { render } from '@/test/render'
import { InvoiceModal } from '../components/OrderModals'
import { cancelClaims, sellerShipments } from '../fixtures'
import { SellerClaimsView } from './SellerClaimsView'
import { SellerOrdersView, type SellerOrdersViewProps } from './SellerOrdersView'

function renderOrders(props: Partial<SellerOrdersViewProps> = {}) {
  const handlers = {
    onRegisterInvoice: vi.fn(),
    onOpenAddressChange: vi.fn(),
    onPageChange: vi.fn(),
  }
  render(
    <MemoryRouter>
      <SellerOrdersView
        status="success"
        shipments={sellerShipments}
        page={0}
        totalPages={1}
        totalElements={sellerShipments.length}
        {...handlers}
        {...props}
      />
    </MemoryRouter>,
  )
  return { ...handlers, user: userEvent.setup() }
}

describe('SellerOrdersView', () => {
  it('출고 전 배송에만 송장 등록을, 출고한 배송에는 택배사·송장번호를 보여 준다', () => {
    renderOrders()
    const list = screen.getByRole('list', { name: '주문 목록' })
    expect(within(list).getAllByRole('button', { name: /송장 등록$/ })).toHaveLength(3)
    expect(within(list).getByText(/CJ대한통운 684219371180/)).toBeInTheDocument()
    expect(within(list).getByText(/한진택배 4012345678901/)).toBeInTheDocument()
  })

  it('대기 중인 배송지 변경 요청이 있는 배송에만 배지를 달고, 누르면 그 배송을 연다', async () => {
    const { user, onOpenAddressChange } = renderOrders()
    const list = screen.getByRole('list', { name: '주문 목록' })
    const badges = within(list).getAllByRole('button', { name: /배송지 변경 요청 확인/ })
    expect(badges).toHaveLength(1)
    await user.click(badges[0] as HTMLElement)
    expect(onOpenAddressChange).toHaveBeenCalledWith(expect.objectContaining({ shipmentId: 2 }))
  })

  it('송장 등록을 누르면 그 배송을 넘긴다', async () => {
    const { user, onRegisterInvoice } = renderOrders()
    await user.click(
      within(screen.getByRole('list', { name: '주문 목록' })).getByRole('button', {
        name: '주문 184 송장 등록',
      }),
    )
    expect(onRegisterInvoice).toHaveBeenCalledWith(expect.objectContaining({ shipmentId: 1 }))
  })

  it('송장번호는 숫자 10~13자리만 받고, 택배사는 서버 코드로 보낸다', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <InvoiceModal shipment={sellerShipments[0] ?? null} onClose={() => {}} onSubmit={onSubmit} />,
    )
    const input = await screen.findByLabelText('송장번호')
    await user.type(input, '1234')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '송장 등록' }))
    expect(screen.getByText('송장번호는 숫자 10~13자리로 입력해 주세요')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    expect(screen.getByLabelText('택배사')).toHaveDisplayValue('CJ대한통운')
    await user.clear(input)
    await user.type(input, '6842 1937 5520')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '송장 등록' }))
    expect(onSubmit).toHaveBeenCalledWith({
      carrier: ShipmentCarrier.CJ_LOGISTICS,
      trackingNumber: '684219375520',
    })
  })

  it('대기 중인 배송지 변경 요청이 있으면 송장 등록 전에 자동 거절된다고 알린다', async () => {
    render(
      <InvoiceModal shipment={sellerShipments[1] ?? null} onClose={() => {}} onSubmit={() => {}} />,
    )
    expect(await screen.findByText(/자동으로 거절돼요/)).toBeInTheDocument()
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
