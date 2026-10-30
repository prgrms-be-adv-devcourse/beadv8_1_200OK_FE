import type { LedgerType } from '@/shared/api/types'

// 이용 내역 유형은 서버 LedgerType(CHARGE·PAYMENT) 그대로다. 결제 취소·환불 입금은 서버에 없어 뺐다.
export { LedgerType as WalletTxType } from '@/shared/api/types'

/** 화면 한 줄. 서버 LedgerEntry(amount 양수)를 ledger.ts에서 바꾼다 */
export type WalletTransaction = {
  key: string
  type: LedgerType
  description: string
  /** 들어오면 +, 나가면 − */
  amount: number
  balanceAfter: number
  occurredAt: string
  /** 결제일 때 주문 상세로 가는 주문 번호 */
  orderId: number | null
}

export type WalletPeriod = '1m' | '3m' | 'custom'
