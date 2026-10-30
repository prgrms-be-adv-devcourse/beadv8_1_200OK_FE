import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router'
import { MemberRole } from '@/shared/api/types'
import { loginPath, safeReturnTo } from '@/shared/lib/returnTo'
import { QueryState } from '@/shared/ui'
import { useSession } from '../session'

// 라우트 가드. 화면 표시만 막고 인가는 서버가 한다(SCREENS.md).
// 세션이 'unknown'(API 연결 전)이면 모두 통과시킨다 → 2단계에서 useSession만 바꾸면 그대로 동작한다.

function useCurrentPath() {
  const location = useLocation()
  return `${location.pathname}${location.search}`
}

/** 로그인 필요. 비회원이면 /login?returnTo=지금 경로 */
export function RequireAuth() {
  const session = useSession()
  const here = useCurrentPath()
  if (session.status === 'guest') return <Navigate to={loginPath(here)} replace />
  return <Outlet />
}

/** 판매자만. 비회원은 로그인, 판매자가 아니면 판매자 신청 안내로 */
export function RequireSeller() {
  const session = useSession()
  const here = useCurrentPath()
  if (session.status === 'guest') return <Navigate to={loginPath(here)} replace />
  if (session.status === 'authenticated' && session.role !== MemberRole.SELLER) {
    return <Navigate to="/seller/apply" replace />
  }
  return <Outlet />
}

/** 운영 관리자만. 관리자가 아니면 권한 제한 화면 */
export function RequireAdmin() {
  const session = useSession()
  const here = useCurrentPath()
  if (session.status === 'guest') return <Navigate to={loginPath(here)} replace />
  if (session.status === 'authenticated' && session.role !== MemberRole.ADMIN) {
    return (
      <QueryState
        status="forbidden"
        forbidden={{
          title: '관리자만 볼 수 있는 화면이에요',
          action: { label: '홈으로', to: '/' },
        }}
      />
    )
  }
  return <Outlet />
}

/** 비회원 전용(로그인·가입). 로그인 상태면 returnTo 또는 홈으로 */
export function GuestOnly() {
  const session = useSession()
  const [params] = useSearchParams()
  if (session.status === 'authenticated') {
    return <Navigate to={safeReturnTo(params.get('returnTo'))} replace />
  }
  return <Outlet />
}
