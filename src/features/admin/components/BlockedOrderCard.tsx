import { Alert, Button, Table, Text } from '@mantine/core'
import { CircleAlert } from 'lucide-react'
import { formatDate, formatPrice, formatSignedAmount } from '@/shared/lib/format'
import { payoutEventTypeLabels } from '@/shared/lib/labels'
import { PayoutBlockStatus } from '@/shared/lib/payoutBlockState'
import { DisabledReason, StatusBadge } from '@/shared/ui'
import { needsAdjustment } from '../blockedOrderFilter'
import { failureCategoryLabel, failureReasonLabel, overchargeEvidenceRows } from '../labels'
import type { BlockedOrder, OverchargeEvidence } from '../types'
import classes from '../views/PayoutReviewViews.module.css'

// 막힌 주문 1건: 상태 · 원인 목록 · 대기 조정 합계 · 초과 청구 근거(막힌 때와 지금) · 정산후보 보기 · 해결 · 해결 기록.
// 원인 상세는 내부 검사 내용이라 관리자 화면에만 보이고, React 기본 이스케이프로 그린다.
// 처리 흐름(Swagger 관리자 정산 묶음 설명): 금액·수수료 불일치면 정산후보 확인 → 조정 → 대기 조정 합계 확인 → 해결,
// 그 밖의 사유는 조정하지 않고 원인을 확인한 뒤 해결한다.

const statusHelp: Record<PayoutBlockStatus, string> = {
  [PayoutBlockStatus.LOCKED]: '다시 검사해도 풀리지 않아요. 원인을 고친 뒤 해결해 주세요',
  [PayoutBlockStatus.STOPPED]: '정산 실행에서 3번 실패해 자동 재검사를 멈췄어요',
  [PayoutBlockStatus.RESOLVED]: '해결했어요. 다음 정산 실행이 끝나면 목록에서 빠져요',
}

export type BlockedOrderCardProps = {
  order: BlockedOrder
  onResolve: (order: BlockedOrder) => void
  onShowHistory: (orderId: number) => void
  /** 이 주문의 정산후보 · 조정 보기. 이미 그 주문만 보고 있으면 넘기지 않는다(버튼 없음) */
  onOpenOrder?: (orderId: number) => void
}

/**
 * 초과 청구 줄: 해결 뒤 예상 합계 = 지금 후보 합계 + 대기 조정 합계.
 * 결제 금액보다 크면 다음 금액 검사에서 다시 실패한다. 같거나 작다고 맞게 고친 것은 아니다
 */
function ExpectedTotal({ order }: { order: BlockedOrder }) {
  const now = order.evidenceNow
  if (!now) return null
  const pending = order.pendingSaleAmountAdjustment + order.pendingSaleFeeAdjustment
  const expected = now.candidateTotal + pending
  const over = expected - now.deductedAmount
  return (
    <div className={classes.expected}>
      <p className={`pd-num ${classes.help}`}>
        해결 뒤 예상 합계 {formatPrice(expected)} (지금 후보 합계 {formatPrice(now.candidateTotal)}{' '}
        {pending < 0 ? '−' : '+'} 대기 조정 {formatPrice(Math.abs(pending))}) · 결제 금액{' '}
        {formatPrice(now.deductedAmount)}
      </p>
      {over > 0 ? (
        <Alert color="warning" icon={<CircleAlert />} className={classes.expectedAlert}>
          <span className="pd-num">
            아직 결제 금액보다 {formatPrice(over)} 많아요. 이대로 해결하면 다음 금액 검사에서 다시
            실패해요.
          </span>
        </Alert>
      ) : (
        <p className={classes.help}>
          결제 금액보다 많지 않지만 맞게 고쳤다는 뜻은 아니에요. 정산후보에서 상품별 금액을
          확인하고, 결제 금액에 맞추려고 조정을 더 넣지 마세요.
        </p>
      )}
    </div>
  )
}

