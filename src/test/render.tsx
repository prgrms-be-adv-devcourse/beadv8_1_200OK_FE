import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type RenderOptions, render as testingLibraryRender } from '@testing-library/react'
import { type ReactElement, type ReactNode, useState } from 'react'
import { cssVariablesResolver, theme } from '@/shared/styles/theme'

// 앱과 같은 테마 + 테스트마다 새 QueryClient(재시도 없음)로 감싸서 렌더한다. 라우터가 필요한 테스트는 각자 감싼다.
function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
  )
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} env="test">
        <Notifications />
        {children}
      </MantineProvider>
    </QueryClientProvider>
  )
}

export function render(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return testingLibraryRender(ui, { wrapper: Providers, ...options })
}
