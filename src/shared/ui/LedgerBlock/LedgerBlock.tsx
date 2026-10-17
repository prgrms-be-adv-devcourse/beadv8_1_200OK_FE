import { VisuallyHidden } from '@mantine/core'
import { NotebookPen } from 'lucide-react'
import { useId } from 'react'
import type { ProductRegion } from '@/shared/api/types'
import { formatDate } from '@/shared/lib/format'
import { regionLabels } from '@/shared/lib/labels'
import classes from './LedgerBlock.module.css'

// 생산 장부(시그니처): surface-subtle, radius 12, 패딩 20, 행 사이 1px 점선.
// 생산자 / 생산 지역 / 수확일(식물은 출하일). 지금 API에는 시·도(region)만 있어 나머지는 비어 있을 수 있다(A-2).

export type LedgerBlockProps = {
  producer?: string
  region?: ProductRegion
  /** 시·군·면 등 상세 지역 */
  regionDetail?: string
  /** 수확일(식물은 출하일) */
  date?: string | Date
  /** 식물 상품이면 ‘수확일’ 대신 ‘출하일’ */
  dateKind?: 'harvest' | 'shipping'
  /** 제목(‘생산 정보’). null이면 제목 없이 행만 */
  title?: string | null
  /** 제목 단계. 페이지 구조에 맞춰 바꾼다 */
  headingLevel?: 'h2' | 'h3' | 'h4'
}

function Value({ children }: { children?: string }) {
  if (children) return <dd className={classes.value}>{children}</dd>
  return (
    <dd className={classes.value} data-empty>
      <span aria-hidden="true">–</span>
      <VisuallyHidden>정보 없음</VisuallyHidden>
    </dd>
  )
}

export function LedgerBlock({
  producer,
  region,
  regionDetail,
  date,
  dateKind = 'harvest',
  title = '생산 정보',
  headingLevel: Heading = 'h3',
}: LedgerBlockProps) {
  const titleId = useId()
  const regionText = region ? [regionLabels[region], regionDetail].filter(Boolean).join(' ') : ''

  return (
    <section
      className={classes.root}
      data-with-title={title ? true : undefined}
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : '생산 정보'}
    >
      {title && (
        <Heading id={titleId} className={classes.title}>
          <NotebookPen aria-hidden="true" />
          {title}
        </Heading>
      )}
      <dl className={classes.list}>
        <div className={classes.row}>
          <dt className={classes.label}>생산자</dt>
          <Value>{producer}</Value>
        </div>
        <div className={classes.row}>
          <dt className={classes.label}>생산 지역</dt>
          <Value>{regionText}</Value>
        </div>
        <div className={classes.row}>
          <dt className={classes.label}>{dateKind === 'shipping' ? '출하일' : '수확일'}</dt>
          <Value>{date ? formatDate(date) : undefined}</Value>
        </div>
      </dl>
    </section>
  )
}
