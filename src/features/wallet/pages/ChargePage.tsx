import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { safeReturnTo } from '@/shared/lib/returnTo'
import { BALANCE_DEFAULT, BALANCE_SHORT } from '../fixtures'
import { termsErrorMessage, useAgreeWalletTerms, useWalletTerms } from '../queries'
import { ChargeResultView } from '../views/ChargeResultView'
import { ChargeView } from '../views/ChargeView'

// B-05 예치금 충전 라우트 /wallet/charge?shortfall&returnTo.
// 약관은 GET /wallets/me/terms로 받고, 동의 안 한 필수 약관이 있으면 동의 시트 → POST .../agreements 뒤에 충전한다.
// 409(약관이 바뀜)면 약관을 다시 받아 서버 문구를 보여 주고, 다시 누르면 바뀐 약관으로 시트가 뜬다.
// 동의 요청에는 필수 약관 전체가 있어야 해서(없으면 422) 이미 동의한 필수 약관도 함께 보낸다.
// TODO(api): 잔액(📝 GET /wallets/me)·충전 요청(📝 POST /wallets/me/charges) → 토스페이먼츠 결제창(VITE_PG_CLIENT_KEY)이 없어
//   fixtures 잔액으로 그리고, 충전하면 결제창 진행을 잠시 보인 뒤 성공 화면으로 간다.
//   PG 성공·실패 주소에 returnTo를 실어 보내야 주문서로 돌아올 수 있다.

export function ChargePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const shortfall = Number(params.get('shortfall')) || null
  const returnTo = params.get('returnTo') ? safeReturnTo(params.get('returnTo')) : null
  const balance = shortfall ? BALANCE_SHORT : BALANCE_DEFAULT
  const terms = useWalletTerms()
  const agree = useAgreeWalletTerms()
  const [failure, setFailure] = useState<string | null>(null)
  const [paying, setPaying] = useState<number | null>(null)

  useEffect(() => {
    if (paying === null) return
    const next = new URLSearchParams({ amount: String(paying), balance: String(balance + paying) })
    if (returnTo) next.set('returnTo', returnTo)
    const timer = setTimeout(
      () => navigate(`/wallet/charge/success?${next}`, { replace: true }),
      1500,
    )
    return () => clearTimeout(timer)
  }, [paying, balance, returnTo, navigate])

  if (paying !== null) return <ChargeResultView status="paying" amount={paying} />

  return (
    <ChargeView
      balance={balance}
      terms={terms.data ?? []}
      shortfall={shortfall}
      returnTo={returnTo}
      // 약관을 받기 전에는 동의 여부를 몰라 충전 버튼을 기다리게 한다
      submitting={terms.isPending || agree.isPending}
      errorMessage={failure ?? (terms.isError ? termsErrorMessage(terms.error) : null)}
      onCharge={({ amount, agreements }) => {
        setFailure(null)
        if (!terms.data) {
          void terms.refetch()
          return
        }
        if (!agreements) {
          setPaying(amount)
          return
        }
        // 서버는 필수 약관 전체를 한 번에 받는다. 시트는 동의 안 한 것만 보여 주므로 이미 동의한 필수 약관을 더한다
        const alreadyAgreed = terms.data
          .filter((item) => item.required && item.agreed)
          .map(({ type, version }) => ({ type, version }))
        agree.mutate(
          { agreements: [...agreements, ...alreadyAgreed] },
          {
            onSuccess: () => setPaying(amount),
            onError: (error) => setFailure(termsErrorMessage(error)),
          },
        )
      }}
    />
  )
}