function EvidenceTable({
  orderId,
  atBlock,
  now,
}: {
  orderId: number
  atBlock: OverchargeEvidence | null
  now: OverchargeEvidence | null
}) {
  return (
    <Table.ScrollContainer minWidth={480} type="native" className={classes.evidence}>
      <Table aria-label={`주문 ${orderId} 초과 청구 근거`}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>항목</Table.Th>
            <Table.Th className={classes.right}>막힌 때</Table.Th>
            <Table.Th className={classes.right}>지금</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {overchargeEvidenceRows.map(({ key, label, format }) => {
            const before = atBlock ? format(atBlock) : '–'
            const after = now ? format(now) : '–'
            const changed = atBlock !== null && now !== null && before !== after
            return (
              <Table.Tr key={key}>
                <Table.Th scope="row">{label}</Table.Th>
                <Table.Td className={`pd-num ${classes.right}`}>{before}</Table.Td>
                <Table.Td className={`pd-num ${classes.right}`}>
                  {after}
                  {changed && (
                    <Text span fw={600}>
                      {' '}
                      (바뀜)
                    </Text>
                  )}
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}

export function BlockedOrderCard({
  order,
  onResolve,
  onShowHistory,
  onOpenOrder,
}: BlockedOrderCardProps) {
  const titleId = `blocked-order-${order.orderId}`
  const resolved = order.status === PayoutBlockStatus.RESOLVED
  const hasEvidence = order.evidenceAtBlock !== null || order.evidenceNow !== null
  const adjustable = needsAdjustment(order)
  const openLabel = adjustable && !resolved ? '정산후보 보고 조정' : '정산후보 보기'
  const showPending =
    adjustable || order.pendingSaleAmountAdjustment !== 0 || order.pendingSaleFeeAdjustment !== 0

  return (
    <li className={classes.order} aria-labelledby={titleId}>
      <div className={classes.orderHead}>
        <h3 id={titleId} className={`pd-num ${classes.orderTitle}`}>
          주문 {order.orderId}
        </h3>
        <StatusBadge status={order.status} />
      </div>
      <p className={classes.help}>{statusHelp[order.status]}</p>

      <dl className={classes.meta}>
        <dt>마지막 실패</dt>
        <dd className="pd-num">{formatDate(order.lastFailedAt, 'dateTime')}</dd>
        <dt>실패한 실행</dt>
        <dd className="pd-num">{order.failedRunCount}회</dd>
        <dt>판매자</dt>
        <dd className="pd-num">{order.sellerIds.map((id) => `판매자 ${id}`).join(', ')}</dd>
        <dt>사유</dt>
        <dd>
          {order.reasons.map(failureReasonLabel).join(', ')}
          {order.categories.length > 0 &&
            ` (${order.categories.map(failureCategoryLabel).join(', ')})`}
        </dd>
        {showPending && (
          <>
            <dt>대기 조정 · 판매 대금</dt>
            <dd className="pd-num">{formatSignedAmount(order.pendingSaleAmountAdjustment)}원</dd>
            <dt>대기 조정 · 수수료</dt>
            <dd className="pd-num">{formatSignedAmount(order.pendingSaleFeeAdjustment)}원</dd>
          </>
        )}
      </dl>
      {showPending && (
        <p className={classes.help}>
          대기 조정은 지금 해결하면 금액 검사에 들어갈 조정 합계예요. 0원이 아니면 이미 넣은 조정이
          있으니 같은 조정을 또 넣지 마세요.
        </p>
      )}
      {!resolved && adjustable && <ExpectedTotal order={order} />}

      <h4 className={classes.subTitle}>원인 {order.causes.length}건</h4>
      <Table.ScrollContainer minWidth={720} type="native">
        <Table aria-label={`주문 ${order.orderId} 원인`}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>실패 시각</Table.Th>
              <Table.Th>주문상품</Table.Th>
              <Table.Th>종류</Table.Th>
              <Table.Th>사유</Table.Th>
              <Table.Th>판매자</Table.Th>
              <Table.Th>상세</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {order.causes.map((cause) => (
              <Table.Tr
                key={`${cause.orderItemId ?? 'shipping'}-${cause.eventType}-${cause.reason}-${cause.failedAt}`}
              >
                <Table.Td className="pd-num">{formatDate(cause.failedAt, 'dateTime')}</Table.Td>
                <Table.Td className="pd-num">{cause.orderItemId ?? '배송비'}</Table.Td>
                <Table.Td>{payoutEventTypeLabels[cause.eventType] ?? cause.eventType}</Table.Td>
                <Table.Td>
                  {failureReasonLabel(cause.reason)}
                  <Text className={classes.help}>{failureCategoryLabel(cause.category)}</Text>
                </Table.Td>
                <Table.Td className="pd-num">{cause.sellerId}</Table.Td>
                <Table.Td className={classes.detailText}>{cause.detail}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {hasEvidence && (
        <>
          <h4 className={classes.subTitle}>초과 청구 근거</h4>
          <p className={classes.help}>
            막힌 때 값과 지금 값이 다르면 그사이 데이터가 바뀐 거예요. 넘친 금액이 {formatPrice(0)}{' '}
            이하면 초과 청구가 풀렸어요.
          </p>
          <EvidenceTable
            orderId={order.orderId}
            atBlock={order.evidenceAtBlock}
            now={order.evidenceNow}
          />
        </>
      )}

      <div className={classes.actions}>
        {onOpenOrder && (
          <Button
            variant="outline"
            onClick={() => onOpenOrder(order.orderId)}
            aria-label={`주문 ${order.orderId} ${openLabel}`}
          >
            {openLabel}
          </Button>
        )}
        <DisabledReason reason={resolved ? '이미 해결한 주문이에요' : null}>
          <Button
            disabled={resolved}
            onClick={() => onResolve(order)}
            aria-label={`주문 ${order.orderId} 해결`}
          >
            해결
          </Button>
        </DisabledReason>
        <Button
          variant="outline"
          onClick={() => onShowHistory(order.orderId)}
          aria-label={`주문 ${order.orderId} 해결 기록`}
        >
          해결 기록
        </Button>
      </div>
    </li>
  )
}
