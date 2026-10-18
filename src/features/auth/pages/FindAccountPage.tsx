import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { showToast } from '@/shared/ui'
import { foundId, maskedEmail, RESEND_WAIT_SECONDS } from '../fixtures'
import { type FindAccountTab, FindAccountView, type FoundId } from '../views/FindAccountView'

// 아이디·비밀번호 찾기 라우트 /find-account?tab=id|password. 1단계: 어떤 값이든 찾은 것으로 보여 준다.
// TODO(api): 아이디 찾기·재설정 링크 API 없음(C-5)

export function FindAccountPage() {
  const [params, setParams] = useSearchParams()
  const tab: FindAccountTab = params.get('tab') === 'password' ? 'password' : 'id'
  const [found, setFound] = useState<FoundId | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn(resendIn - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  return (
    <FindAccountView
      tab={tab}
      onTabChange={(next) =>
        setParams(next === 'password' ? { tab: 'password' } : {}, { replace: true })
      }
      onFindId={() => setFound(foundId)}
      onRequestReset={() => {
        setSentTo(maskedEmail)
        setResendIn(RESEND_WAIT_SECONDS)
      }}
      foundId={found}
      sentTo={sentTo}
      resendIn={resendIn}
      onResend={() => {
        setResendIn(RESEND_WAIT_SECONDS)
        showToast({ message: '재설정 링크를 다시 보냈어요' })
      }}
    />
  )
}
