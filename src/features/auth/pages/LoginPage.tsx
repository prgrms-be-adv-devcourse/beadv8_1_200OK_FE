import { useNavigate, useSearchParams } from 'react-router'
import { safeReturnTo } from '@/shared/lib/returnTo'
import { showToast } from '@/shared/ui'
import { useLogin } from '../queries'
import { LoginView } from '../views/LoginView'

// A-01 로그인 라우트 /login?returnTo=. ✅ POST /api/v1/auth/login → accessToken을 메모리에 보관(새로고침하면 다시 로그인).
// 실패(401 불일치 · 403 정지)는 서버 detail을 그대로 보여 준다.

export function LoginPage() {
  const [params] = useSearchParams()
  const returnTo = params.get('returnTo')
  const navigate = useNavigate()
  const loginMutation = useLogin()

  return (
    <LoginView
      returnTo={returnTo}
      submitting={loginMutation.isPending}
      errorMessage={loginMutation.error?.message ?? null}
      onSubmit={(values) =>
        loginMutation.mutate(values, {
          onSuccess: () => {
            showToast({ message: '반가워요' })
            navigate(safeReturnTo(returnTo), { replace: true })
          },
        })
      }
    />
  )
}
