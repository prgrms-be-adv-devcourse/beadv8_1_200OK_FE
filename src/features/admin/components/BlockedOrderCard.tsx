import { Button, Table, Text } from '@mantine/core'
import { formatDate, formatPrice } from '@/shared/lib/format'
import { payoutEventTypeLabels } from '@/shared/lib/labels'
import { PayoutBlockStatus } from '@/shared/lib/payoutBlockState'
import { DisabledReason, StatusBadge } from '@/shared/ui'
import { failureCategoryLabel, failureReasonLabel, overchargeEvidenceRows } from '../labels'
import type { BlockedOrder, OverchargeEvidence } from '../types'
import classes from '../views/PayoutReviewViews.module.css'

// 막힌 주문 1건: 상태 · 원인 목록 · 초과 청구 근거(막힌 때와 지금) · 해결 · 해결 기록.
// 원인 상세는 내부 검사 내용이라 관리자 화면에만 보이고, React 기본 이스케이프로 그린다.

const statusHelp: Record<PayoutBlockStatus, string> = {
  [PayoutBlockStatus.LOCKED]: '다시 검사해도 풀리지 않아요. 원인을 고친 뒤 해결해 주세요',
  [PayoutBlockStatus.STOPPED]: '정산 실행에서 3번 실패해 자동 재검사를 멈췄어요',
  [PayoutBlockStatus.RESOLVED]: '해결했어요. 다음 정산 실행이 끝나면 목록에서 빠져요',
}

export type BlockedOrderCardProps = {
  order: BlockedOrder
  onResolve: (order: BlockedOrder) => void
  onShowHistory: (orderId: number) => void
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

export function BlockedOrderCard({ order, onResolve, onShowHistory }: BlockedOrderCardProps) {
  const titleId = `blocked-order-${order.orderId}`
  const resolved = order.status === PayoutBlockStatus.RESOLVED
  const hasEvidence = order.evidenceAtBlock !== null || order.evidenceNow !== null

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
      </dl>

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
