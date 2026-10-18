import { useSearchParams } from 'react-router'
import { safeReturnTo } from '@/shared/lib/returnTo'
import { ChargeResultView } from '../views/ChargeResultView'

// PG 복귀 라우트. 성공 /wallet/charge/success?amount&balance&returnTo(&status=pending)
// 실패 /wallet/charge/fail?reason=expired&returnTo
// TODO(api): 📝 성공 복귀에서 POST /wallets/me/charges/{id}/confirm, 실패 복귀에서 .../fail 을 부르고 결과로 상태를 정한다

function useReturnTo() {
  const [params] = useSearchParams()
  const value = params.get('returnTo')
  return { params, returnTo: value ? safeReturnTo(value) : null }
}

export function ChargeSuccessPage() {
  const { params, returnTo } = useReturnTo()
  return (
    <ChargeResultView
      status={params.get('status') === 'pending' ? 'pending' : 'success'}
      amount={Number(params.get('amount')) || undefined}
      balanceAfter={params.has('balance') ? Number(params.get('balance')) : undefined}
      returnTo={returnTo}
    />
  )
}

export function ChargeFailPage() {
  const { params, returnTo } = useReturnTo()
  const retry = returnTo
    ? `/wallet/charge?returnTo=${encodeURIComponent(returnTo)}`
    : '/wallet/charge'
  return (
    <ChargeResultView
      status={params.get('reason') === 'expired' ? 'expired' : 'failed'}
      returnTo={returnTo}
      retryPath={retry}
    />
  )
}
