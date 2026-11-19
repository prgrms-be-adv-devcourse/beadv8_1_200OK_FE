import { Button, Pagination, Skeleton, Stack, Table, Text } from '@mantine/core'
import { CircleCheck } from 'lucide-react'
import { Link } from 'react-router'
import { formatAmount, formatDate, formatPrice } from '@/shared/lib/format'
import { PageHeader, QueryState } from '@/shared/ui'
import { PayoutSectionTabs } from '../components/PayoutSectionTabs'
import { depositCheckReasonLabels } from '../labels'
import { type DepositCheckReview, PayoutSection } from '../types'
import classes from './PayoutReviewViews.module.css'

// M-03 정산 관리 · 대사 확인 /admin/payouts/deposit-checks?page=
// ✅ GET /api/v1/admin/payouts/deposit-checks. 매일 지갑에 정산 입금을 물어 확인하지 못한 정산만 온다.
// 조회 전용이다: 서버에 다시 보내기·완료 표시 API가 없다.

export type DepositChecksViewProps = {
  onSectionChange: (section: PayoutSection) => void
  status: 'pending' | 'error' | 'success'
  errorMessage?: string
  onRetry?: () => void
  checks: DepositCheckReview[]
  totalElements: number
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
}

function walletAnswer(check: DepositCheckReview) {
  if (check.walletPayeeId === null || check.walletAmount === null) return '–'
  return `판매자 ${check.walletPayeeId} · ${formatPrice(check.walletAmount)}`
}

export function DepositChecksView({
  onSectionChange,
  status,
  errorMessage,
  onRetry,
  checks,
  totalElements,
  page = 1,
  totalPages = 1,
  onPageChange,
}: DepositChecksViewProps) {
  return (
    <div className={classes.root}>
      <PageHeader title="정산 관리" hideOnMobile />
      <PayoutSectionTabs value={PayoutSection.DEPOSIT_CHECKS} onChange={onSectionChange} />

      <section className={classes.panel} aria-labelledby="deposit-checks-title">
        <div className={classes.panelHead}>
          <h2 id="deposit-checks-title" className={classes.title}>
            대사 확인
          </h2>
          <Text className={classes.desc}>
            매일 지갑에 정산 입금을 물어 맞춰 봐요. 3번 물어도 확인하지 못했거나 입금이 어긋난
            정산을 보여 줘요. 여기서는 조회만 하고 자동으로 고치지 않아요.
          </Text>
        </div>

        <QueryState
          status={status === 'success' && checks.length === 0 ? 'empty' : status}
          skeleton={
            <Stack gap="sm" p="md">
              <Skeleton h={52} radius="md" />
              <Skeleton h={52} radius="md" />
              <Skeleton h={52} radius="md" />
            </Stack>
          }
          loadingLabel="대사 확인 목록을 불러오고 있어요"
          onRetry={onRetry}
          errorMessage={errorMessage}
          empty={{
            icon: <CircleCheck />,
            title: '확인할 정산이 없어요',
            description: '지갑 입금이 어긋난 정산이 생기면 여기에 보여요.',
          }}
        >
          <div className={classes.tableWrap}>
            <Table.ScrollContainer minWidth={880} type="native">
              <Table aria-label="대사 확인 목록">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>정산번호</Table.Th>
                    <Table.Th>이유</Table.Th>
                    <Table.Th>정산 (판매자 · 금액)</Table.Th>
                    <Table.Th>지갑 답 (판매자 · 금액)</Table.Th>
                    <Table.Th>물어본 횟수</Table.Th>
                    <Table.Th>마지막으로 물은 시각</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {checks.map((check) => {
                    const reason = depositCheckReasonLabels[check.reason]
                    return (
                      <Table.Tr key={check.payoutId}>
                        <Table.Td>
                          <Button
                            component={Link}
                            to={`/admin/payouts/${check.payoutId}`}
                            variant="subtle"
                            size="sm"
                            className="pd-num"
                            aria-label={`정산 ${check.payoutId} 상세 보기`}
                          >
                            {check.payoutId}
                          </Button>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={600} size="sm">
                            {reason?.label ?? check.reason}
                          </Text>
                          {reason && <Text className={classes.help}>{reason.help}</Text>}
                        </Table.Td>
                        <Table.Td className="pd-num">
                          판매자 {check.payeeId} · {formatPrice(check.amount)}
                        </Table.Td>
                        <Table.Td className="pd-num">{walletAnswer(check)}</Table.Td>
                        <Table.Td className="pd-num">
                          {check.attemptCount}회 (없음 {check.notFoundCount}회)
                        </Table.Td>
                        <Table.Td className="pd-num">
                          {formatDate(check.lastAskedAt, 'dateTime')}
                        </Table.Td>
                      </Table.Tr>
                    )
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </div>

          {totalPages > 1 && (
            <Pagination
              className={classes.pagination}
              total={totalPages}
              value={page}
              onChange={onPageChange}
              getControlProps={(control) => ({
                'aria-label': control === 'previous' ? '이전 페이지' : '다음 페이지',
              })}
            />
          )}
          <Text className={`pd-num ${classes.sum}`}>
            확인할 정산 {formatAmount(totalElements)}건
          </Text>
        </QueryState>
      </section>
    </div>
  )
}
