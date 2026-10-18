import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { MINUS } from '@/shared/lib/format'
import { render } from '@/test/render'
import {
  adjustmentLogs,
  adjustTargetOf,
  adminPayouts,
  defaultPayoutFilter,
  filterPayouts,
  lastRun,
  payees,
} from '../fixtures'
import type { AdjustLookup } from '../types'
import { AdminPayoutsView, type AdminPayoutsViewProps } from './AdminPayoutsView'

const visible = filterPayouts(adminPayouts, defaultPayoutFilter)
const target = adjustTargetOf(1210, adjustmentLogs)
const found: AdjustLookup = target ? { status: 'found', target } : { status: 'idle' }

function renderPayouts(props: Partial<AdminPayoutsViewProps> = {}, lookup: AdjustLookup = found) {
  const handlers = { onRun: vi.fn(), onRunSingle: vi.fn(), onAdjust: vi.fn() }
  render(
    <MemoryRouter>
      <AdminPayoutsView
        run={{ lastRun, result: null, onRun: handlers.onRun }}
        single={{ result: null, onRun: handlers.onRunSingle }}
        adjustment={{
          lookup,
          onOrderItemChange: () => {},
          onSubmit: handlers.onAdjust,
          result: null,
          logs: adjustmentLogs,
        }}
        status="success"
        payouts={visible}
        payees={payees}
        filter={defaultPayoutFilter}
        onFilterChange={() => {}}
        totalElements={visible.length}
        detail={null}
        {...props}
      />
    </MemoryRouter>,
  )
  return { ...handlers, user: userEvent.setup() }
}

describe('AdminPayoutsView', () => {
  it('전체 정산에 받는 사람(플랫폼 수수료 포함)과 상세 주소를 보여 준다', () => {
    renderPayouts()
    const table = screen.getByRole('table', { name: '정산 목록' })
    expect(within(table).getAllByText('플랫폼 수수료')).toHaveLength(2)
    expect(
      within(table).getByRole('link', { name: '정산 1021 청송 햇살농원 상세 보기' }),
    ).toHaveAttribute('href', '/admin/payouts/1021')
    expect(screen.getByText(`정산 ${visible.length}건`, { exact: false })).toBeInTheDocument()
  })

  it('정산 실행은 확인을 거친다', async () => {
    const { user, onRun } = renderPayouts()
    await user.click(screen.getByRole('button', { name: '정산 지금 실행' }))
    const dialog = await screen.findByRole('dialog')
    expect(onRun).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: '정산 실행' }))
    expect(onRun).toHaveBeenCalled()
  })

  it('1건 정산 오류는 서버 문구를 입력 아래에 보여 준다', () => {
    renderPayouts({
      single: {
        defaultOrderItemId: '1210',
        result: { kind: 'error', message: '이미 정산된 주문 상품이에요' },
        onRun: () => {},
      },
    })
    const card = screen.getByRole('region', { name: '주문 상품 번호로 1건 정산' })
    const input = within(card).getByLabelText('주문 상품 번호')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(within(card).getByText('이미 정산된 주문 상품이에요')).toBeInTheDocument()
  })

  it('조정 후 0원보다 적어지면 막고 뺄 수 있는 금액을 알려 준다', async () => {
    const { user, onAdjust } = renderPayouts()
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

  it('없는 주문 상품 · 사유 없음을 함께 알려 준다', async () => {
    const { user } = renderPayouts({}, { status: 'notFound' })
    const form = screen.getByRole('heading', { name: '정산 조정' }).closest('form') as HTMLElement
    await user.type(within(form).getByLabelText('주문 상품 번호'), '9999')
    await user.type(within(form).getByLabelText('조정 금액'), '-1000')
    await user.click(within(form).getByRole('button', { name: '조정하기' }))
    expect(
      await within(form).findByText('없는 주문 상품 번호예요. 번호를 다시 확인해 주세요'),
    ).toBeInTheDocument()
    expect(
      within(form).getByText('사유를 입력해 주세요. 나중에 정산 기록을 볼 때 근거가 돼요'),
    ).toBeInTheDocument()
  })

  it('맞게 입력하면 확인 모달에서 저장한다', async () => {
    const { user, onAdjust } = renderPayouts()
    const form = screen.getByRole('heading', { name: '정산 조정' }).closest('form') as HTMLElement
    await user.type(within(form).getByLabelText('주문 상품 번호'), '1210')
    await user.type(within(form).getByLabelText('조정 금액'), '-10000')
    await user.type(within(form).getByLabelText('사유'), '구매확정 후 환불 회수')
    expect(within(form).getByText('26,183원 → 16,183원')).toBeInTheDocument()
    await user.click(within(form).getByRole('button', { name: '조정하기' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: '조정 저장' }))
    expect(onAdjust).toHaveBeenCalledWith({
      orderItemId: 1210,
      amount: -10000,
      reason: '구매확정 후 환불 회수',
    })
  })

  it('기간이 거꾸로면 목록 대신 오류를 보여 준다', () => {
    renderPayouts({ filter: { ...defaultPayoutFilter, from: '2026-10-19', to: '2026-10-17' } })
    expect(screen.getByText('시작일이 종료일보다 늦어요')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: '정산 목록' })).not.toBeInTheDocument()
  })
})
