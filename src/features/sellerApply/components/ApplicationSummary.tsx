import { Button } from '@mantine/core'
import { NotebookPen } from 'lucide-react'
import type { SellerApplyRequest } from '@/shared/api/types'
import { formatDate } from '@/shared/lib/format'
import classes from './ApplicationSummary.module.css'

// 신청 정보 장부: 확인 단계(‘수정’), 신청 완료, 신청 현황이 같이 쓴다.
// 신청 현황은 서버 상세(GET .../applications/{id})를 받는데 통신판매업 신고번호가 없어 그 줄은 있을 때만 그린다.

export type ApplicationSummaryValues = Omit<SellerApplyRequest, 'mailOrderNumber'> & {
  mailOrderNumber?: string
}

type Row = { label: string; value: string; num?: boolean }

export type ApplicationSummaryProps = {
  values: ApplicationSummaryValues
  appliedAt?: string
  /** 확인 단계: ‘수정’ 버튼 */
  onEditShop?: () => void
  headingLevel?: 'h2' | 'h3'
}

export function ApplicationSummary({
  values,
  appliedAt,
  onEditShop,
  headingLevel: Heading = 'h2',
}: ApplicationSummaryProps) {
  const title = onEditShop ? '상점 정보' : '신청 정보'
  const rows: Row[] = [
    { label: '상호명', value: values.storeName },
    { label: '대표자', value: values.representativeName },
    { label: '사업자등록번호', value: values.businessNumber, num: true },
    ...(values.mailOrderNumber
      ? [{ label: '통신판매업 신고번호', value: values.mailOrderNumber, num: true }]
      : []),
    ...(appliedAt ? [{ label: '신청일', value: formatDate(appliedAt), num: true }] : []),
  ]

  return (
    <section className={classes.root} aria-label={title}>
      <div className={classes.head}>
        <Heading className={classes.title}>
          <NotebookPen size={16} aria-hidden="true" />
          {title}
        </Heading>
        {onEditShop && (
          <Button variant="subtle" size="sm" onClick={onEditShop} aria-label={`${title} 수정`}>
            수정
          </Button>
        )}
      </div>
      <dl className={classes.list}>
        {rows.map((row) => (
          <div key={row.label} className={classes.row}>
            <dt>{row.label}</dt>
            <dd className={row.num ? 'pd-num' : undefined}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
