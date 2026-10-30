import { Button, Select, Stack, Text, TextInput, Title } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { useEffect, useState } from 'react'
import { formatAmount, formatDate, formatPrice, formatQuantity } from '@/shared/lib/format'
import {
  categoryGroupLabels,
  categoryLabels,
  mediaPurposeLabels,
  memberRoleLabels,
  orderItemStatusLabels,
  orderStatusLabels,
  payoutEventTypeLabels,
  productStatusLabels,
  productVisibilityLabels,
  regionLabels,
  reviewMediaTypeLabels,
  termsTypeLabels,
} from '@/shared/lib/labels'
import classes from '../DesignGallery.module.css'
import { GallerySection, Measure, Panel, StateGrid, StateItem } from '../GalleryParts'

// 0-1 토대 확인용 섹션: 토큰·서체·테마 연결·포맷 유틸·표시명

const colorGroups: { title: string; tokens: string[] }[] = [
  {
    title: '브랜드',
    tokens: [
      'primary',
      'primary-hover',
      'primary-pressed',
      'primary-tint',
      'straw',
      'straw-ink',
      'accent',
    ],
  },
  {
    title: '바탕 · 글자 · 선',
    tokens: [
      'bg',
      'surface',
      'surface-subtle',
      'text',
      'text-secondary',
      'text-muted',
      'border',
      'border-input',
      'divider',
    ],
  },
  {
    title: '상태',
    tokens: [
      'success',
      'success-bg',
      'warning',
      'warning-bg',
      'error',
      'error-bg',
      'info',
      'info-bg',
      'disabled-bg',
      'disabled-text',
      'focus',
      'toast-bg',
    ],
  },
]

function Swatch({ token }: { token: string }) {
  const name = `--pd-color-${token}`
  const [value, setValue] = useState('')

  useEffect(() => {
    setValue(getComputedStyle(document.documentElement).getPropertyValue(name).trim())
  }, [name])

  return (
    <div className={classes.swatch}>
      <span className={classes.swatchChip} style={{ background: `var(${name})` }} />
      <span className={classes.swatchText}>
        <strong>{token}</strong>
        <span className={classes.mono}>{value.toUpperCase()}</span>
      </span>
    </div>
  )
}

