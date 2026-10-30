import { DEFAULT_THEME, mergeMantineTheme } from '@mantine/core'
import { theme as baseTheme } from './theme'
import { variantColorResolver } from './variantColorResolver'

const theme = mergeMantineTheme(DEFAULT_THEME, baseTheme)

describe('variantColorResolver', () => {
  it('light 상태 톤은 시안의 배경·글자 토큰을 쓴다', () => {
    expect(variantColorResolver({ color: 'warning', variant: 'light', theme })).toMatchObject({
      background: 'var(--pd-color-warning-bg)',
      color: 'var(--pd-color-warning)',
    })
  })

  it('Mantine 색 이름도 같은 톤으로 맞춘다', () => {
    expect(variantColorResolver({ color: 'red', variant: 'light', theme })).toMatchObject({
      background: 'var(--pd-color-error-bg)',
      color: 'var(--pd-color-error)',
    })
    expect(variantColorResolver({ color: undefined, variant: 'light', theme })).toMatchObject({
      background: 'var(--pd-color-primary-tint)',
      color: 'var(--pd-color-primary)',
    })
  })

  it('light가 아니면 Mantine 기본 계산을 따른다', () => {
    const result = variantColorResolver({ color: 'farm', variant: 'filled', theme })
    expect(result.background).toBe('var(--mantine-color-farm-filled)')
  })
})
