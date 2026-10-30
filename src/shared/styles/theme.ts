import { type CSSVariablesResolver, createTheme, type MantineColorsTuple } from '@mantine/core'
import { components } from './components'
import { variantColorResolver } from './variantColorResolver'

// 디자인 토큰 원본: design/tokens.md (시안 '곳간 장부' 스타일 가이드)
// 이 파일과 tokens.css 밖에서 hex 값을 직접 쓰지 않는다.
// 사용: <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
//       Mantine CSS는 *.layer.css로, tokens.css는 그 다음에 import한다.
// 컴포넌트별 설정(defaultProps·classNames·vars)은 components.ts.

// Mantine 기본 회색 대신 시안의 무채색. Mantine이 테두리·비활성·hover 배경을 gray 번호로 고르므로
// 번호마다 같은 역할의 토큰을 넣었다(밝기 순서가 아니라 역할 순서).
// 0 bg(hover 배경) · 1 surface-subtle · 2 disabled-bg · 3 border(비활성 테두리) · 4 border-input
// 5 disabled-text · 6 text-muted · 7 text-secondary · 8·9 text
const gray: MantineColorsTuple = [
  '#F7F5EF',
  '#F0EDE4',
  '#ECE9E2',
  '#DCD7CB',
  '#8F958F',
  '#9A9F99',
  '#626963',
  '#4A524C',
  '#1F2421',
  '#1F2421',
]

// primary 녹색. 6 = primary(#2E6B3F), 7 = hover, 8 = pressed, 0 = tint
const farm: MantineColorsTuple = [
  '#E6F0E8',
  '#CFE2D4',
  '#A9CCB2',
  '#7FB38E',
  '#5A9A6D',
  '#3F8053',
  '#2E6B3F',
  '#245733',
  '#1B4427',
  '#12301B',
]

// 오류 빨강. 6 = error(#B3261E), 0 = error 배경. Mantine의 --mantine-color-error가 red.6을 쓴다.
const red: MantineColorsTuple = [
  '#FDECEA',
  '#F9D3CF',
  '#F0A9A2',
  '#E57B72',
  '#D9544A',
  '#C73A30',
  '#B3261E',
  '#961F18',
  '#781913',
  '#5A120E',
]

// accent 감 주황. 6 = #B8481A. 할인율·재고 임박 글자에만 쓴다.
const persimmon: MantineColorsTuple = [
  '#FBEDE6',
  '#F5D5C6',
  '#EBAE93',
  '#DF865F',
  '#D06637',
  '#C25525',
  '#B8481A',
  '#9A3C16',
  '#7C3012',
  '#5E240D',
]

const sans =
  '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'

export const theme = createTheme({
  primaryColor: 'farm',
  primaryShade: 6,
  colors: { farm, red, persimmon, gray },
  variantColorResolver,
  black: '#1F2421',
  white: '#FFFFFF',
  autoContrast: true,
  fontFamily: sans,
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  headings: {
    fontFamily: sans,
    fontWeight: '700',
    textWrap: 'pretty',
    sizes: {
      h1: { fontSize: '1.75rem', lineHeight: '2.375rem' }, // 28/38 (모바일 22/30은 CSS Modules에서)
      h2: { fontSize: '1.375rem', lineHeight: '1.875rem' }, // 22/30
      h3: { fontSize: '1.125rem', lineHeight: '1.625rem', fontWeight: '600' }, // 18/26
      h4: { fontSize: '1rem', lineHeight: '1.5rem', fontWeight: '600' },
    },
  },
  // xs 배지 12 · sm 표·라벨 14 · md 본문 15 · lg 본문 L 17 · xl 카드 제목 18 (캡션 13은 --pd-font-caption)
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '0.9375rem',
    lg: '1.0625rem',
    xl: '1.125rem',
  },
  lineHeights: {
    xs: '1.34',
    sm: '1.58',
    md: '1.6',
    lg: '1.65',
    xl: '1.45',
  },
  // 간격 스케일(4px 기반)에서 자주 쓰는 다섯 개
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  // 6 배지·꼬리표 · 8 버튼·입력 · 12 카드 · 16 모달·시트
  radius: {
    xs: '0.375rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1rem',
  },
  defaultRadius: 'sm',
  shadows: {
    xs: '0 1px 0 #E9E5DB',
    sm: '0 1px 0 #E9E5DB',
    md: '0 4px 16px rgba(31, 36, 33, 0.08)',
    lg: '0 12px 32px rgba(31, 36, 33, 0.16)',
    xl: '0 12px 32px rgba(31, 36, 33, 0.16)',
  },
  // 시안 기준: 태블릿 768(sm) · 데스크톱 1024(md). postcss.config.cjs의 값과 함께 바꾼다.
  breakpoints: {
    xs: '36em',
    sm: '48em',
    md: '64em',
    lg: '75em',
    xl: '88em',
  },
  focusRing: 'auto',
  respectReducedMotion: true,
  cursorType: 'pointer',
  other: {
    color: {
      straw: '#EFE6D2',
      strawInk: '#5A4321',
      bg: '#F7F5EF',
      surfaceSubtle: '#F0EDE4',
      textSecondary: '#4A524C',
      textMuted: '#626963',
      border: '#DCD7CB',
      borderInput: '#8F958F',
      divider: '#E9E5DB',
      focus: '#1F6FD1',
    },
    layout: {
      buyerMaxWidth: 1200,
      consoleMaxWidth: 1280,
      sidebarWidth: 240,
    },
  },
  components,
})

// Mantine 기본 회색·primary 연한 색 대신 시안의 글자·테두리·tint 색을 쓰게 한다.
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    '--mantine-color-text': '#1F2421',
    '--mantine-color-dimmed': '#626963',
    '--mantine-color-anchor': '#2E6B3F',
    '--mantine-color-default-border': '#DCD7CB',
    '--mantine-color-placeholder': '#626963',
    // NavLink 활성 등 primary light 배경: 투명도 섞은 색 대신 tint(#E6F0E8)
    '--mantine-primary-color-light': '#E6F0E8',
    '--mantine-primary-color-light-hover': '#E6F0E8',
    '--mantine-primary-color-light-color': '#2E6B3F',
  },
  dark: {},
})
