import { useState } from 'react'
import { BALANCE_DEFAULT, walletTransactions } from '../fixtures'
import type { WalletPeriod, WalletTxType } from '../types'
import { WalletHistoryView } from '../views/WalletHistoryView'

// B-13 지갑 이용 내역 라우트 /me/wallet. 1단계: fixtures를 기간·유형으로 거른다.
// TODO(api): 📝 GET /wallets/me/transactions (기간·유형·페이지 파라미터)

const DAY = 24 * 60 * 60 * 1000

function inPeriod(at: string, period: WalletPeriod, [from, to]: [Date | null, Date | null]) {
  const time = new Date(at).getTime()
  if (period === 'custom') {
    if (from && time < from.getTime()) return false
    if (to && time > to.getTime() + DAY - 1) return false
    return true
  }
  const months = period === '1m' ? 1 : 3
  const start = new Date()
  start.setMonth(start.getMonth() - months)
  return time >= start.getTime()
}

export function WalletHistoryPage() {
  const [period, setPeriod] = useState<WalletPeriod>('1m')
  const [range, setRange] = useState<[Date | null, Date | null]>([null, null])
  const [type, setType] = useState<WalletTxType | 'ALL'>('ALL')

  const rows = walletTransactions.filter(
    (tx) => inPeriod(tx.occurredAt, period, range) && (type === 'ALL' || tx.type === type),
  )

  return (
    <WalletHistoryView
      status="success"
      balance={BALANCE_DEFAULT}
      transactions={rows}
      period={period}
      onPeriodChange={setPeriod}
      range={range}
      onRangeChange={setRange}
      type={type}
      onTypeChange={setType}
    />
  )
}
