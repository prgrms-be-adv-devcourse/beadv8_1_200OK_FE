import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { PayoutEventType } from '@/shared/api/types'
import { MINUS } from '@/shared/lib/format'
import { render } from '@/test/render'
import { adminPayouts, defaultPayoutFilter, filterPayouts, sampleAdjustTarget } from '../fixtures'
import type { AdjustLookup } from '../types'
import { AdminPayoutsView, type AdminPayoutsViewProps } from './AdminPayoutsView'

const visible = filterPayouts(adminPayouts, defaultPayoutFilter)
const found: AdjustLookup = { status: 'found', target: sampleAdjustTarget }

function renderPayouts(
  props: Partial<AdminPayoutsViewProps> = {},
  lookup: AdjustLookup = { status: 'idle' },
) {
  const handlers = {
    onRun: vi.fn(),
    onRunSkipWait: vi.fn(),
    onRunSingle: vi.fn(),
    onAdjust: vi.fn(),
    onFilterChange: vi.fn(),
  }
  render(
    <MemoryRouter>
      <AdminPayoutsView
        run={{
          pendingCandidateCount: 3,
          result: null,
          onRun: handlers.onRun,
          onRunSkipWait: handlers.onRunSkipWait,
        }}
        single={{ result: null, onRun: handlers.onRunSingle }}
        adjustment={{
          lookup,
          onOrderItemChange: () => {},
          onSubmit: handlers.onAdjust,
          result: null,
          logs: [],
        }}
        status="success"
        payouts={visible}
        filter={defaultPayoutFilter}
        onFilterChange={handlers.onFilterChange}
        totalElements={visible.length}
        detail={null}
        {...props}
      />
    </MemoryRouter>,
  )
  return { ...handlers, user: userEvent.setup() }
}

