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
import { AppProviders } from './providers/AppProviders'
import { router } from './router'

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
