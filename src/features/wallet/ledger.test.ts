import { type LedgerEntry, LedgerType } from '@/shared/api/types'
import { toWalletTransaction } from './ledger'

const entry = (overrides: Partial<LedgerEntry>): LedgerEntry => ({
  occurredAt: '2026-10-11T12:00:00',
  type: LedgerType.PAYMENT,
  orderId: 1001,
  orderSummary: '사과 외 3건',
  amount: 3000,
  balanceAfter: 3000,
  ...overrides,
})

describe('toWalletTransaction', () => {
  it.each([
    [LedgerType.CHARGE, 3000],
    [LedgerType.PAYMENT, -3000],
    [LedgerType.REFUND, 3000],
    [LedgerType.REFUND_REVERT, -3000],
  ])('%s는 금액 부호를 %d로 바꾼다', (type, amount) => {
    expect(toWalletTransaction(entry({ type }), 'k').amount).toBe(amount)
  })

  it('주문 요약이 있으면 내용으로 쓰고 주문 번호를 남긴다', () => {
    const tx = toWalletTransaction(entry({ type: LedgerType.REFUND }), 'k')
    expect(tx).toEqual({
      key: 'k',
      type: LedgerType.REFUND,
      description: '사과 외 3건',
      amount: 3000,
      balanceAfter: 3000,
      occurredAt: '2026-10-11T12:00:00',
      orderId: 1001,
    })
  })

  it('충전은 예치금 충전이고 주문 번호가 없다', () => {
    const tx = toWalletTransaction(
      entry({ type: LedgerType.CHARGE, orderId: null, orderSummary: null }),
      'k',
    )
    expect(tx.description).toBe('예치금 충전')
    expect(tx.orderId).toBeNull()
  })

  it.each([
    [LedgerType.PAYMENT, '주문 1001 결제'],
    [LedgerType.REFUND, '주문 1001 환불'],
    [LedgerType.REFUND_REVERT, '주문 1001 환불 취소'],
  ])('%s에 주문 요약이 없으면 주문 번호로 "%s"', (type, description) => {
    expect(toWalletTransaction(entry({ type, orderSummary: null }), 'k').description).toBe(
      description,
    )
  })

  it.each([
    [LedgerType.PAYMENT, '결제'],
    [LedgerType.REFUND, '환불'],
    [LedgerType.REFUND_REVERT, '환불 취소'],
  ])('%s에 주문 요약·주문 번호가 모두 없으면 "%s"', (type, description) => {
    const tx = toWalletTransaction(entry({ type, orderId: null, orderSummary: null }), 'k')
    expect(tx.description).toBe(description)
    expect(tx.orderId).toBeNull()
  })
})
