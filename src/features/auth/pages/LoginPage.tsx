import { useNavigate, useSearchParams } from 'react-router'
import { safeReturnTo } from '@/shared/lib/returnTo'
import { showToast } from '@/shared/ui'
import { LoginView } from '../views/LoginView'

// A-01 로그인 라우트 /login?returnTo=. 1단계: 제출하면 돌아갈 곳으로 이동만 한다.
// TODO(api): 2-1 POST /api/v1/auth/login → accessToken 보관, 실패(401)는 서버 detail을 errorMessage로

export function LoginPage() {
  const [params] = useSearchParams()
  const returnTo = params.get('returnTo')
  const navigate = useNavigate()

  return (
    <LoginView
      returnTo={returnTo}
      onSubmit={() => {
        showToast({ message: '반가워요' })
        navigate(safeReturnTo(returnTo), { replace: true })
      }}
    />
  )
}
