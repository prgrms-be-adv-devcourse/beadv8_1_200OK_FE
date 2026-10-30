import { Chip, Group, Text } from '@mantine/core'
import { useState } from 'react'
import type { ScreenPreview } from '@/shared/lib/screenPreview'
import { Frames, GallerySection, Panel } from '../GalleryParts'
import type { ScreenBundle } from '../screenRegistry'

// 1단계 화면 상태: 검토 패널의 상태를 골라 /__design/screen/:screenId?state= 를 iframe(1440 · 390)으로 본다.

function ScreenPanel({ screen }: { screen: ScreenPreview }) {
  const [stateId, setStateId] = useState(screen.states[0]?.id ?? '')
  const src = `/__design/screen/${screen.id}?state=${stateId}`

  return (
    <Panel title={screen.title}>
      <Chip.Group value={stateId} onChange={(value) => setStateId(value as string)}>
        <Group gap="xs" mb="md" aria-label={`${screen.title} 상태`} role="radiogroup">
          {screen.states.map((state) => (
            <Chip key={state.id} value={state.id} size="sm">
              {state.label}
            </Chip>
          ))}
        </Group>
      </Chip.Group>
      <Frames key={src} title={`${screen.title} · ${stateId}`} src={src} />
      <Text size="sm" mt="xs">
        <a href={src} target="_blank" rel="noreferrer">
          새 탭으로 열기
        </a>
      </Text>
    </Panel>
  )
}

export function ScreenBundleSection({ bundle }: { bundle: ScreenBundle }) {
  return (
    <GallerySection
      id={bundle.id}
      title={`화면 ${bundle.title}`}
      meta="1단계 View를 fixtures + props 조합으로 그려요. 상태 칩 = 시안 검토 패널의 상태"
    >
      {bundle.screens.map((screen) => (
        <ScreenPanel key={screen.id} screen={screen} />
      ))}
    </GallerySection>
  )
}
