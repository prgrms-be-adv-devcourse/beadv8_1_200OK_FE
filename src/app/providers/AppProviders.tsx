import 'dayjs/locale/ko'

import { MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { Notifications } from '@mantine/notifications'
import { QueryClientProvider } from '@tanstack/react-query'
import { LucideProvider } from 'lucide-react'
import { lazy, type ReactNode, Suspense } from 'react'
import { queryClient } from '@/shared/api/queryClient'
import { TOAST_DURATION_MS } from '@/shared/lib/constants'
import { cssVariablesResolver, theme } from '@/shared/styles/theme'

// 토스트: 하단 중앙, 4초 (design/COMPONENTS.md, DECISIONS.md D)
// TanStack Query devtools는 개발 서버에서만 불러온다 (프로덕션 번들에서 빠진다)
const QueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : () => null

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider
        theme={theme}
        cssVariablesResolver={cssVariablesResolver}
        defaultColorScheme="light"
      >
        <DatesProvider settings={{ locale: 'ko' }}>
          <LucideProvider size={20} strokeWidth={1.75}>
            <Notifications position="bottom-center" autoClose={TOAST_DURATION_MS} />
            {children}
          </LucideProvider>
        </DatesProvider>
      </MantineProvider>
      <Suspense>
        <QueryDevtools buttonPosition="bottom-left" />
      </Suspense>
    </QueryClientProvider>
  )
}
