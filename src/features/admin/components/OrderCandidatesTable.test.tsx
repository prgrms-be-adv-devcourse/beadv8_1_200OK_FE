import { screen, within } from '@testing-library/react'
import type { PayoutCandidate } from '@/shared/api/types'
import { PayoutAdjustmentCheckStatus } from '@/shared/lib/payoutAdjustmentCheck'
import { render } from '@/test/render'
import { orderCandidates } from '../fixtures'
import { OrderCandidatesTable } from './OrderCandidatesTable'

const base = orderCandidates.find((c) => c.candidateId === 42003) as PayoutCandidate

const adjustmentRow = (
  candidateId: number,
  adjustmentId: number,
  adjustmentCheckStatus: PayoutCandidate['adjustmentCheckStatus'],
): PayoutCandidate => ({
  ...base,
  candidateId,
  adjustment: { adjustmentId, adminId: 1, reason: `사유 ${adjustmentId}` },
  adjustmentCheckStatus,
})

function renderTable(candidates: PayoutCandidate[]) {
  render(<OrderCandidatesTable orderId={2002} status="success" candidates={candidates} />)
  return screen.getByRole('table', { name: '주문 2002 정산후보' })
}

/** 조정 번호로 그 줄을 찾는다 */
const rowOf = (table: HTMLElement, adjustmentId: number) =>
  within(table)
    .getByText(new RegExp(`^조정 ${adjustmentId} · 관리자`))
    .closest('tr') as HTMLElement

describe('OrderCandidatesTable 금액 검사 상태', () => {
  it('조정 줄마다 상태 3종을 색 · 아이콘 · 문구 배지로 보여 준다', () => {
    const table = renderTable([
      adjustmentRow(1, 1, PayoutAdjustmentCheckStatus.CONFIRMED),
      adjustmentRow(2, 2, PayoutAdjustmentCheckStatus.AWAITING_RESOLUTION),
      adjustmentRow(3, 3, PayoutAdjustmentCheckStatus.UNCHECKED),
    ])
    expect(within(rowOf(table, 1)).getByText('확인됨')).toBeInTheDocument()
    expect(within(rowOf(table, 2)).getByText('해결 대기')).toBeInTheDocument()
    expect(within(rowOf(table, 3)).getByText('검사 밖')).toBeInTheDocument()
    // 아이콘도 같이 그린다 (색만으로 전달하지 않음)
    for (const id of [1, 2, 3]) {
      expect(rowOf(table, id).querySelector('.mantine-Badge-section svg')).not.toBeNull()
    }
    const guides = screen.getByRole('list', { name: '조정의 금액 검사 상태' })
    expect(within(guides).getAllByRole('listitem')).toHaveLength(3)
  })

  it('null이거나 모르는 값이면 배지와 안내를 그리지 않는다', () => {
    const table = renderTable([
      { ...base, candidateId: 9, adjustment: null, adjustmentCheckStatus: null },
      adjustmentRow(1, 1, null),
      adjustmentRow(2, 2, 'SOMETHING_NEW' as PayoutAdjustmentCheckStatus),
    ])
    expect(within(table).getByText('원래 후보')).toBeInTheDocument()
    expect(within(table).queryByText('금액 검사')).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: '조정의 금액 검사 상태' })).not.toBeInTheDocument()
  })
})
