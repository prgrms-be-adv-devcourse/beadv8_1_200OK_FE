import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { OrderItemStatus } from '@/shared/api/types'
import { render } from '@/test/render'
import { orderDetails, orderWithItemStatus, remoteAreaOrder } from '../fixtures'
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

  it('상품 준비 중이면 취소 요청 버튼을 이유와 함께 비활성으로 둔다', () => {
    renderDetail()
    const [cancel] = screen.getAllByRole('button', { name: '취소 요청' })
    expect(cancel).toBeDisabled()
    expect(screen.getAllByText('취소 요청은 아직 준비 중이에요').length).toBeGreaterThan(0)
  })

  it('배송 완료면 구매확정 버튼을 이유와 함께 비활성으로 둔다', () => {
    renderDetail({ order: orderWithItemStatus(OrderItemStatus.DELIVERED) })
    expect(screen.getByRole('button', { name: '구매확정' })).toBeDisabled()
    expect(screen.getByText('구매확정은 아직 준비 중이에요')).toBeInTheDocument()
    expect(screen.queryByText(/자동으로 구매확정돼요/)).not.toBeInTheDocument()
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
