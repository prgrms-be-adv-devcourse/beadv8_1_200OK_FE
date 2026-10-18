import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { render } from '@/test/render'
import { sellerApplications } from '../fixtures'
import type { AdminSellerApplication } from '../types'
import { AdminSellerDetailView, type AdminSellerDetailViewProps } from './AdminSellerDetailView'
import { AdminSellersView } from './AdminSellersView'

const S = SellerApplicationStatus
const appOf = (status: SellerApplicationStatus) =>
  sellerApplications.find((a) => a.status === status) as AdminSellerApplication

describe('AdminSellersView', () => {
  const counts = { APPLIED: 3, UNDER_REVIEW: 1, APPROVED: 5, REJECTED: 1, SUSPENDED: 1 }

  it('탭에 개수를 보여 주고 신청마다 상세 주소로 간다', () => {
    render(
      <MemoryRouter>
        <AdminSellersView
          status="success"
          tab={S.APPLIED}
          onTabChange={() => {}}
          counts={counts}
          applications={sellerApplications.filter((a) => a.status === S.APPLIED)}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('tab', { name: '심사 대기 3' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    const table = screen.getByRole('table', { name: '신청 목록' })
    expect(within(table).getAllByText('신청 완료')).toHaveLength(3)
    expect(within(table).getByRole('link', { name: '영암 무화과정원 신청 보기' })).toHaveAttribute(
      'href',
      '/admin/sellers/13',
    )
  })

  it('비어 있는 탭은 탭 이름으로 안내한다', () => {
    render(
      <MemoryRouter>
        <AdminSellersView
          status="success"
          tab={S.SUSPENDED}
          onTabChange={() => {}}
          counts={{ ...counts, SUSPENDED: 0 }}
          applications={[]}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('권한 정지 판매자가 없어요')).toBeInTheDocument()
  })
})

function renderDetail(props: Partial<AdminSellerDetailViewProps>) {
  const handlers = {
    onStartReview: vi.fn(),
    onApprove: vi.fn(),
    onReject: vi.fn(),
    onSuspend: vi.fn(),
  }
  render(
    <MemoryRouter>
      <AdminSellerDetailView status="success" application={null} {...handlers} {...props} />
    </MemoryRouter>,
  )
  return { ...handlers, user: userEvent.setup() }
}

describe('AdminSellerDetailView', () => {
  it('심사 중이면 승인 · 반려를 고를 수 있다', async () => {
    const { user, onApprove } = renderDetail({ application: appOf(S.UNDER_REVIEW) })
    await user.click(screen.getByRole('button', { name: '승인' }))
    expect(onApprove).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '반려' })).toBeEnabled()
  })

  it('반려는 사유가 있어야 하고, 비었으면 입력으로 focus한다', async () => {
    const { user, onReject } = renderDetail({ application: appOf(S.UNDER_REVIEW) })
    await user.click(screen.getByRole('button', { name: '반려' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: '반려' }))
    const input = within(dialog).getByLabelText('사유')
    expect(within(dialog).getByText('사유를 입력해 주세요')).toBeInTheDocument()
    expect(input).toHaveFocus()
    expect(onReject).not.toHaveBeenCalled()

    await user.type(input, '  통신판매업 신고번호를 확인할 수 없어요 ')
    await user.click(within(dialog).getByRole('button', { name: '반려' }))
    expect(onReject).toHaveBeenCalledWith('통신판매업 신고번호를 확인할 수 없어요')
  })

  it('권한 회수는 진행 중 주문이 일괄 취소된다고 먼저 알린다', async () => {
    renderDetail({ application: appOf(S.APPROVED), defaultModal: 'suspend' })
    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByText('진행 중인 주문 5건이 일괄 취소되고 구매자에게 환불돼요'),
    ).toBeInTheDocument()
  })

  it('반려된 신청은 사유와 처리 이력을 보여 준다', () => {
    renderDetail({ application: appOf(S.REJECTED) })
    expect(screen.getByText('반려됨')).toBeInTheDocument()
    expect(
      screen.getByText('정민호 · 반려 — 통신판매업 신고번호를 확인할 수 없어요'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '승인' })).not.toBeInTheDocument()
  })
})
