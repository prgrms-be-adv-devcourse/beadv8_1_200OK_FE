import { Button, Skeleton, Stack, Table, Text } from '@mantine/core'
import { ListChecks } from 'lucide-react'
import {
  type AdjustablePayoutEventType,
  type PayoutCandidate,
  PayoutEventType,
} from '@/shared/api/types'
import { formatAmount, formatDate, formatSignedAmount } from '@/shared/lib/format'
import { payoutEventTypeLabels } from '@/shared/lib/labels'
import {
  isPayoutAdjustmentCheckStatus,
  PayoutAdjustmentCheckStatus,
} from '@/shared/lib/payoutAdjustmentCheck'
import { QueryState, StatusBadge } from '@/shared/ui'
import classes from '../views/PayoutReviewViews.module.css'

// 한 주문의 정산후보 전부(대기 중 · 정산됨 · 조정). ✅ GET /api/v1/admin/payouts/candidates?orderId&size=100 (기간 없이).
// 막힌 주문을 조정할 때 상품별 금액을 보고, 줄의 ‘조정’으로 조정 칸을 채운다. 배송비(주문 항목 없음)는 조정할 수 없다.
// 조정 사유는 입력 원문이라 React 기본 이스케이프로 그린다.
// 조정 줄에는 금액 검사 상태(adjustmentCheckStatus) 배지를 붙이고, 표 아래에 나온 상태의 뜻과 할 일을 적는다.
// 서버는 조정을 막지 않고 이 값으로 알리기만 해서, 검사 밖 조정을 여기서 알아채야 한다(Swagger 정산후보 조회 설명).

export type OrderCandidatesTableProps = {
  orderId: number
  status: 'pending' | 'error' | 'success'
  candidates: PayoutCandidate[]
  errorMessage?: string
  onRetry?: () => void
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  /** 넘기면 줄마다 ‘조정’ 버튼을 그린다 */
  onAdjust?: (target: { orderItemId: number; eventType: AdjustablePayoutEventType }) => void
}

const isAdjustable = (
  candidate: PayoutCandidate,
): candidate is PayoutCandidate & {
  orderItemId: number
  eventType: AdjustablePayoutEventType
} => candidate.orderItemId !== null && candidate.eventType !== PayoutEventType.SALE_SHIPPING_FEE

/** 주문 상품 순, 같은 상품은 판매 대금 → 수수료, 원래 후보 → 조정 순. 배송비는 끝 */
const typeOrder: Record<PayoutEventType, number> = {
  [PayoutEventType.SALE_AMOUNT]: 0,
  [PayoutEventType.SALE_FEE]: 1,
  [PayoutEventType.SALE_SHIPPING_FEE]: 2,
}

/** 표 아래 안내. 표에 나온 상태만 이 순서로 보여 준다 */
const checkGuides: [PayoutAdjustmentCheckStatus, string][] = [
  [
    PayoutAdjustmentCheckStatus.UNCHECKED,
    '금액 검사 없이 지급에만 들어가요. 막힘과 상관없는 보상이면 그대로 두고, 의도한 조정이 아니면 다음 정산 실행 전에 사유를 다르게 적어 반대 금액으로 상쇄해요.',
  ],
  [
    PayoutAdjustmentCheckStatus.AWAITING_RESOLUTION,
    '막힌 주문을 해결하면 금액 검사에 들어가 확인됨이 돼요.',
  ],
  [
    PayoutAdjustmentCheckStatus.CONFIRMED,
    '해결할 때 금액 검사에 들어갔어요. 반대 금액으로 상쇄하지 마세요. 지급에는 두 조정이 다 들어가 결제 금액보다 많이 나갈 수 있어요.',
  ],
]

function sortCandidates(candidates: PayoutCandidate[]) {
  return [...candidates].sort(
    (a, b) =>
      (a.orderItemId ?? Number.MAX_SAFE_INTEGER) - (b.orderItemId ?? Number.MAX_SAFE_INTEGER) ||
      typeOrder[a.eventType] - typeOrder[b.eventType] ||
      Number(a.adjustment !== null) - Number(b.adjustment !== null) ||
      a.candidateId - b.candidateId,
  )
}

