import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { ChargeStatus } from '@/shared/api/types'
import { safeReturnTo } from '@/shared/lib/returnTo'
import {
  useChargeStatus,
  useConfirmCharge,
  useFailCharge,
  useWalletBalance,
  walletErrorMessage,
  walletKeys,
} from '../queries'
import { ChargeResultView } from '../views/ChargeResultView'

// 토스페이먼츠 복귀 라우트.
// 성공 /wallet/charge/success?paymentType&amount&orderId(=chargeNo)&paymentKey(&returnTo) → ✅ POST /wallets/me/charges/confirm.
//   COMPLETED면 잔액을 다시 받아 성공, IN_PROGRESS면 ✅ GET /wallets/me/charges/{chargeNo}를 몇 번 다시 확인, FAILED·승인 오류는 실패.
// 실패 /wallet/charge/fail?code&message&orderId(&returnTo) → ✅ POST /wallets/me/charges/fail(결제 전 건을 실패로) 뒤 토스 문구를 보여 준다.

function useReturnTo() {
  const [params] = useSearchParams()
  const value = params.get('returnTo')
  return { params, returnTo: value ? safeReturnTo(value) : null }
}

/** 테스트에서 간격을 줄이려고 props로 받는다 */
export type ChargeSuccessPageProps = { pollIntervalMs?: number; maxPolls?: number }

export function ChargeSuccessPage({
  pollIntervalMs = 2000,
  maxPolls = 15,
}: ChargeSuccessPageProps) {
  const { params, returnTo } = useReturnTo()
  const queryClient = useQueryClient()
  const chargeNo = params.get('orderId') || null
  const paymentKey = params.get('paymentKey') || null
  const amountParam = Number(params.get('amount'))
  const amount = Number.isInteger(amountParam) && amountParam > 0 ? amountParam : null
  const valid = chargeNo !== null && paymentKey !== null && amount !== null

  const confirm = useConfirmCharge(chargeNo, paymentKey, amount)
  const inProgress = confirm.data?.status === ChargeStatus.IN_PROGRESS
  const poll = useChargeStatus(chargeNo, {
    enabled: inProgress,
    intervalMs: pollIntervalMs,
    maxPolls,
  })
  const result = inProgress ? (poll.data ?? confirm.data) : confirm.data
  const completed = result?.status === ChargeStatus.COMPLETED
  const balance = useWalletBalance(completed)

  // 잔액이 바뀌었으니 다른 화면의 잔액·이용 내역도 다시 받게 한다
  useEffect(() => {
    if (!completed) return
    void queryClient.invalidateQueries({ queryKey: walletKeys.balance() })
    void queryClient.invalidateQueries({ queryKey: walletKeys.ledgers() })
  }, [completed, queryClient])

  if (!valid) {
    return (
      <ChargeResultView
        status="failed"
        returnTo={returnTo}
        retryPath={retryPathOf(returnTo)}
        message="결제 정보를 확인하지 못했어요. 예치금은 그대로예요. 다시 충전해 주세요."
      />
    )
  }
  if (confirm.isPending) {
    return (
      <ChargeResultView
        status="pending"
        amount={amount}
        returnTo={returnTo}
        message="결제를 승인하고 있어요. 잠시만 기다려 주세요."
      />
    )
  }
  if (confirm.isError) {
    return (
      <ChargeResultView
        status="failed"
        amount={amount}
        returnTo={returnTo}
        retryPath={retryPathOf(returnTo)}
        message={`${walletErrorMessage(confirm.error)} 예치금은 그대로예요.`}
      />
    )
  }
  if (completed) {
    return (
      <ChargeResultView
        status="success"
        amount={result?.amount ?? amount}
        balanceAfter={balance.data?.balance}
        returnTo={returnTo}
      />
    )
  }
  if (result?.status === ChargeStatus.FAILED) {
    return (
      <ChargeResultView
        status="failed"
        amount={amount}
        returnTo={returnTo}
        retryPath={retryPathOf(returnTo)}
      />
    )
  }
  // IN_PROGRESS(확인 중) 또는 PENDING: 몇 번 다시 확인한 뒤에도 안 바뀌면 그대로 둔다
  return <ChargeResultView status="pending" amount={amount} returnTo={returnTo} />
}

function retryPathOf(returnTo: string | null) {
  return returnTo ? `/wallet/charge?returnTo=${encodeURIComponent(returnTo)}` : '/wallet/charge'
}

export function ChargeFailPage() {
  const { params, returnTo } = useReturnTo()
  const chargeNo = params.get('orderId') || null
  const code = params.get('code') || null
  const message = params.get('message') || null
  // 결제 전 충전 건을 실패로 바꾼다. 응답은 화면에 쓰지 않는다(이미 승인된 건이면 서버가 그대로 둔다)
  useFailCharge(chargeNo, code, message)

  return (
    <ChargeResultView
      status="failed"
      returnTo={returnTo}
      retryPath={retryPathOf(returnTo)}
      message={message ? `${message} 예치금은 그대로예요.` : undefined}
    />
  )
}
