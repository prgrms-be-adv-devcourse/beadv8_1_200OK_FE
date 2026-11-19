import { type Refund, RefundStatus } from '@/shared/api/refund'
import { PriceText } from '../PriceText/PriceText'
import classes from './RefundAmounts.module.css'

// 환불 금액 표. 구매자(주문 상세·취소 요청 내역)와 판매자(취소 요청 처리)가 같이 쓴다.
// 배송비는 판매자가 승인할 때 정해져서, 승인 전에는 배송비 칸 대신 그 사실을 적는다.
// 합계는 서버가 계산한 refundAmount를 그대로 쓴다(화면에서 더하고 빼지 않는다).

type AmountView = 'undecided' | 'decided' | 'notRefunded'

const viewOf: Record<RefundStatus, AmountView> = {
  [RefundStatus.REQUESTED]: 'undecided',
  [RefundStatus.PROCESSING]: 'decided',
  [RefundStatus.COMPLETED]: 'decided',
  [RefundStatus.REJECTED]: 'notRefunded',
  [RefundStatus.WITHDRAWN]: 'notRefunded',
}

export type RefundAmountsProps = {
  refund: Pick<
    Refund,
    | 'status'
    | 'itemAmount'
    | 'shippingFeeAmount'
    | 'remoteAreaFeeAmount'
    | 'deductedShippingFeeAmount'
    | 'refundAmount'
  >
}

export function RefundAmounts({ refund }: RefundAmountsProps) {
  const view = viewOf[refund.status]
  return (
    <div className={classes.root}>
      <dl className={classes.rows}>
        <div>
          <dt>상품 금액</dt>
          <dd>
            <PriceText amount={refund.itemAmount} size="S" />
          </dd>
        </div>
        {view === 'undecided' && (
          <div>
            <dt>배송비</dt>
            <dd className={classes.muted}>승인할 때 정해져요</dd>
          </div>
        )}
        {view === 'decided' && refund.shippingFeeAmount > 0 && (
          <div>
            <dt>배송비 환불</dt>
            <dd>
              <PriceText amount={refund.shippingFeeAmount} size="S" />
            </dd>
          </div>
        )}
        {view === 'decided' && refund.remoteAreaFeeAmount > 0 && (
          <div>
            <dt>도서산간 운임 환불</dt>
            <dd>
              <PriceText amount={refund.remoteAreaFeeAmount} size="S" />
            </dd>
          </div>
        )}
        {view === 'decided' && refund.deductedShippingFeeAmount > 0 && (
          <div>
            <dt>배송비 차감</dt>
            <dd>
              <PriceText amount={refund.deductedShippingFeeAmount} size="S" deduct />
            </dd>
          </div>
        )}
        <div className={classes.total}>
          <dt>{view === 'undecided' ? '환불 예정 금액' : '환불 금액'}</dt>
          <dd>
            {view === 'notRefunded' ? (
              <span className={classes.muted}>환불하지 않아요</span>
            ) : (
              <PriceText amount={refund.refundAmount} size="M" />
            )}
          </dd>
        </div>
      </dl>
      {view === 'undecided' && (
        <p className={classes.note}>
          묶음 상품을 모두 취소하면 낸 배송비도 돌려받아요. 일부만 취소해 무료배송 기준 아래로
          내려가면 배송비를 빼고 환불해요.
        </p>
      )}
      {view === 'decided' && refund.deductedShippingFeeAmount > 0 && (
        <p className={classes.note}>남은 상품이 무료배송 기준 아래라 배송비를 뺐어요.</p>
      )}
    </div>
  )
}
