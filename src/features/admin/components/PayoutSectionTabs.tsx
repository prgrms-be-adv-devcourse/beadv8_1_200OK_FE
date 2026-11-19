import { Tabs } from '@mantine/core'
import { payoutSectionLabels } from '../labels'
import { PayoutSection } from '../types'

// 정산 관리 안의 화면 3개(정산 · 막힌 주문 · 대사 확인)를 오가는 탭. 화면마다 주소가 따로 있다.

export type PayoutSectionTabsProps = {
  value: PayoutSection
  onChange: (section: PayoutSection) => void
}

export function PayoutSectionTabs({ value, onChange }: PayoutSectionTabsProps) {
  return (
    <Tabs value={value} onChange={(next) => next && onChange(next as PayoutSection)}>
      <Tabs.List aria-label="정산 관리 화면">
        {Object.values(PayoutSection).map((section) => (
          <Tabs.Tab key={section} value={section}>
            {payoutSectionLabels[section]}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  )
}
