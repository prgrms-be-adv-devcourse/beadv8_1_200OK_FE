import { Button } from '@mantine/core'
import { Link } from 'react-router'
import { type Refund, RefundStatus } from '@/shared/api/refund'
import { formatAmount, formatDate } from '@/shared/lib/format'
import { RefundAmounts, RefundStatusBadge } from '@/shared/ui'
import classes from './RefundCard.module.css'

// 취소 요청 한 건: 상태 · 상품 · 사유 · 환불 금액 + 승인 전이면 철회.
// 주문 상세의 ‘취소 요청’ 칸과 취소 요청 내역(/orders/refunds)이 같이 쓴다.

const statusHelp: Record<RefundStatus, string> = {
  [RefundStatus.REQUESTED]: '판매자가 확인하고 있어요. 승인 전에는 철회할 수 있어요.',
  [RefundStatus.PROCESSING]: '판매자가 승인했어요. 예치금으로 돌려주고 있어요.',
  [RefundStatus.COMPLETED]: '예치금으로 돌려줬어요.',
  [RefundStatus.REJECTED]: '취소되지 않았어요. 상품은 그대로 보내 드려요.',
  [RefundStatus.WITHDRAWN]: '요청을 거뒀어요. 출고 전이면 다시 요청할 수 있어요.',
  [RefundStatus.FAILED]:
    '취소를 처리하지 못해 되돌렸어요. 주문은 그대로 유지돼요. 출고 전이면 다시 요청할 수 있어요.',
}

export type RefundCardProps = {
  refund: Refund
  /** 주문 상세로 가는 링크 (취소 요청 내역에서만) */
  showOrderLink?: boolean
  onWithdraw?: (refundId: number) => void
  withdrawing?: boolean
}

export function RefundCard({
  refund,
  showOrderLink = false,
  onWithdraw,
  withdrawing = false,
}: RefundCardProps) {
  const titleId = `refund-${refund.refundId}`
  return (
    <article className={classes.root} aria-labelledby={titleId}>
      <div className={classes.body}>
        <div className={classes.head}>
          <RefundStatusBadge status={refund.status} />
          <span className={`pd-num ${classes.help}`}>
            {formatDate(refund.requestedAt, 'dateTime')} 요청
          </span>
        </div>
        <h3 id={titleId} className={classes.name}>
          {refund.productName}
        </h3>
        <span className={`pd-num ${classes.help}`}>
          {refund.optionName} · {formatAmount(refund.quantity)}개 취소
        </span>
        <p className={classes.help}>{statusHelp[refund.status]}</p>
        <dl className={classes.kv}>
          {refund.cancelReason && (
            <div>
              <dt>취소 사유</dt>
              <dd>{refund.cancelReason}</dd>
            </div>
          )}
          {refund.rejectReason && (
            <div>
              <dt>{refund.status === RefundStatus.FAILED ? '실패 이유' : '거절 사유'}</dt>
              <dd>{refund.rejectReason}</dd>
            </div>
          )}
        </dl>
      </div>
      <div className={classes.side}>
        <RefundAmounts refund={refund} />
        <div className={classes.actions}>
          {showOrderLink && (
            <Button
              component={Link}
              to={`/orders/${refund.orderId}`}
              variant="subtle"
              size="sm"
              aria-label={`주문번호 ${refund.orderId} 주문 상세`}
            >
              주문 상세
            </Button>
          )}
          {refund.status === RefundStatus.REQUESTED && onWithdraw && (
            <Button
              variant="outline"
              size="sm"
              loading={withdrawing}
              aria-label={`${refund.productName} 취소 요청 철회`}
              onClick={() => onWithdraw(refund.refundId)}
            >
              요청 철회
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