describe('AdminPayoutsView', () => {
  it('전체 정산에 받는 사람(플랫폼 수수료 · 판매자 회원 번호)과 상세 주소를 보여 준다', () => {
    renderPayouts()
    const table = screen.getByRole('table', { name: '정산 목록' })
    expect(within(table).getAllByText('플랫폼 수수료')).toHaveLength(2)
    expect(
      within(table).getByRole('link', { name: '정산 1021 판매자 7 상세 보기' }),
    ).toHaveAttribute('href', '/admin/payouts/1021')
    expect(screen.getByText(`정산 ${visible.length}건`, { exact: false })).toBeInTheDocument()
    expect(screen.getByText('정산 대기 후보 3건')).toBeInTheDocument()
  })

  it('정산 실행과 대기 건너뛰기는 각각 확인을 거친다', async () => {
    const { user, onRun, onRunSkipWait } = renderPayouts()
    await user.click(screen.getByRole('button', { name: '정산 지금 실행' }))
    let dialog = await screen.findByRole('dialog')
    expect(onRun).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: '정산 실행' }))
    expect(onRun).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '대기 건너뛰고 실행 (테스트용)' }))
    dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/실제 정산 기록이 남아요/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '건너뛰고 실행' }))
    expect(onRunSkipWait).toHaveBeenCalled()
  })

  it('실행 결과는 실행 번호와 배치 상태로 보여 준다', () => {
    renderPayouts({
      run: {
        result: { kind: 'ok', executionId: 101, status: 'COMPLETED', skipWait: true },
        onRun: () => {},
        onRunSkipWait: () => {},
      },
    })
    expect(
      screen.getByText('정산 배치를 실행했어요 · 실행 번호 101 · 상태 COMPLETED'),
    ).toBeInTheDocument()
    expect(screen.getByText('대기 기간을 건너뛰고 정산했어요')).toBeInTheDocument()
  })

  it('판매자 지정은 회원 번호를 입력해야 목록을 조회한다', async () => {
    const { user, onFilterChange } = renderPayouts({
      filter: { ...defaultPayoutFilter, payee: 'seller', payeeId: '' },
    })
    expect(screen.queryByRole('table', { name: '정산 목록' })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('판매자 회원 번호'), '7')
    expect(onFilterChange).toHaveBeenLastCalledWith({
      ...defaultPayoutFilter,
      payee: 'seller',
      payeeId: '7',
    })
  })

  it('1건 정산 오류는 서버 문구를 입력 아래에 보여 준다', () => {
    renderPayouts({
      single: {
        defaultOrderItemId: '1210',
        result: { kind: 'error', message: '아직 지원하지 않는 기능이에요' },
        onRun: () => {},
      },
    })
    const card = screen.getByRole('region', { name: '주문 상품 번호로 1건 정산' })
    const input = within(card).getByLabelText('주문 상품 번호')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(within(card).getByText('아직 지원하지 않는 기능이에요')).toBeInTheDocument()
  })

  it('조정 후 0원보다 적어지면 막고 뺄 수 있는 금액을 알려 준다 (금액 조회가 있을 때)', async () => {
    const { user, onAdjust } = renderPayouts({}, found)
    const form = screen.getByRole('heading', { name: '정산 조정' }).closest('form') as HTMLElement
    await user.type(within(form).getByLabelText('주문 상품 번호'), '1210')
    await user.type(within(form).getByLabelText('조정 금액'), '-30000')
    await user.type(within(form).getByLabelText('사유'), '구매확정 후 환불 회수')
    expect(within(form).getByLabelText('조정 금액')).toHaveValue('-30,000')
    await user.click(within(form).getByRole('button', { name: '조정하기' }))
    expect(
      await within(form).findByText(
        `조정 후 금액이 0원보다 적어져요. 이 주문 상품은 ${MINUS}26,183원까지 뺄 수 있어요`,
      ),
    ).toBeInTheDocument()
    expect(within(form).getByLabelText('조정 금액')).toHaveFocus()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onAdjust).not.toHaveBeenCalled()
  })

  it('사유가 없으면 알려 준다', async () => {
    const { user } = renderPayouts()
    const form = screen.getByRole('heading', { name: '정산 조정' }).closest('form') as HTMLElement
    await user.type(within(form).getByLabelText('주문 상품 번호'), '9999')
    await user.type(within(form).getByLabelText('조정 금액'), '-1000')
    await user.click(within(form).getByRole('button', { name: '조정하기' }))
    expect(
      await within(form).findByText('사유를 입력해 주세요. 나중에 정산 기록을 볼 때 근거가 돼요'),
    ).toBeInTheDocument()
  })

  it('맞게 입력하면 확인 모달에서 항목 종류와 함께 저장한다', async () => {
    const { user, onAdjust } = renderPayouts()
    const form = screen.getByRole('heading', { name: '정산 조정' }).closest('form') as HTMLElement
    await user.type(within(form).getByLabelText('주문 상품 번호'), '1210')
    await user.selectOptions(within(form).getByLabelText('항목'), PayoutEventType.SALE_SHIPPING_FEE)
    await user.type(within(form).getByLabelText('조정 금액'), '3000')
    await user.type(within(form).getByLabelText('사유'), '배송비 누락 보정')
    await user.click(within(form).getByRole('button', { name: '조정하기' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('상품판매 배송비')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '조정 저장' }))
    expect(onAdjust).toHaveBeenCalledWith({
      orderItemId: 1210,
      eventType: PayoutEventType.SALE_SHIPPING_FEE,
      amount: 3000,
      reason: '배송비 누락 보정',
    })
  })

  it('조정 서버 오류(501 등)는 패널 위에 보여 준다', () => {
    renderPayouts({
      adjustment: {
        lookup: { status: 'idle' },
        onOrderItemChange: () => {},
        onSubmit: () => {},
        result: null,
        logs: [],
        errorMessage: '아직 지원하지 않는 기능이에요. 서버에서 준비되면 쓸 수 있어요',
      },
    })
    expect(
      screen.getByText('아직 지원하지 않는 기능이에요. 서버에서 준비되면 쓸 수 있어요'),
    ).toBeInTheDocument()
  })

  it('기간이 거꾸로면 목록 대신 오류를 보여 준다', () => {
    renderPayouts({ filter: { ...defaultPayoutFilter, from: '2026-10-19', to: '2026-10-17' } })
    expect(screen.getByText('시작일이 종료일보다 늦어요')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: '정산 목록' })).not.toBeInTheDocument()
  })
})
