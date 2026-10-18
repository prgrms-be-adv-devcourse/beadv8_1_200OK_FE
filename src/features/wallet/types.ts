// TODO(api): 📝 GET /wallets/me/transactions. 필드는 시안 기준 임시.

export enum WalletTxType {
  CHARGE = 'CHARGE',
  PAYMENT = 'PAYMENT',
  PAYMENT_CANCEL = 'PAYMENT_CANCEL',
  REFUND = 'REFUND',
}

export type WalletTransaction = {
  transactionId: number
  type: WalletTxType
  description: string
  /** 들어오면 +, 나가면 − */
  amount: number
  balanceAfter: number
  occurredAt: string
}

export type WalletPeriod = '1m' | '3m' | 'custom'
