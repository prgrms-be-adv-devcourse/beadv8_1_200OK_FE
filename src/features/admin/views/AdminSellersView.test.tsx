import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { SellerApplicationAdminDetail } from '@/shared/api/types'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { render } from '@/test/render'
import { sellerApplicationSummaries, sellerApplications } from '../fixtures'
import { AdminSellerDetailView, type AdminSellerDetailViewProps } from './AdminSellerDetailView'
import { AdminSellersView } from './AdminSellersView'

const S = SellerApplicationStatus
const appOf = (status: SellerApplicationStatus) =>
  sellerApplications.find((a) => a.status === status) as SellerApplicationAdminDetail

describe('AdminSellersView', () => {
  const counts = { PENDING: 3, IN_REVIEW: 1, APPROVED: 5, REJECTED: 1 }

  it('탭에 개수를 보여 주고 신청마다 신청 번호 상세 주소로 간다', () => {
    render(
      <MemoryRouter>
        <AdminSellersView
          status="success"
          tab={S.PENDING}
          onTabChange={() => {}}
          counts={counts}
          applications={sellerApplicationSummaries.filter((a) => a.status === S.PENDING)}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('tab', { name: '심사 대기 3' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    const table = screen.getByRole('table', { name: '신청 목록' })
    expect(within(table).getAllByText('심사 대기')).toHaveLength(3)
    expect(within(table).getByRole('link', { name: '영암 무화과정원 신청 보기' })).toHaveAttribute(
      'href',
      '/admin/sellers/13',
    )
    expect(within(table).getByRole('columnheader', { name: '회원 번호' })).toBeInTheDocument()
    expect(within(table).queryByRole('columnheader', { name: '담당' })).not.toBeInTheDocument()
  })

  it('아직 못 받은 개수는 – 로, 비어 있는 탭은 탭 이름으로 안내한다', () => {
    render(
      <MemoryRouter>
        <AdminSellersView
          status="success"
          tab={S.REJECTED}
          onTabChange={() => {}}
          counts={{ ...counts, REJECTED: 0, APPROVED: undefined }}
          applications={[]}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('tab', { name: '승인 개수 불러오는 중' })).toBeInTheDocument()
    expect(screen.getByText('반려 판매자가 없어요')).toBeInTheDocument()
  })
})

function renderDetail(props: Partial<AdminSellerDetailViewProps>) {
  const handlers = {
    onStartReview: vi.fn(),
    onApprove: vi.fn(),
    onReject: vi.fn(),
  }
  render(
    <MemoryRouter>
      <AdminSellerDetailView status="success" application={null} {...handlers} {...props} />
    </MemoryRouter>,
  )
  return { ...handlers, user: userEvent.setup() }
}

describe('AdminSellerDetailView', () => {
  it('심사 대기면 심사 시작과 반려를 고를 수 있다', async () => {
    const { user, onStartReview } = renderDetail({ application: appOf(S.PENDING) })
    await user.click(screen.getByRole('button', { name: '심사 시작' }))
    expect(onStartReview).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '반려' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: '승인' })).not.toBeInTheDocument()
  })

  it('심사 중이면 승인 · 반려를 고를 수 있다', async () => {
    const { user, onApprove } = renderDetail({ application: appOf(S.IN_REVIEW) })
    await user.click(screen.getByRole('button', { name: '승인' }))
    expect(onApprove).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '반려' })).toBeEnabled()
  })

  it('반려는 사유가 있어야 하고, 비었으면 입력으로 focus한다', async () => {
    const { user, onReject } = renderDetail({ application: appOf(S.IN_REVIEW) })
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

  it('반려가 실패(reject)하면 모달을 열어 두고 서버 문구를 칸에 보여 준다', async () => {
    const onReject = vi.fn().mockRejectedValue(new Error('422'))
    renderDetail({
      application: appOf(S.IN_REVIEW),
      onReject,
      defaultModal: 'reject',
      rejectError: '거절 사유는 500자 이하여야 합니다.',
    })
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('거절 사유는 500자 이하여야 합니다.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('사유')).toHaveFocus()
  })

  it('승인된 신청은 승인 일시를 보여 주고 권한 회수 버튼이 없다', () => {
    renderDetail({ application: appOf(S.APPROVED) })
    expect(screen.getByText('승인됨')).toBeInTheDocument()
    expect(screen.getByText('판매자 권한 회수는 아직 지원하지 않아요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '권한 회수' })).not.toBeInTheDocument()
    expect(screen.getByText('관리자 1 · 승인')).toBeInTheDocument()
  })

  it('반려된 신청은 사유와 처리 이력을 보여 준다', () => {
    renderDetail({ application: appOf(S.REJECTED) })
    expect(screen.getByText('반려됨')).toBeInTheDocument()
    expect(
      screen.getByText('관리자 1 · 반려 — 통신판매업 신고번호를 확인할 수 없어요'),
    ).toBeInTheDocument()
    expect(screen.getByText('통신판매업 신고번호')).toBeInTheDocument()
    expect(screen.getByText('신청 회원 번호')).toBeInTheDocument()
    expect(screen.queryByText('정산 계좌')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '승인' })).not.toBeInTheDocument()
  })
})
