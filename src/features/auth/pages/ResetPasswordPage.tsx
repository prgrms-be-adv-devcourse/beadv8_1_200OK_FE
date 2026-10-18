import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { foundId } from '../fixtures'
import { ResetPasswordView } from '../views/ResetPasswordView'

// 새 비밀번호 정하기 라우트 /find-account/reset?token=. 1단계: token이 'expired'면 만료 화면.
// TODO(api): 재설정 토큰 확인·비밀번호 변경 API 없음(C-5)

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const [done, setDone] = useState(false)
  const expired = params.get('token') === 'expired'

  return (
    <ResetPasswordView
      status={expired ? 'expired' : done ? 'done' : 'form'}
      maskedLoginId={foundId.maskedLoginId}
      onSubmit={() => setDone(true)}
    />
  )
}
