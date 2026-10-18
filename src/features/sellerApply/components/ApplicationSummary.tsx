import { Button } from '@mantine/core'
import { NotebookPen } from 'lucide-react'
import { formatDate } from '@/shared/lib/format'
import type { SellerApplyRequest } from '../types'
import classes from './ApplicationSummary.module.css'

// 신청 정보 장부: 확인 단계(묶음별 ‘수정’), 신청 완료, 신청 현황이 같이 쓴다.
// 계좌번호는 확인 단계에서만 전부 보이고, 나머지는 가린다.

/** 앞 4자리 + ••••- + 끝 4자리 */
export function maskAccount(account: string) {
  const digits = account.replace(/\D/g, '')
  return digits.length > 6 ? `${account.slice(0, 4)}••••-${digits.slice(-4)}` : account
}

type Row = { label: string; value: string; num?: boolean }

function Ledger({
  title,
  rows,
  onEdit,
  headingLevel: Heading,
}: {
  title: string
  rows: Row[]
  onEdit?: () => void
  headingLevel: 'h2' | 'h3'
}) {
  return (
    <section className={classes.root} aria-label={title}>
      <div className={classes.head}>
        <Heading className={classes.title}>
          <NotebookPen size={16} aria-hidden="true" />
          {title}
        </Heading>
        {onEdit && (
          <Button variant="subtle" size="sm" onClick={onEdit} aria-label={`${title} 수정`}>
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

export type ApplicationSummaryProps = {
  values: SellerApplyRequest
  appliedAt?: string
  /** 확인 단계: 묶음 둘로 나누고 ‘수정’ 버튼, 계좌번호 전부 */
  onEditShop?: () => void
  onEditAccount?: () => void
  headingLevel?: 'h2' | 'h3'
}

export function ApplicationSummary({
  values,
  appliedAt,
  onEditShop,
  onEditAccount,
  headingLevel = 'h2',
}: ApplicationSummaryProps) {
  const shopRows: Row[] = [
    { label: '상호명', value: values.storeName },
    { label: '대표자', value: values.representativeName },
    { label: '사업자등록번호', value: values.businessNumber, num: true },
    { label: '통신판매업 신고번호', value: values.mailOrderNumber, num: true },
  ]

  if (onEditShop || onEditAccount) {
    return (
      <div className={classes.stack}>
        <Ledger title="상점 정보" rows={shopRows} onEdit={onEditShop} headingLevel={headingLevel} />
        <Ledger
          title="정산 계좌"
          rows={[
            { label: '은행', value: values.bankName },
            { label: '계좌번호', value: values.accountNumber, num: true },
            { label: '예금주', value: values.accountHolder },
          ]}
          onEdit={onEditAccount}
          headingLevel={headingLevel}
        />
      </div>
    )
  }

  return (
    <Ledger
      title="신청 정보"
      headingLevel={headingLevel}
      rows={[
        ...shopRows,
        {
          label: '정산 계좌',
          value: `${values.bankName} ${maskAccount(values.accountNumber)} · ${values.accountHolder}`,
          num: true,
        },
        ...(appliedAt ? [{ label: '신청일', value: formatDate(appliedAt), num: true }] : []),
      ]}
    />
  )
}
