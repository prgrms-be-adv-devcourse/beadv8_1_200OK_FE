import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { SignupCompleteView } from '../views/SignupCompleteView'
import { SignupView } from '../views/SignupView'

// A-02 회원가입 라우트 /signup. 가입하면 같은 주소에서 완료 화면을 보여 준다.
// TODO(api): 2-1 POST /api/v1/members/signup. 409·422는 serverErrors(필드)로, 나머지는 errorMessage로

export function SignupPage() {
  const [params] = useSearchParams()
  const [nickname, setNickname] = useState<string | null>(null)

  if (nickname !== null) return <SignupCompleteView nickname={nickname} />
  return (
    <SignupView
      returnTo={params.get('returnTo')}
      onSubmit={(values) => setNickname(values.nickname)}
    />
  )
}
