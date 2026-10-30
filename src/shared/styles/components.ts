import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Chip,
  Drawer,
  Input,
  InputWrapper,
  type MantineThemeComponents,
  Modal,
  NativeSelect,
  NavLink,
  Notification,
  NumberInput,
  Pagination,
  PasswordInput,
  Radio,
  Rating,
  SegmentedControl,
  Select,
  Skeleton,
  Stepper,
  Table,
  Tabs,
  Textarea,
  TextInput,
} from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { ChevronDown } from 'lucide-react'
import { createElement } from 'react'
import buttonClasses from './components/button.module.css'
import choiceClasses from './components/choice.module.css'
import dataClasses from './components/data.module.css'
import feedbackClasses from './components/feedback.module.css'
import inputClasses from './components/input.module.css'
import overlayClasses from './components/overlay.module.css'

// Mantine 컴포넌트를 시안(design/COMPONENTS.md, screens/common/Components.dc.html)에 맞추는 설정.
// 크기·색은 CSS Modules에서 var(--pd-*)로만 정하고, Mantine이 인라인으로 넣는 변수만 vars로 덮는다.

// vars 리졸버가 돌려주는 객체. Mantine 선언에 없는 --pd-* 변수도 인라인으로 넣기 위해 넓은 타입을 쓴다.
type CssVars = Record<string, string>

// color prop을 테마 색 이름으로 바꾼다(없거나 CSS 색이면 primary)
function colorKey(color: unknown, colors: Record<string, unknown>, primary: string): string {
  return typeof color === 'string' && color in colors ? color : primary
}

const closeButtonProps = { 'aria-label': '닫기', size: 44, iconSize: 20 }

// 셀렉트 오른쪽 아이콘: Mantine 기본(위아래 화살표) 대신 시안의 chevron-down
const selectChevron = createElement(ChevronDown, {
  'aria-hidden': true,
  color: 'var(--pd-color-text)',
})

// Pagination 이전·다음은 아이콘 대신 글자 (시안: 이전 · 1 2 3 · 다음)
const PaginationPrevious = () => createElement('span', { className: dataClasses.edge }, '이전')
const PaginationNext = () => createElement('span', { className: dataClasses.edge }, '다음')

