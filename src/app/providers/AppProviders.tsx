import 'dayjs/locale/ko'

import { MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { Notifications } from '@mantine/notifications'
import { LucideProvider } from 'lucide-react'
import type { ReactNode } from 'react'
import { cssVariablesResolver, theme } from '@/shared/styles/theme'

// 토스트: 하단 중앙, 4초 (design/COMPONENTS.md, DECISIONS.md D)
const TOAST_DURATION_MS = 4000

export function AppProviders({ children }: { children: ReactNode }) {
  return (
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
  )
}
