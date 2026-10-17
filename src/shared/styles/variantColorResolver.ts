import {
  defaultVariantColorsResolver,
  type VariantColorResolverResult,
  type VariantColorsResolver,
} from '@mantine/core'

// 상태 색 이름. Badge·Alert·ThemeIcon 등에 color로 넘기면 variant="light"에서 시안의 배경·글자 토큰을 쓴다.
// 예: <Badge color="warning">결제 대기</Badge>, <Alert color="error" />
export type StatusTone = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'straw'

const tones: Record<StatusTone, { bg: string; fg: string }> = {
  primary: { bg: '--pd-color-primary-tint', fg: '--pd-color-primary' },
  success: { bg: '--pd-color-success-bg', fg: '--pd-color-success' },
  warning: { bg: '--pd-color-warning-bg', fg: '--pd-color-warning' },
  error: { bg: '--pd-color-error-bg', fg: '--pd-color-error' },
  info: { bg: '--pd-color-info-bg', fg: '--pd-color-info' },
  neutral: { bg: '--pd-color-surface-subtle', fg: '--pd-color-text-secondary' },
  straw: { bg: '--pd-color-straw', fg: '--pd-color-straw-ink' },
}

// Mantine 색 이름도 같은 톤으로 맞춘다(color 생략 = primary)
const aliases: Record<string, StatusTone> = { farm: 'primary', red: 'error', gray: 'neutral' }

function toTone(color: string | undefined, primaryColor: string): StatusTone | undefined {
  const name = color ?? primaryColor
  if (name in tones) return name as StatusTone
  return aliases[name]
}

export const variantColorResolver: VariantColorsResolver = (input) => {
  const tone = input.variant === 'light' ? toTone(input.color, input.theme.primaryColor) : undefined
  if (!tone) return defaultVariantColorsResolver(input)

  const { bg, fg } = tones[tone]
  const result: VariantColorResolverResult = {
    background: `var(${bg})`,
    hover: `var(${bg})`,
    color: `var(${fg})`,
    border: '1px solid transparent',
  }
  return result
}
