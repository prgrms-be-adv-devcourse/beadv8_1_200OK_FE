import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { RefundStatus } from '@/shared/api/refund'
import { OrderItemStatus } from '@/shared/api/types'
import { render } from '@/test/render'
import {
  failedRefund,
  myRefunds,
  orderDetails,
  orderWithItemStatus,
  remoteAreaOrder,
} from '../fixtures'
import { OrderDetailView, type OrderDetailViewProps } from './OrderDetailView'

function renderDetail(props: Partial<OrderDetailViewProps> = {}) {
  render(
    <MemoryRouter>
      <OrderDetailView status="success" order={orderDetails[0]} {...props} />
    </MemoryRouter>,
  )
}

describe('OrderDetailView', () => {
  it('배송지·판매자 묶음·결제 금액을 보여 준다', () => {
    renderDetail()
    expect(screen.getByText(/주문번호 184/)).toBeInTheDocument()
    expect(screen.getByText('이서연')).toBeInTheDocument()
    expect(screen.getByText(/서울 중구 세종대로 110/)).toBeInTheDocument()
    expect(screen.getByText('판매자 7')).toBeInTheDocument()
    expect(screen.getByText('판매자 8')).toBeInTheDocument()
    expect(screen.getByText('청송 꿀사과 부사')).toBeInTheDocument()
    expect(screen.getAllByText('39,800').length).toBeGreaterThan(0)
    expect(screen.queryByText('도서산간 추가 운임')).not.toBeInTheDocument()
  })

  it('취소 요청을 모르면(불러오는 중) 취소 요청 버튼을 그리지 않는다', () => {
    renderDetail({ onRequestCancel: async () => null })
    expect(screen.queryByRole('button', { name: /취소 요청$/ })).not.toBeInTheDocument()
  })

  it('승인 대기 중인 상품은 버튼 대신 상태를 보이고, 철회한 상품은 다시 요청할 수 있다', async () => {
    const onWithdrawRefund = vi.fn()
    renderDetail({
      refunds: myRefunds.filter((r) => r.orderId === 184),
      onRequestCancel: async () => null,
      onWithdrawRefund,
    })
    expect(screen.getByText('취소 승인 대기 중')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '해남 꿀고구마 베니하루카 취소 요청' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '청송 꿀사과 부사 취소 요청' })).toBeInTheDocument()

    const section = screen.getByRole('region', { name: '취소 요청' })
    expect(within(section).getByText('승인할 때 정해져요')).toBeInTheDocument()
    await userEvent.click(
      within(section).getByRole('button', { name: '해남 꿀고구마 베니하루카 취소 요청 철회' }),
    )
    expect(onWithdrawRefund).toHaveBeenCalledWith(41)
  })

  it('취소 실패한 상품은 실패 이유와 주문 유지 안내를 보이고 다시 요청할 수 있다', () => {
    renderDetail({ refunds: [failedRefund], onRequestCancel: async () => null })
    expect(
      screen.getByRole('button', { name: '해남 꿀고구마 베니하루카 취소 요청' }),
    ).toBeInTheDocument()

    const card = screen.getByRole('article', { name: '해남 꿀고구마 베니하루카' })
    expect(within(card).getByText('취소 실패')).toBeInTheDocument()
    expect(within(card).getByText(/주문은 그대로 유지돼요/)).toBeInTheDocument()
    expect(within(card).getByText('실패 이유')).toBeInTheDocument()
    expect(within(card).getByText(failedRefund.rejectReason as string)).toBeInTheDocument()
    expect(within(card).getByText('환불하지 않아요')).toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: /철회$/ })).not.toBeInTheDocument()
  })

  it('처리 중·완료로 산 개수를 다 취소했으면 더 요청하지 않는다', () => {
    const [requested] = myRefunds
    if (!requested) throw new Error('fixtures: 취소 요청 없음')
    renderDetail({
      refunds: [{ ...requested, status: RefundStatus.COMPLETED }],
      onRequestCancel: async () => null,
    })
    expect(screen.getByText('모두 취소했어요')).toBeInTheDocument()
  })

  it('취소 요청 창에서 사유를 적어 보내고, 서버가 거절하면 창에 그 이유를 보여 준다', async () => {
    const onRequestCancel = vi
      .fn<NonNullable<OrderDetailViewProps['onRequestCancel']>>()
      .mockResolvedValueOnce(
        '취소 금액이 남은 상품의 배송비보다 적어 이 상품만 취소할 수 없습니다.',
      )
      .mockResolvedValueOnce(null)
    renderDetail({ refunds: [], onRequestCancel })
    await userEvent.click(screen.getByRole('button', { name: '청송 꿀사과 부사 취소 요청' }))
    const dialog = screen.getByRole('dialog', { name: '취소를 요청할까요?' })
    expect(within(dialog).getByText(/배송비는 승인할 때 정해져요/)).toBeInTheDocument()
    await userEvent.type(within(dialog).getByLabelText(/취소 사유/), '  옵션을 잘못 골랐어요 ')
    await userEvent.click(within(dialog).getByRole('button', { name: '취소 요청' }))
    expect(onRequestCancel).toHaveBeenLastCalledWith(1841, 1, '옵션을 잘못 골랐어요')
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      /이 상품만 취소할 수 없습니다/,
    )

    await userEvent.click(within(dialog).getByRole('button', { name: '취소 요청' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: '취소를 요청할까요?' })).not.toBeInTheDocument(),
    )
  })

  it('배송 완료 상품마다 구매확정 버튼을 두고, 확인 창에서 확정한다', async () => {
    const onConfirm = vi.fn()
    renderDetail({ order: orderWithItemStatus(OrderItemStatus.DELIVERED), onConfirm })
    await userEvent.click(screen.getByRole('button', { name: '청송 꿀사과 부사 구매확정' }))
    const dialog = screen.getByRole('dialog', { name: '구매확정할까요?' })
    expect(within(dialog).getByText(/배송 완료 3일 뒤에 자동으로 구매확정돼요/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: '구매확정' }))
    expect(onConfirm).toHaveBeenCalledWith(1841)
  })

  it('구매확정 동작을 받지 못하면 버튼을 그리지 않는다', () => {
    renderDetail({ order: orderWithItemStatus(OrderItemStatus.DELIVERED), onConfirm: undefined })
    expect(screen.queryByRole('button', { name: /구매확정$/ })).not.toBeInTheDocument()
  })

  it('구매확정한 상품은 주문·주문 상품 번호를 실어 리뷰 쓰기로 이어진다', () => {
    renderDetail({ order: orderWithItemStatus(OrderItemStatus.PURCHASE_CONFIRMED) })
    expect(screen.getByRole('link', { name: '리뷰 쓰기' })).toHaveAttribute(
      'href',
      '/reviews/new?orderId=184&orderItemId=1841',
    )
  })

  it('도서산간 주문은 추가 운임을 묶음과 결제 정보에 보여 준다', () => {
    renderDetail({ order: remoteAreaOrder })
    expect(screen.getAllByText('도서산간 추가 운임')).toHaveLength(2)
    expect(screen.getAllByText('5,000').length).toBeGreaterThan(0)
    expect(screen.getAllByText('31,900').length).toBeGreaterThan(0)
  })

  it('없는 주문이면 주문 내역으로 안내한다', () => {
    renderDetail({ status: 'notFound', order: undefined })
    expect(screen.getByText('주문을 찾을 수 없어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '주문 내역으로' })).toHaveAttribute('href', '/orders')
  })
})