export const components: MantineThemeComponents = {
  // ─── 버튼 ────────────────────────────────────────────
  // Primary filled · Secondary outline · Ghost subtle · Danger color="red" filled/outline
  // 크기 L·M·S = lg·md·sm (52·44·36)
  Button: Button.extend({
    // 로딩 스피너는 기본 아이콘 크기 20
    defaultProps: { size: 'md', loaderProps: { size: 20 } },
    classNames: {
      root: buttonClasses.root,
    },
    vars: (theme, props) => {
      const color = colorKey(props.color, theme.colors, theme.primaryColor)
      const root: CssVars = {}
      if (props.size === 'lg') root['--button-fz'] = '1rem'
      switch (props.variant ?? 'filled') {
        case 'filled':
          root['--pd-button-pressed-bg'] = `var(--mantine-color-${color}-8)`
          break
        case 'outline':
          root['--button-bg'] = 'var(--pd-color-surface)'
          root['--button-hover'] = `var(--mantine-color-${color}-0)`
          root['--pd-button-pressed-bg'] = `var(--mantine-color-${color}-0)`
          root['--pd-button-pressed-color'] = `var(--mantine-color-${color}-8)`
          break
        case 'subtle':
          // Mantine 9의 subtle 글자색(light-color)은 9번 색이라 시안보다 진하다 → 6번(primary)
          root['--button-color'] = `var(--mantine-color-${color}-filled)`
          root['--button-hover'] = 'var(--pd-color-surface-subtle)'
          root['--pd-button-pressed-bg'] = 'var(--pd-color-divider)'
          root['--pd-button-pressed-color'] = `var(--mantine-color-${color}-8)`
          break
      }
      return { root }
    },
  }),

  // 아이콘 버튼 44. aria-label은 쓰는 쪽에서 반드시 넣는다.
  // 기본 subtle(테두리 없음, 글자색), variant="default"면 입력 테두리색 외곽선
  ActionIcon: ActionIcon.extend({
    defaultProps: { size: 'lg', variant: 'subtle' },
    classNames: { root: buttonClasses.actionIcon },
    vars: (_theme, props) => {
      const root: CssVars = {}
      if (props.color) return { root }
      if ((props.variant ?? 'subtle') === 'subtle') {
        root['--ai-color'] = 'var(--pd-color-text)'
        root['--ai-hover'] = 'var(--pd-color-surface-subtle)'
      }
      if (props.variant === 'default') {
        root['--ai-bd'] = '1px solid var(--pd-color-border-input)'
      }
      return { root }
    },
  }),

  // ─── 입력 ────────────────────────────────────────────
  // 높이 48, 라벨 위 → 입력 → 오류 → 도움말
  Input: Input.extend({
    classNames: { wrapper: inputClasses.wrapper, input: inputClasses.input },
  }),
  InputWrapper: InputWrapper.extend({
    defaultProps: { inputWrapperOrder: ['label', 'input', 'error', 'description'] },
    classNames: {
      root: inputClasses.root,
      label: inputClasses.label,
      description: inputClasses.description,
      error: inputClasses.error,
    },
  }),
  TextInput: TextInput.extend({ defaultProps: { size: 'md' } }),
  PasswordInput: PasswordInput.extend({
    defaultProps: {
      size: 'md',
      visibilityToggleButtonProps: { 'aria-label': '비밀번호 보기' },
    },
  }),
  // 위아래 화살표는 터치 영역이 작아 숨긴다. 수량은 QuantityStepper를 쓴다.
  NumberInput: NumberInput.extend({ defaultProps: { size: 'md', hideControls: true } }),
  Textarea: Textarea.extend({ defaultProps: { size: 'md' } }),
  NativeSelect: NativeSelect.extend({ defaultProps: { size: 'md', rightSection: selectChevron } }),
  DatePickerInput: DatePickerInput.extend({ defaultProps: { size: 'md' } }),
  // 목록: shadow md, 옵션 44, 선택 tint + primary 600 + 체크(오른쪽).
  // 테마의 Combobox classNames는 Select 안 목록까지 내려가지 않아 Select에 직접 건다.
  Select: Select.extend({
    defaultProps: {
      size: 'md',
      rightSection: selectChevron,
      checkIconPosition: 'right',
    },
    classNames: { dropdown: inputClasses.dropdown, option: inputClasses.option },
  }),

  // ─── 선택 컨트롤 ─────────────────────────────────────
  // 체크박스·라디오 20px, 라벨까지 행 전체(44)가 터치 영역
  Checkbox: Checkbox.extend({
    defaultProps: { size: 'md', radius: 'xs' },
    classNames: {
      body: choiceClasses.body,
      labelWrapper: choiceClasses.labelWrapper,
      label: choiceClasses.label,
    },
    vars: () => ({ root: { '--checkbox-size': '1.25rem' } }),
  }),
  Radio: Radio.extend({
    defaultProps: { size: 'md' },
    classNames: {
      body: choiceClasses.body,
      labelWrapper: choiceClasses.labelWrapper,
      label: choiceClasses.label,
    },
    vars: () => ({ root: { '--radio-size': '1.25rem', '--radio-icon-size': '0.5rem' } }),
  }),
  // 필터 칩: 높이 36 pill, 선택되면 primary 채움(체크 아이콘 없음)
  Chip: Chip.extend({
    defaultProps: { size: 'md', variant: 'outline' },
    classNames: {
      root: choiceClasses.chipRoot,
      label: choiceClasses.chipLabel,
      iconWrapper: choiceClasses.chipIcon,
    },
  }),
  SegmentedControl: SegmentedControl.extend({
    defaultProps: { radius: 1000, color: 'farm' },
    classNames: {
      root: choiceClasses.segmentRoot,
      label: choiceClasses.segmentLabel,
      input: choiceClasses.segmentInput,
    },
  }),
  // 탭 48, 활성 2px 밑줄 + 600
  Tabs: Tabs.extend({
    classNames: { list: choiceClasses.tabsList, tab: choiceClasses.tab },
  }),

  // ─── 배지·안내 ───────────────────────────────────────
  // 높이 24 · radius 6 · 아이콘 12. 색은 상태 톤(color="success" 등, variantColorResolver)
  Badge: Badge.extend({
    defaultProps: { variant: 'light', color: 'neutral', radius: 'xs', size: 'md' },
    classNames: { root: feedbackClasses.badge, section: feedbackClasses.badgeSection },
  }),
  // 아이콘 + 제목(600) + 설명. 색은 상태 톤
  Alert: Alert.extend({
    defaultProps: { variant: 'light', radius: 'md' },
    classNames: {
      root: feedbackClasses.alert,
      icon: feedbackClasses.alertIcon,
      body: feedbackClasses.alertBody,
      title: feedbackClasses.alertTitle,
      message: feedbackClasses.alertMessage,
    },
  }),
  // 토스트: 어두운 배경 흰 글자. 위치·시간은 app/providers의 <Notifications>
  Notification: Notification.extend({
    defaultProps: { withCloseButton: false, radius: 'md' },
    classNames: {
      root: feedbackClasses.toast,
      description: feedbackClasses.toastDescription,
    },
  }),
  Skeleton: Skeleton.extend({
    classNames: { root: feedbackClasses.skeleton },
  }),

  // ─── 모달·시트 ───────────────────────────────────────
  // 모달 480 · radius 16 · 패딩 24 · 200ms. 시안처럼 X 없이 본문 버튼(보조 → 주)으로 닫고, Esc·바깥 클릭도 닫힌다.
  // X가 필요하면 withCloseButton. 닫을 수 없는 모달은 closeOnClickOutside={false} closeOnEscape={false}
  Modal: Modal.extend({
    defaultProps: {
      radius: 'lg',
      centered: true,
      size: 480,
      padding: 'lg',
      shadow: 'lg',
      withCloseButton: false,
      closeButtonProps,
      transitionProps: { duration: 200 },
    },
    classNames: { title: overlayClasses.title, body: overlayClasses.body },
  }),
  // position="bottom"이면 모바일 바텀시트(상단 radius 16 + 손잡이). 시트는 시안처럼 withCloseButton={false}로
  // 본문 버튼(닫기 · 주 버튼)을 둔다. 옆에서 나오는 메뉴 드로어는 X를 그대로 쓴다.
  Drawer: Drawer.extend({
    defaultProps: {
      radius: 'lg',
      shadow: 'lg',
      closeButtonProps,
      transitionProps: { duration: 200 },
    },
    classNames: (_theme, props) =>
      props.position === 'bottom'
        ? {
            content: overlayClasses.sheet,
            header: overlayClasses.sheetHeader,
            title: overlayClasses.title,
            body: overlayClasses.sheetBody,
          }
        : { title: overlayClasses.title },
  }),

  // ─── 표·내비 (판매자 센터·관리자 콘솔) ───────────────
  // 헤더 44 · 행 52 · hover bg · 숫자 tabular
  Table: Table.extend({
    defaultProps: {
      highlightOnHover: true,
      verticalSpacing: 0,
      horizontalSpacing: 'md',
      tabularNums: true,
    },
    classNames: {
      table: dataClasses.table,
      thead: dataClasses.thead,
      th: dataClasses.th,
      td: dataClasses.td,
    },
  }),
  Pagination: Pagination.extend({
    defaultProps: {
      radius: 'sm',
      previousIcon: PaginationPrevious,
      nextIcon: PaginationNext,
      getItemProps: (page: number) => ({ 'aria-label': `${page}페이지` }),
    },
    classNames: { root: dataClasses.pagination, control: dataClasses.paginationControl },
  }),
  // 사이드바 메뉴 44, 활성 tint + 600
  NavLink: NavLink.extend({
    classNames: {
      root: dataClasses.navLink,
      label: dataClasses.navLabel,
      section: dataClasses.navSection,
    },
  }),
  Stepper: Stepper.extend({
    defaultProps: { iconSize: 32, size: 'sm' },
    classNames: {
      stepIcon: dataClasses.stepIcon,
      stepLabel: dataClasses.stepLabel,
      stepDescription: dataClasses.stepDescription,
      separator: dataClasses.stepSeparator,
    },
  }),
  // 별: 채움 straw-ink, 빈 별은 border-input 테두리. 0.5점 단위
  Rating: Rating.extend({
    defaultProps: { fractions: 2, color: 'var(--pd-color-straw-ink)' },
    classNames: { starSymbol: dataClasses.star, input: dataClasses.ratingInput },
  }),
}
