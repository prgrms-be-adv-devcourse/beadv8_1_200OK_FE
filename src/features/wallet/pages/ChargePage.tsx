import { useState, useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router'
import { isApiError } from '@/shared/api/ApiError'
import { getAuthSession, subscribeAuth } from '@/shared/api/authToken'
import { pgClientKey } from '@/shared/lib/env'
import { safeReturnTo } from '@/shared/lib/returnTo'
import { QueryState } from '@/shared/ui'
import { failCharge } from '../api'
import {
  termsErrorMessage,
  useAgreeWalletTerms,
  useRequestCharge,
  useWalletBalance,
  useWalletTerms,
  walletErrorMessage,
} from '../queries'
import { openTossCardPayment, tossCustomerKey, tossErrorOf } from '../toss'
import { ChargeResultView } from '../views/ChargeResultView'
import { ChargeView, PG_UNAVAILABLE_MESSAGE } from '../views/ChargeView'

// B-05 예치금 충전 라우트 /wallet/charge?shortfall&returnTo.
// 잔액·한도는 ✅ GET /wallets/me/balance. 약관은 GET /wallets/me/terms로 받고, 동의 안 한 필수 약관이 있으면 동의 시트 → POST .../agreements 뒤에 충전한다.
// 충전: ✅ POST /wallets/me/charges로 충전 번호를 받고 → 토스페이먼츠 결제창(orderId = chargeNo) → 성공 /wallet/charge/success, 실패 /wallet/charge/fail로 돌아온다.
// 성공·실패 주소에 returnTo를 실어 보내야 충전 뒤 주문서로 돌아올 수 있다. 결제창을 닫으면 결제 전 충전 건을 실패로 바꾼다(POST .../fail).
// 409(약관이 바뀜·한도 초과)는 약관·잔액을 다시 받아 서버 문구를 보여 준다. VITE_PG_CLIENT_KEY가 없으면 충전을 막는다.

export function ChargePage() {
  const [params] = useSearchParams()
  const shortfall = Number(params.get('shortfall')) || null
  const returnTo = params.get('returnTo') ? safeReturnTo(params.get('returnTo')) : null
  const memberId = useSyncExternalStore(subscribeAuth, getAuthSession, getAuthSession)?.memberId
  const balance = useWalletBalance()
  const terms = useWalletTerms()
  const agree = useAgreeWalletTerms()
  const requestCharge = useRequestCharge()
  const [failure, setFailure] = useState<string | null>(null)
  const [paying, setPaying] = useState<number | null>(null)

  const startCharge = async (amount: number) => {
    if (!pgClientKey || memberId === undefined) {
      setFailure(PG_UNAVAILABLE_MESSAGE)
      return
    }
    let chargeNo: string
    try {
      ;({ chargeNo } = await requestCharge.mutateAsync({ amount }))
    } catch (error) {
      if (isApiError(error) && error.status === 409) {
        // 약관이 바뀌었거나 다른 충전이 먼저 반영돼 한도를 넘었다 → 최신 약관·잔액으로 다시 그린다
        void terms.refetch()
        void balance.refetch()
      }
      setFailure(walletErrorMessage(error))
      return
    }

    setPaying(amount)
    const qs = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''
    try {
      await openTossCardPayment({
        clientKey: pgClientKey,
        customerKey: tossCustomerKey(memberId),
        amount,
        orderId: chargeNo,
        orderName: '예치금 충전',
        successUrl: `${window.location.origin}/wallet/charge/success${qs}`,
        failUrl: `${window.location.origin}/wallet/charge/fail${qs}`,
      })
    } catch (error) {
      // 결제창을 닫았거나(USER_CANCEL) 결제창을 열지 못했다. 결제 전 충전 건은 실패로 바꿔 둔다(실패해도 화면은 그대로)
      const { code, message } = tossErrorOf(error)
      setPaying(null)
      setFailure('결제창을 닫았어요. 예치금은 그대로예요')
      void failCharge({ chargeNo, code, ...(message ? { message } : {}) }).catch(() => undefined)
    }
  }

  if (paying !== null) return <ChargeResultView status="paying" amount={paying} />

  if (balance.isPending) {
    return <QueryState status="pending" loadingLabel="예치금을 불러오고 있어요" />
  }
  if (balance.isError) {
    return (
      <QueryState
        status="error"
        errorMessage={walletErrorMessage(balance.error)}
        onRetry={() => void balance.refetch()}
      />
    )
  }

  return (
    <ChargeView
      balance={balance.data.balance}
      maxBalance={balance.data.maxBalance}
      terms={terms.data ?? []}
      shortfall={shortfall}
      returnTo={returnTo}
      pgUnavailable={!pgClientKey}
      // 약관을 받기 전에는 동의 여부를 몰라 충전 버튼을 기다리게 한다
      submitting={terms.isPending || agree.isPending || requestCharge.isPending}
      errorMessage={failure ?? (terms.isError ? termsErrorMessage(terms.error) : null)}
      onCharge={({ amount, agreements }) => {
        setFailure(null)
        if (!terms.data) {
          void terms.refetch()
          return
        }
        if (!agreements) {
          void startCharge(amount)
          return
        }
        // 서버는 필수 약관 전체를 한 번에 받는다. 시트는 동의 안 한 것만 보여 주므로 이미 동의한 필수 약관을 더한다
        const alreadyAgreed = terms.data
          .filter((item) => item.required && item.agreed)
          .map(({ type, version }) => ({ type, version }))
        agree.mutate(
          { agreements: [...agreements, ...alreadyAgreed] },
          {
            onSuccess: () => void startCharge(amount),
            onError: (error) => setFailure(termsErrorMessage(error)),
          },
        )
      }}
    />
  )
}
