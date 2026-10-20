import { type LedgerEntry, LedgerType } from '@/shared/api/types'
import type { WalletTransaction } from './types'

// 서버 이용 내역 한 줄(amount 늘 양수) → 화면 한 줄(충전 +, 결제 −, 설명 문구)

export function toWalletTransaction(entry: LedgerEntry, key: string): WalletTransaction {
  const payment = entry.type === LedgerType.PAYMENT
  return {
    key,
    type: entry.type,
    description: !payment
      ? '예치금 충전'
      : entry.orderId !== null
        ? `주문 ${entry.orderId} 결제`
        : '결제',
    amount: payment ? -entry.amount : entry.amount,
    balanceAfter: entry.balanceAfter,
    occurredAt: entry.occurredAt,
    orderId: entry.orderId,
  }
}
