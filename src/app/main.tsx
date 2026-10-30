// CSS 순서: Mantine core → dates → notifications → dropzone → 서체 → tokens.css(맨 마지막).
// Mantine은 *.layer.css(@layer mantine)로 불러온다. 레이어 밖에 있는 tokens.css와 테마 CSS Modules
// (shared/styles/components)가 불러오는 순서·청크 순서와 상관없이 Mantine 기본 스타일보다 우선한다.
import '@mantine/core/styles.layer.css'
import '@mantine/dates/styles.layer.css'
import '@mantine/notifications/styles.layer.css'
import '@mantine/dropzone/styles.layer.css'
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import '@/shared/styles/tokens.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { registerAuthHandlers } from '@/features/auth'
import { restoreAccessToken } from '@/shared/api/authToken'
import { queryClient } from '@/shared/api/queryClient'
import { AppProviders } from './providers/AppProviders'
import { router } from './router'

// 세션 종료 · 401 처리 (캐시 정리 + /login?returnTo=)
registerAuthHandlers({
  queryClient,
  navigate: (to, options) => router.navigate(to, options),
  getCurrentPath: () => `${router.state.location.pathname}${router.state.location.search}`,
})

// 새로고침 전 로그인(sessionStorage)을 첫 화면 전에 되살린다. 가드가 로그인 화면으로 보내지 않게
restoreAccessToken()

const container = document.getElementById('root')
if (!container) {
  throw new Error('#root element not found')
}

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
