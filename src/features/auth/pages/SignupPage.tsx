import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { isApiError } from '@/shared/api/ApiError'
import { useSignup } from '../queries'
import { SignupCompleteView } from '../views/SignupCompleteView'
import { type SignupFieldErrors, SignupView } from '../views/SignupView'

// A-02 회원가입 라우트 /signup. ✅ POST /api/v1/members/signup. 가입하면 같은 주소에서 완료 화면을 보여 준다.
// 409(중복)는 errors 없이 detail로만 오므로 문구로 아이디·이메일 칸을 고른다. 422는 errors[].path를 그 칸에 붙인다.

const fields = ['loginId', 'email', 'name', 'nickname', 'password', 'termsAgreed', 'privacyAgreed']

/** 칸에 붙일 수 있는 오류만. 하나도 없으면 undefined → 폼 위 문구로 보여 준다 */
function toFieldErrors(error: unknown): SignupFieldErrors | undefined {
  if (!isApiError(error)) return undefined
  if (error.status === 422) {
    const entries = Object.entries(error.fieldErrors).filter(([path]) => fields.includes(path))
    return entries.length > 0 ? Object.fromEntries(entries) : undefined
  }
  if (error.status === 409) {
    if (error.detail.includes('아이디')) return { loginId: error.detail }
    if (error.detail.includes('이메일')) return { email: error.detail }
  }
  return undefined
}

export function SignupPage() {
  const [params] = useSearchParams()
  const [nickname, setNickname] = useState<string | null>(null)
  const signupMutation = useSignup()
  const serverErrors = useMemo(() => toFieldErrors(signupMutation.error), [signupMutation.error])

  if (nickname !== null) return <SignupCompleteView nickname={nickname} />
  return (
    <SignupView
      returnTo={params.get('returnTo')}
      submitting={signupMutation.isPending}
      serverErrors={serverErrors}
      errorMessage={signupMutation.error && !serverErrors ? signupMutation.error.message : null}
      onSubmit={(values) =>
        signupMutation.mutate(values, { onSuccess: () => setNickname(values.nickname) })
      }
    />
  )
}
