import type { QueryClient } from '@tanstack/react-query'
import { onSessionEnd } from '@/shared/api/authToken'
import { onUnauthorized } from '@/shared/api/client'
import { loginPath } from '@/shared/lib/returnTo'
import { showToast } from '@/shared/ui'

// 세션이 끝날 때의 정리 경로를 한 곳에 모은다 (ADR-0004, FE-F-005).
// - 세션 종료(로그아웃 · 만료 · 서버가 토큰 거절): 사용자별 캐시를 모두 비운다. 만료면 알려 준다
// - 로그인이 필요한 API가 401: /login?returnTo=지금 경로 (보호 화면은 가드가 먼저 보낸다)

type AuthHandlerDeps = {
  queryClient: QueryClient
  navigate: (to: string, options?: { replace?: boolean }) => unknown
  /** 지금 경로 (pathname + search) */
  getCurrentPath: () => string
}

export function registerAuthHandlers({ queryClient, navigate, getCurrentPath }: AuthHandlerDeps) {
  const offEnd = onSessionEnd((reason) => {
    queryClient.clear()
    if (reason === 'expired') showToast({ message: '로그인이 만료됐어요. 다시 로그인해 주세요' })
  })
  const offUnauthorized = onUnauthorized(() => {
    const here = getCurrentPath()
    if (here.startsWith('/login')) return
    navigate(loginPath(here), { replace: true })
  })
  return () => {
    offEnd()
    offUnauthorized()
  }
}