export function ColorSection() {
  return (
    <GallerySection
      id="colors"
      title="색 토큰"
      meta="tokens.css의 --pd-color-* · 원본 tokens.md 1장"
    >
      {colorGroups.map((group) => (
        <Panel key={group.title} title={group.title}>
          <div className={classes.swatchGrid}>
            {group.tokens.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </div>
        </Panel>
      ))}
    </GallerySection>
  )
}

export function TypographySection() {
  return (
    <GallerySection
      id="typography"
      title="서체"
      meta="본문은 Pretendard, 명조(Noto Serif KR 700)는 워드마크·홈 섹션 대제목·상점명에만"
    >
      <Panel title="명조 (.pd-serif)">
        <Stack gap="xs">
          <span className="pd-serif" style={{ fontSize: '2rem', lineHeight: '2.625rem' }}>
            팔도곳간
          </span>
          <span className="pd-serif" style={{ fontSize: '1.625rem', lineHeight: '2.25rem' }}>
            이번 주 갓 수확한 것들
          </span>
        </Stack>
      </Panel>
      <Panel title="Pretendard">
        <Stack gap="sm">
          <Title order={1}>H1 페이지 제목 28/38</Title>
          <Title order={2}>H2 섹션 제목 22/30</Title>
          <Title order={3}>H3 카드 제목 18/26</Title>
          <Text size="lg">Body L 17 · 상세 설명 본문이에요. 산지에서 바로 보내 드려요.</Text>
          <Text>Body 15 · 기본 본문이에요. 장바구니에 담았어요.</Text>
          <Text size="sm">Body S 14 · 표 셀, 판매자·관리자 본문</Text>
          <Text c="dimmed" style={{ fontSize: 'var(--pd-font-caption)' }}>
            Caption 13 · 2026.10.08(목) · 경북 청송
          </Text>
          <Text className="pd-num" fw={700} size="xl">
            1,111,111원 · 8,888,888원 (tabular-nums: 자릿수가 세로로 맞아요)
          </Text>
        </Stack>
      </Panel>
    </GallerySection>
  )
}

export function ThemeCheckSection() {
  const [range, setRange] = useState<[string | null, string | null]>([null, null])

  return (
    <GallerySection
      id="theme"
      title="테마 연결"
      meta="0-1-2 확인: 버튼 52·44·36, 입력 48, Tab으로 옮기면 포커스 링이 파란색(--pd-color-focus). 부품별 상태 전체는 0-2에서"
    >
      <Panel title="버튼 높이">
        <StateGrid>
          <Measure selector="button" expected={52}>
            <Button size="lg">결제하기 L</Button>
          </Measure>
          <Measure selector="button" expected={44}>
            <Button>결제하기 M</Button>
          </Measure>
          <Measure selector="button" expected={36}>
            <Button size="sm">결제하기 S</Button>
          </Measure>
        </StateGrid>
      </Panel>
      <Panel title="입력 높이">
        <StateGrid>
          <Measure selector="input" expected={48}>
            <TextInput label="받는 분" placeholder="이름을 입력해 주세요" />
          </Measure>
          <Measure selector="input" expected={48}>
            <Select label="산지" placeholder="골라 주세요" data={Object.values(regionLabels)} />
          </Measure>
        </StateGrid>
      </Panel>
      <Panel title="Provider 연결">
        <StateGrid>
          <StateItem label="Notifications (하단 중앙, 4초)">
            <Button
              variant="outline"
              onClick={() => notifications.show({ message: '장바구니에 담았어요' })}
            >
              토스트 띄우기
            </Button>
          </StateItem>
          <Measure selector="button" expected={48}>
            <DatePickerInput
              type="range"
              label="조회 기간 (DatesProvider locale ko)"
              placeholder="기간을 골라 주세요"
              value={range}
              onChange={setRange}
              valueFormat="YYYY.MM.DD(ddd)"
            />
          </Measure>
        </StateGrid>
      </Panel>
    </GallerySection>
  )
}

const formatExamples: { call: string; result: string }[] = [
  { call: 'formatPrice(23900)', result: formatPrice(23900) },
  { call: 'formatPrice(717, { deduct: true })', result: formatPrice(717, { deduct: true }) },
  { call: 'formatPrice(0)', result: formatPrice(0) },
  { call: 'formatAmount(1234567)', result: formatAmount(1234567) },
  { call: "formatDate('2026-10-08T09:00:00')", result: formatDate('2026-10-08T09:00:00') },
  {
    call: "formatDate('2026-10-08T09:00:00', 'short')",
    result: formatDate('2026-10-08T09:00:00', 'short'),
  },
  {
    call: "formatDate('2026-10-13T14:30:00', 'dateTime')",
    result: formatDate('2026-10-13T14:30:00', 'dateTime'),
  },
  { call: 'formatQuantity(1)', result: formatQuantity(1) },
  { call: "formatQuantity(1, '3kg')", result: formatQuantity(1, '3kg') },
]

export function FormatSection() {
  return (
    <GallerySection
      id="format"
      title="포맷 유틸"
      meta="shared/lib/format.ts · 단위 테스트 format.test.ts"
    >
      <Panel>
        <div className={classes.tableScroll}>
          <table className={classes.exampleTable}>
            <thead>
              <tr>
                <th scope="col">호출</th>
                <th scope="col">결과</th>
              </tr>
            </thead>
            <tbody>
              {formatExamples.map((example) => (
                <tr key={example.call}>
                  <td className={classes.mono}>{example.call}</td>
                  <td className="pd-num">{example.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </GallerySection>
  )
}

const labelGroups: { title: string; labels: Record<string, string> }[] = [
  { title: '상위 카테고리', labels: categoryGroupLabels },
  { title: '카테고리 8종', labels: categoryLabels },
  { title: '산지 (시·도)', labels: regionLabels },
  { title: '판매 상태', labels: productStatusLabels },
  { title: '노출 여부', labels: productVisibilityLabels },
  { title: '회원 역할', labels: memberRoleLabels },
  { title: '업로드 용도', labels: mediaPurposeLabels },
  { title: '충전 약관', labels: termsTypeLabels },
  { title: '리뷰 첨부 종류', labels: reviewMediaTypeLabels },
  { title: '정산 항목 종류', labels: payoutEventTypeLabels },
  { title: '주문 상태', labels: orderStatusLabels },
  { title: '주문 상품 상태', labels: orderItemStatusLabels },
]

export function LabelSection() {
  return (
    <GallerySection
      id="labels"
      title="표시명"
      meta="shared/lib/labels.ts · 원본 bruno_for_front/enums.ts"
    >
      {labelGroups.map((group) => (
        <Panel key={group.title} title={group.title}>
          <dl className={classes.labelList}>
            {Object.entries(group.labels).map(([value, label]) => (
              <div key={value}>
                <dt>{value}</dt>
                <dd>{label}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      ))}
    </GallerySection>
  )
}
