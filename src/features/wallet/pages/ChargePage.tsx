import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { safeReturnTo } from '@/shared/lib/returnTo'
import { BALANCE_DEFAULT, BALANCE_SHORT, walletTerms } from '../fixtures'
import { ChargeResultView } from '../views/ChargeResultView'
import { ChargeView } from '../views/ChargeView'

// B-05 예치금 충전 라우트 /wallet/charge?shortfall&returnTo. 1단계: 충전하면 결제창 진행을 잠시 보인 뒤 성공 화면으로.
// TODO(api): 약관 GET·동의 POST /wallets/me/terms(✅), 충전 요청(📝 POST /wallets/me/charges) → 토스페이먼츠 결제창(VITE_PG_CLIENT_KEY).
//   PG 성공·실패 주소에 returnTo를 실어 보내야 주문서로 돌아올 수 있다.

export function ChargePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const shortfall = Number(params.get('shortfall')) || null
  const returnTo = params.get('returnTo') ? safeReturnTo(params.get('returnTo')) : null
  const balance = shortfall ? BALANCE_SHORT : BALANCE_DEFAULT
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
      terms={walletTerms}
      shortfall={shortfall}
      returnTo={returnTo}
      onCharge={({ amount }) => setPaying(amount)}
    />
  )
}
