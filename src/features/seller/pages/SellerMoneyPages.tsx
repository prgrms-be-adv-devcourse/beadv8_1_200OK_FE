import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { WithdrawalState } from '@/shared/lib/withdrawalState'
import { showToast } from '@/shared/ui'
import { withdrawals as initialWithdrawals, sellerWallet, sellerWalletTxs } from '../fixtures'
import { useMemberId, useMonthPayouts, usePayout, usePayoutItems, usePayouts } from '../queries'
import { SellerPayoutsView } from '../views/SellerPayoutsView'
import { SellerWalletView, type WithdrawResult } from '../views/SellerWalletView'

// S-08 정산 내역 · 지갑·출금 라우트 (판매자 센터 청크).
// 정산: ✅ GET /payouts?payeeId=본인&from&to(최근 1년, 서버 최대 범위), GET /payouts/{id}, GET /payouts/{id}/items (임시 헤더).
// TODO(api): 정산 예정 금액·다음 정산 예정일 API 없음(❌) → 요약 두 칸은 비워 둔다.
// TODO(api): 지갑 GET /wallets/seller, .../transactions, 출금 POST .../withdrawals는 📝, 계좌 변경은 ❌ → fixtures

/** /seller/payouts?page= 와 /seller/payouts/:payoutId 가 같이 쓴다. 상세는 목록 위 모달 */
export function SellerPayoutsPage() {
  const { payoutId } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const memberId = useMemberId()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const list = usePayouts(memberId, page - 1)
  const month = useMonthPayouts(memberId)
  const openId = payoutId === undefined ? null : Number(payoutId)
  const validId = openId !== null && Number.isInteger(openId) ? openId : null
  const detail = usePayout(validId)
  const items = usePayoutItems(validId)
  const search = params.toString()

  // 403(내 정산이 아님)·404는 같은 ‘찾을 수 없어요’로
  const detailStatus =
    validId === null || detail.error?.status === 403 || detail.error?.status === 404
      ? 'notFound'
      : detail.isError || items.isError
        ? 'error'
        : detail.isPending || items.isPending
          ? 'pending'
          : 'success'

  return (
    <SellerPayoutsView
      status={list.isError || month.isError ? 'error' : list.isPending ? 'pending' : 'success'}
      payouts={list.data?.content ?? []}
      outlook={null}
      monthSummary={month.data ?? { month: new Date().toISOString(), amount: 0, count: 0 }}
      page={page}
      totalPages={list.data?.totalPages ?? 1}
      onPageChange={(next) => setParams(next === 1 ? {} : { page: String(next) })}
      onRetry={() => {
        void list.refetch()
        void month.refetch()
      }}
      errorMessage={(list.error ?? month.error)?.detail}
      detail={
        openId === null
          ? null
          : {
              onClose: () => navigate({ pathname: '/seller/payouts', search }),
              status: detailStatus,
              payout: detail.data ?? null,
              items: items.data?.pages.flatMap((p) => p.content) ?? [],
              hasMoreItems: items.hasNextPage,
              loadingMoreItems: items.isFetchingNextPage,
              onLoadMoreItems: () => void items.fetchNextPage(),
              onRetry: () => {
                void detail.refetch()
                void items.refetch()
              },
            }
      }
    />
  )
}

export function SellerWalletPage() {
  const [wallet, setWallet] = useState(sellerWallet)
  const [withdrawals, setWithdrawals] = useState(initialWithdrawals)
  const [result, setResult] = useState<WithdrawResult | null>(null)

  return (
    <SellerWalletView
      status="success"
      wallet={wallet}
      withdrawals={withdrawals}
      transactions={sellerWalletTxs}
      withdrawResult={result}
      onWithdraw={(amount) => {
        if (amount > wallet.withdrawableAmount) {
          setResult({ kind: 'insufficient' })
          return
        }
        setWallet((w) => ({ ...w, withdrawableAmount: w.withdrawableAmount - amount }))
        setWithdrawals((list) => [
          {
            withdrawalId: Date.now(),
            amount,
            state: WithdrawalState.REQUESTED,
            requestedAt: new Date().toISOString(),
            completedAt: null,
            failReason: null,
          },
          ...list,
        ])
        setResult({ kind: 'success', amount })
        showToast({ message: '출금을 신청했어요' })
      }}
      onRequestAccountChange={() => {
        setWallet((w) => ({ ...w, accountChangePending: true }))
        showToast({ message: '계좌 변경 요청을 보냈어요' })
      }}
    />
  )
}