export function OrderCandidatesTable({
  orderId,
  status,
  candidates,
  errorMessage,
  onRetry,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onAdjust,
}: OrderCandidatesTableProps) {
  const shownChecks = new Set(
    candidates.map((c) => c.adjustmentCheckStatus).filter(isPayoutAdjustmentCheckStatus),
  )
  const guides = checkGuides.filter(([status]) => shownChecks.has(status))

  return (
    <QueryState
      status={status === 'success' && candidates.length === 0 ? 'empty' : status}
      skeleton={
        <Stack gap="xs">
          <Skeleton h={40} radius="md" />
          <Skeleton h={40} radius="md" />
          <Skeleton h={40} radius="md" />
        </Stack>
      }
      loadingLabel="정산후보를 불러오고 있어요"
      onRetry={onRetry}
      errorMessage={errorMessage}
      empty={{
        icon: <ListChecks />,
        title: '이 주문의 정산후보가 없어요',
        description: '구매확정 전이거나 주문 번호가 틀렸을 수 있어요.',
      }}
    >
      <Table.ScrollContainer minWidth={760} type="native">
        <Table aria-label={`주문 ${orderId} 정산후보`}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>주문상품</Table.Th>
              <Table.Th>종류</Table.Th>
              <Table.Th>판매자</Table.Th>
              <Table.Th className={classes.right}>금액</Table.Th>
              <Table.Th>정산</Table.Th>
              <Table.Th>조정</Table.Th>
              <Table.Th>생성 시각</Table.Th>
              {onAdjust && <Table.Th>처리</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortCandidates(candidates).map((candidate) => (
              <Table.Tr key={candidate.candidateId}>
                <Table.Td className="pd-num">{candidate.orderItemId ?? '배송비'}</Table.Td>
                <Table.Td>
                  {payoutEventTypeLabels[candidate.eventType] ?? candidate.eventType}
                </Table.Td>
                <Table.Td className="pd-num">{candidate.sellerId}</Table.Td>
                <Table.Td className={`pd-num ${classes.right}`}>
                  {candidate.adjustment
                    ? `${formatSignedAmount(candidate.amount)}원`
                    : `${formatAmount(candidate.amount)}원`}
                </Table.Td>
                <Table.Td className="pd-num">
                  {candidate.settled ? `정산됨 · ${candidate.payoutId ?? '–'}` : '대기'}
                </Table.Td>
                <Table.Td>
                  {candidate.adjustment ? (
                    <>
                      <span className="pd-num">
                        조정 {candidate.adjustment.adjustmentId} · 관리자{' '}
                        {candidate.adjustment.adminId}
                      </span>
                      {isPayoutAdjustmentCheckStatus(candidate.adjustmentCheckStatus) && (
                        <span className={classes.checkStatus}>
                          <span className={classes.help}>금액 검사</span>
                          <StatusBadge status={candidate.adjustmentCheckStatus} size="sm" inline />
                        </span>
                      )}
                      <Text className={`${classes.help} ${classes.detailText}`}>
                        {candidate.adjustment.reason}
                      </Text>
                    </>
                  ) : (
                    <span className={classes.help}>원래 후보</span>
                  )}
                </Table.Td>
                <Table.Td className="pd-num">
                  {formatDate(candidate.candidateCreatedAt, 'dateTime')}
                </Table.Td>
                {onAdjust && (
                  <Table.Td>
                    {isAdjustable(candidate) && !candidate.adjustment ? (
                      <Button
                        variant="subtle"
                        size="sm"
                        onClick={() =>
                          onAdjust({
                            orderItemId: candidate.orderItemId,
                            eventType: candidate.eventType,
                          })
                        }
                        aria-label={`주문상품 ${candidate.orderItemId} ${payoutEventTypeLabels[candidate.eventType]} 조정`}
                      >
                        조정
                      </Button>
                    ) : (
                      <span className={classes.help}>–</span>
                    )}
                  </Table.Td>
                )}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {guides.length > 0 && (
        <ul className={classes.checkGuides} aria-label="조정의 금액 검사 상태">
          {guides.map(([status, text]) => (
            <li key={status}>
              <StatusBadge status={status} size="sm" inline />
              <span className={classes.desc}>{text}</span>
            </li>
          ))}
        </ul>
      )}
      {hasMore && (
        <Button variant="subtle" fullWidth loading={loadingMore} onClick={onLoadMore}>
          정산후보 더 보기
        </Button>
      )}
    </QueryState>
  )
}
