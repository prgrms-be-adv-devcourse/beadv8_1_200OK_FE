import { Badge, Group, Text } from '@mantine/core'
import type { ComponentType } from 'react'
import classes from './DesignGallery.module.css'
import {
  ColorSection,
  FormatSection,
  LabelSection,
  ThemeCheckSection,
  TypographySection,
} from './sections/FoundationSections'
import { LayoutSection } from './sections/LayoutSections'
import {
  BadgeAlertSection,
  ButtonSection,
  DataSection,
  InputSection,
  OverlaySection,
  SelectionSection,
} from './sections/MantineSections'
import {
  BadgeTagSection,
  DisabledCtaSection,
  LedgerSection,
  OptionQuantitySection,
  PageHeaderSection,
  PhotoUploaderSection,
  PriceSection,
  ProductCardSection,
  RatingSection,
  StateViewSection,
} from './sections/SharedUiSections'

// /__design: 개발 서버에서만 열리는 컴포넌트 갤러리 (routes.tsx에서 DEV일 때만 lazy로 등록)
// 0-2(Mantine 테마)·0-3(shared/ui)·0-4(레이아웃) 묶음은 sections/에 섹션을 만들어 아래 목록에 추가한다.

type GalleryEntry = { id: string; title: string; Section: ComponentType }

const entries: GalleryEntry[] = [
  { id: 'colors', title: '색 토큰', Section: ColorSection },
  { id: 'typography', title: '서체', Section: TypographySection },
  { id: 'theme', title: '테마 연결', Section: ThemeCheckSection },
  { id: 'format', title: '포맷 유틸', Section: FormatSection },
  { id: 'labels', title: '표시명', Section: LabelSection },
  // 0-2 Mantine 테마
  { id: 'button', title: '버튼', Section: ButtonSection },
  { id: 'input', title: '입력 필드', Section: InputSection },
  { id: 'selection', title: '선택 컨트롤', Section: SelectionSection },
  { id: 'badge', title: '배지 · 안내 박스', Section: BadgeAlertSection },
  { id: 'overlay', title: '모달 · 시트 · 토스트', Section: OverlaySection },
  { id: 'data', title: '표 · 내비 · 기타', Section: DataSection },
  // 0-3 shared/ui
  { id: 'price', title: 'PriceText', Section: PriceSection },
  { id: 'status-badge', title: 'StatusBadge · OriginTag', Section: BadgeTagSection },
  { id: 'rating-stars', title: 'RatingStars', Section: RatingSection },
  { id: 'ledger', title: 'LedgerBlock', Section: LedgerSection },
  { id: 'product-card', title: 'ProductCard', Section: ProductCardSection },
  { id: 'option-card', title: 'OptionCard · 수량', Section: OptionQuantitySection },
  { id: 'query-state', title: 'QueryState · EmptyView', Section: StateViewSection },
  { id: 'page-header', title: 'PageHeader', Section: PageHeaderSection },
  { id: 'disabled-reason', title: '비활성 이유 · CTA 바', Section: DisabledCtaSection },
  { id: 'photo-uploader', title: 'PhotoUploader', Section: PhotoUploaderSection },
  // 0-4 레이아웃
  { id: 'layouts', title: '레이아웃', Section: LayoutSection },
]

export function DesignGallery() {
  return (
    <div className={classes.page}>
      <header className={classes.header}>
        <span className={`pd-serif ${classes.wordmark}`}>팔도곳간</span>
        <Group gap="xs">
          <Text fw={600}>컴포넌트 갤러리</Text>
          <Badge variant="light" color="gray">
            개발 전용
          </Badge>
        </Group>
        <Text size="sm" c="dimmed">
          시안 원본: design/screens/common/StyleGuide.dc.html, Components.dc.html
        </Text>
      </header>
      <div className={classes.body}>
        <nav className={classes.tocNav} aria-label="갤러리 목차">
          <ul className={classes.toc}>
            {entries.map((entry) => (
              <li key={entry.id}>
                <a className={classes.tocLink} href={`#${entry.id}`}>
                  {entry.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <main className={classes.sections}>
          {entries.map(({ id, Section }) => (
            <Section key={id} />
          ))}
        </main>
      </div>
    </div>
  )
}
