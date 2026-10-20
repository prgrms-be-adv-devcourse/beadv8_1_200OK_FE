import dayjs from 'dayjs'
import { useState } from 'react'
import type { LedgerType } from '@/shared/api/types'
import { toServerDate } from '@/shared/lib/dateRange'
import { toWalletTransaction } from '../ledger'
import { useLedgers, useWalletBalance, walletErrorMessage } from '../queries'
import type { WalletPeriod } from '../types'
import { WalletHistoryView } from '../views/WalletHistoryView'

// B-13 지갑 이용 내역 라우트 /me/wallet. ✅ GET /wallets/me/balance + GET /wallets/me/ledgers?from&to&type(기간은 yyyy-MM-dd, 둘 다 포함).
// 1개월·3개월은 오늘까지, 직접 선택은 고른 날짜를 보낸다. 시작일이 종료일보다 늦으면 요청하지 않는다(화면이 알린다).

function rangeOf(
  period: WalletPeriod,
  [from, to]: [Date | null, Date | null],
): { from?: string; to?: string } {
  if (period === 'custom') {
    return {
      ...(from ? { from: toServerDate(from) } : {}),
      ...(to ? { to: toServerDate(to) } : {}),
    }
  }
  const today = dayjs()
  return {
    from: toServerDate(today.subtract(period === '1m' ? 1 : 3, 'month')),
    to: toServerDate(today),
  }
}

export function WalletHistoryPage() {
  const [period, setPeriod] = useState<WalletPeriod>('1m')
  const [range, setRange] = useState<[Date | null, Date | null]>([null, null])
  const [type, setType] = useState<LedgerType | 'ALL'>('ALL')

  const dates = rangeOf(period, range)
  const rangeInvalid = Boolean(dates.from && dates.to && dates.from > dates.to)
  const balance = useWalletBalance()
  const ledgers = useLedgers({ ...dates, ...(type !== 'ALL' ? { type } : {}) }, !rangeInvalid)

  const transactions =
    ledgers.data?.pages.flatMap((page, pageIndex) =>
      page.content.map((entry, index) => toWalletTransaction(entry, `${pageIndex}-${index}`)),
    ) ?? []

  return (
    <WalletHistoryView
      status={
        ledgers.isError || balance.isError
          ? 'error'
          : ledgers.isPending || balance.isPending
            ? 'pending'
            : 'success'
      }
      balance={balance.data?.balance ?? 0}
      transactions={transactions}
      period={period}
      onPeriodChange={setPeriod}
      range={range}
      onRangeChange={setRange}
      type={type}
      onTypeChange={setType}
      hasMore={ledgers.hasNextPage}
      loadingMore={ledgers.isFetchingNextPage}
      onLoadMore={() => void ledgers.fetchNextPage()}
      errorMessage={walletErrorMessage(ledgers.error ?? balance.error)}
      onRetry={() => {
        void balance.refetch()
        void ledgers.refetch()
      }}
    />
  )
}
