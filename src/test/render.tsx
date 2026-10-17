import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { type RenderOptions, render as testingLibraryRender } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { cssVariablesResolver, theme } from '@/shared/styles/theme'

// 앱과 같은 테마로 감싸서 렌더한다. 라우터·쿼리가 필요한 테스트는 각자 감싼다.
function Providers({ children }: { children: ReactNode }) {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} env="test">
      <Notifications />
      {children}
    </MantineProvider>
  )
}

export function render(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return testingLibraryRender(ui, { wrapper: Providers, ...options })
}
