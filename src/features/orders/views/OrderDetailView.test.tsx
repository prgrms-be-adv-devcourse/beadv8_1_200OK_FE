import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { OrderItemStatus } from '@/shared/api/types'
import { render } from '@/test/render'
import { orderDetails, orderWithStatus } from '../fixtures'
import { CancelReason } from '../types'
import { OrderDetailView, type OrderDetailViewProps } from './OrderDetailView'

function renderDetail(props: Partial<OrderDetailViewProps> = {}) {
  const handlers = {
    onCancelRequest: vi.fn(),
    onWithdraw: vi.fn(),
    onConfirm: vi.fn(),
    onAddressChangeRequest: vi.fn(),
  }
  render(
    <MemoryRouter>
      <OrderDetailView status="success" order={orderDetails[0]} {...handlers} {...props} />
    </MemoryRouter>,
  )
  return { ...handlers, user: userEvent.setup() }
}

describe('OrderDetailView', () => {
  it('상품 준비 중이면 사유를 골라 취소를 요청한다', async () => {
    const { user, onCancelRequest } = renderDetail()
    const [cancel] = screen.getAllByRole('button', { name: '취소 요청' })
    if (!cancel) throw new Error('취소 버튼 없음')
    await user.click(cancel)

    const submit = await screen.findByRole('button', { name: '취소 요청하기' })
    expect(submit).toBeDisabled()
    expect(screen.getByText('취소 사유를 골라 주세요')).toBeInTheDocument()

    await user.click(screen.getByLabelText('주문 실수 (옵션·수량)'))
    await user.click(submit)
    expect(onCancelRequest).toHaveBeenCalledWith({
      shipmentId: 1,
      orderItemIds: [1841],
      reason: CancelReason.ORDER_MISTAKE,
    })
  })

  it('이미 출고됐으면 모달에서 알리고 요청을 막는다', async () => {
    renderDetail({
      defaultModal: { type: 'cancel', shipmentId: 1 },
      cancelError: {
        title: '이미 출고된 상품은 취소할 수 없어요',
        message: '판매자가 방금 송장을 등록했어요.',
      },
    })
    expect(await screen.findByText('이미 출고된 상품은 취소할 수 없어요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '취소 요청하기' })).toBeDisabled()
  })

  it('취소 요청 중이면 철회할 수 있다', async () => {
    const { user, onWithdraw } = renderDetail({
      order: orderWithStatus(OrderItemStatus.CANCEL_REQUESTED),
    })
    await user.click(screen.getByRole('button', { name: '요청 철회' }))
    expect(onWithdraw).toHaveBeenCalledWith(77)
  })

  it('배송 완료면 확인을 거쳐 구매확정한다', async () => {
    const { user, onConfirm } = renderDetail({ order: orderWithStatus(OrderItemStatus.DELIVERED) })
    expect(screen.getByText('10월 21일에 자동으로 구매확정돼요')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '구매확정' }))
    const dialog = await screen.findByRole('dialog', { name: '구매확정할까요?' })
    await user.click(
      [...dialog.querySelectorAll('button')].find(
        (b) => b.textContent === '구매확정',
      ) as HTMLElement,
    )
    expect(onConfirm).toHaveBeenCalledWith(1)
  })

  it('구매확정한 상품은 리뷰 쓰기로 이어진다', () => {
    renderDetail({ order: orderWithStatus(OrderItemStatus.PURCHASE_CONFIRMED) })
    expect(screen.getByRole('link', { name: '리뷰 쓰기' })).toHaveAttribute(
      'href',
      '/reviews/new?orderItemId=1841',
    )
  })
})
