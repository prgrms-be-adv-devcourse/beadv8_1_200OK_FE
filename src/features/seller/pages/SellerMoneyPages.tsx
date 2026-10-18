import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { WithdrawalState } from '@/shared/lib/withdrawalState'
import { showToast } from '@/shared/ui'
import {
  withdrawals as initialWithdrawals,
  payoutDetails,
  payoutItems,
  payoutOutlook,
  payouts,
  sellerWallet,
  sellerWalletTxs,
} from '../fixtures'
import { SellerPayoutsView } from '../views/SellerPayoutsView'
import { SellerWalletView, type WithdrawResult } from '../views/SellerWalletView'

// S-08 정산 내역 · 지갑·출금 라우트 (판매자 센터 청크). 1단계: fixtures를 화면 안에서만 바꾼다.
// TODO(api): 2-6 정산 GET /payouts?payeeId&from&to(최근 1년, 최대 범위), GET /payouts/{id}, GET /payouts/{id}/items (✅ 임시 헤더).
//   지갑 GET /wallets/seller, .../transactions, 출금 POST .../withdrawals는 📝, 계좌 변경은 ❌

const monthOf = (value: string) => value.slice(0, 7)

/** /seller/payouts 와 /seller/payouts/:payoutId 가 같이 쓴다. 상세는 목록 위 모달 */
export function SellerPayoutsPage() {
  const { payoutId } = useParams()
  const navigate = useNavigate()
  const openId = payoutId === undefined ? null : Number(payoutId)
  const latest = payouts[0]?.createdAt ?? new Date().toISOString()
  const thisMonth = payouts.filter((p) => monthOf(p.createdAt) === monthOf(latest))
  const detail = payoutDetails.find((d) => d.payoutId === openId) ?? null

  return (
    <SellerPayoutsView
      status="success"
      payouts={payouts}
      outlook={payoutOutlook}
      monthSummary={{
        month: latest,
        amount: thisMonth.reduce((sum, p) => sum + p.amount, 0),
        count: thisMonth.length,
      }}
      detail={
        openId === null
          ? null
          : {
              onClose: () => navigate('/seller/payouts'),
              status: detail ? 'success' : 'notFound',
              payout: detail,
              items: payoutItems[openId] ?? [],
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
