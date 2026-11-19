import { type LedgerEntry, LedgerType } from '@/shared/api/types'
import type { WalletTransaction } from './types'

// 서버 이용 내역 한 줄(amount 늘 양수) → 화면 한 줄(부호, 설명 문구)
// 충전·환불 반환은 +, 결제·환불 되돌리기는 −. 설명은 주문 요약이 있으면 그것, 없으면 주문 번호로 만든다.

const outgoing: ReadonlySet<LedgerType> = new Set([LedgerType.PAYMENT, LedgerType.REFUND_REVERT])

const orderAction: Record<Exclude<LedgerType, LedgerType.CHARGE>, string> = {
  [LedgerType.PAYMENT]: '결제',
  [LedgerType.REFUND]: '환불',
  [LedgerType.REFUND_REVERT]: '환불 취소',
}

function describe(entry: LedgerEntry): string {
  if (entry.type === LedgerType.CHARGE) return '예치금 충전'
  if (entry.orderSummary) return entry.orderSummary
  const action = orderAction[entry.type]
  return entry.orderId !== null ? `주문 ${entry.orderId} ${action}` : action
}

export function toWalletTransaction(entry: LedgerEntry, key: string): WalletTransaction {
  return {
    key,
    type: entry.type,
    description: describe(entry),
    amount: outgoing.has(entry.type) ? -entry.amount : entry.amount,
    balanceAfter: entry.balanceAfter,
    occurredAt: entry.occurredAt,
    orderId: entry.orderId,
  }
}
