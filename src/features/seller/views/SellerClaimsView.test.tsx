import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { RefundStatus } from '@/shared/api/refund'
import { render } from '@/test/render'
import { sellerRefunds } from '../fixtures'
import { SellerClaimsView, type SellerClaimsViewProps } from './SellerClaimsView'

function renderClaims(props: Partial<SellerClaimsViewProps> = {}) {
  render(
    <MemoryRouter>
      <SellerClaimsView
        status="success"
        refunds={sellerRefunds}
        filter="ALL"
        onFilterChange={() => {}}
        onApprove={async () => null}
        onReject={async () => null}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('SellerClaimsView', () => {
  it('승인 전에는 배송비가 정해지지 않았다고 알리고, 승인한 요청은 서버가 정한 배송비를 보인다', () => {
    renderClaims()
    const [requested] = screen.getAllByRole('article')
    if (!requested) throw new Error('카드 없음')
    expect(within(requested).getByText('승인할 때 정해져요')).toBeInTheDocument()
    expect(within(requested).getByText('환불 예정 금액')).toBeInTheDocument()

    const processing = screen.getByRole('article', { name: /주문번호 120/ })
    expect(within(processing).getByText('배송비 환불')).toBeInTheDocument()
    expect(within(processing).getByText('15,900')).toBeInTheDocument()

    const completed = screen.getByRole('article', { name: /주문번호 88/ })
    expect(within(completed).getByText('배송비 차감')).toBeInTheDocument()
    expect(within(completed).getByText('−3,000')).toBeInTheDocument()

    const rejected = screen.getByRole('article', { name: /주문번호 71/ })
    expect(within(rejected).getByText('환불하지 않아요')).toBeInTheDocument()
    expect(within(rejected).getByText('이미 포장을 마쳐 오늘 출고했어요')).toBeInTheDocument()
  })

  it('승인 대기 요청에만 승인·거절 버튼을 둔다', () => {
    renderClaims()
    const pending = sellerRefunds.filter((r) => r.status === RefundStatus.REQUESTED)
    expect(screen.getAllByRole('button', { name: /취소 요청 승인$/ })).toHaveLength(pending.length)
    expect(screen.getAllByRole('button', { name: /취소 요청 거절$/ })).toHaveLength(pending.length)
  })

  it('거절은 사유가 있어야 한다', async () => {
    const onReject = vi.fn(async () => null)
    const user = userEvent.setup()
    renderClaims({ onReject, defaultModal: { type: 'reject', refundId: 31 } })
    const dialog = await screen.findByRole('dialog', { name: '취소 요청 거절' })
    await user.click(within(dialog).getByRole('button', { name: '거절하기' }))
    expect(within(dialog).getByText('거절 사유를 입력해 주세요')).toBeInTheDocument()
    expect(onReject).not.toHaveBeenCalled()

    await user.type(within(dialog).getByLabelText(/거절 사유/), '이미 출고 준비를 마쳤어요')
    await user.click(within(dialog).getByRole('button', { name: '거절하기' }))
    expect(onReject).toHaveBeenCalledWith(31, '이미 출고 준비를 마쳤어요')
  })

  it('처리가 실패하면 창을 열어 두고 이유를 보인다', async () => {
    const user = userEvent.setup()
    renderClaims({
      onApprove: async () => '주문 정보를 확인하지 못했습니다.',
      defaultModal: { type: 'approve', refundId: 31 },
    })
    const dialog = await screen.findByRole('dialog', { name: '취소 요청을 승인할까요?' })
    await user.click(within(dialog).getByRole('button', { name: '승인' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('주문 정보를 확인하지')
  })

  it('처리가 끝나면 창을 닫는다', async () => {
    const user = userEvent.setup()
    renderClaims({ defaultModal: { type: 'approve', refundId: 31 } })
    const dialog = await screen.findByRole('dialog', { name: '취소 요청을 승인할까요?' })
    await user.click(within(dialog).getByRole('button', { name: '승인' }))
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '취소 요청을 승인할까요?' }),
      ).not.toBeInTheDocument(),
    )
  })
})
