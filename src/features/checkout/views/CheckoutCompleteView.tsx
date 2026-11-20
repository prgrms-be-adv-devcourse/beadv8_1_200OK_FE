import { Alert, Button, ThemeIcon } from '@mantine/core'
import { CircleAlert, CircleCheck, CircleX, Clock, Info, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import type { OrderDetail } from '@/shared/api/types'
import { formatAmount, formatDate } from '@/shared/lib/format'
import { PriceText } from '@/shared/ui'
import type { PaymentResult } from '../types'
import classes from './CheckoutCompleteView.module.css'

// B-06 주문 완료 /checkout/complete?orderId=. 시안: b2c/Checkout (주문 완료 상태)
// 주문 생성 응답은 orderId만 준다. 금액·상품은 ✅ 주문 상세, 남은 예치금은 ✅ 잔액 API로 채운다(못 받았으면 주문번호만).
// 결제 결과(payment)에 따라 제목·안내·버튼이 바뀐다. 남은 예치금은 결제 완료일 때만 보여 준다(#76).
// TODO(api): 농가 이름은 주문 상세에 없다(sellerId만).

export type CheckoutCompleteViewProps = {
  orderId: number
  /** 결제 결과. waiting = 확인 중, timedOut = 오래 결제 대기라 주문 내역에서 확인 */
  payment: PaymentResult
  order?: OrderDetail
  sellerNames?: Record<number, string>
  /** 결제 후 남은 예치금 (결제 완료일 때만 그린다) */
  balance?: number
}

const heads: Record<
  PaymentResult,
  { title: string; description?: string; color: string; icon: LucideIcon }
> = {
  paid: { title: '주문이 완료됐어요', color: 'success', icon: CircleCheck },
  waiting: {
    title: '결제 확인 중이에요',
    description: '잠시만 기다려 주세요. 결제가 끝나면 이 화면에 바로 보여 드려요.',
    color: 'info',
    icon: Clock,
  },
  timedOut: {
    title: '결제 확인이 늦어지고 있어요',
    description: '주문 내역에서 결제 결과를 확인해 주세요.',
    color: 'warning',
    icon: CircleAlert,
  },
  failed: {
    title: '결제하지 못했어요',
    description: '예치금은 빠져나가지 않았어요. 장바구니에서 다시 주문해 주세요.',
    color: 'error',
    icon: CircleX,
  },
}

export function CheckoutCompleteView({
  orderId,
  payment,
  order,
  sellerNames = {},
  balance,
}: CheckoutCompleteViewProps) {
  const shippingGroups = order?.sellerGroups.length ?? 0
  const head = heads[payment]
  const Icon = head.icon
  const paid = payment === 'paid'

  return (
    <div className={classes.root}>
      {/* 결제 결과가 바뀌면 읽어 준다 */}
      <div className={classes.head} role="status">
        <ThemeIcon color={head.color} variant="light" size={64} radius="50%" aria-hidden="true">
          <Icon size={32} />
        </ThemeIcon>
        <h1 className={classes.title}>{head.title}</h1>
        <p className={`pd-num ${classes.meta}`}>
          주문번호 {orderId > 0 ? orderId : '–'}
          {order ? ` · ${formatDate(order.orderedAt, 'dateTime')}` : ''}
        </p>
        {head.description && <p className={classes.description}>{head.description}</p>}
      </div>

      {order && payment !== 'failed' && (
        <section className={classes.card} aria-label="결제 내역">
          <dl className={classes.rows}>
            <div className={classes.strong}>
              <dt>{paid ? '결제 금액' : '주문 금액'}</dt>
              <dd>
                <PriceText amount={order.totalAmount} size="M" />
              </dd>
            </div>
            {paid && balance !== undefined && (
              <div>
                <dt>남은 예치금</dt>
                <dd>
                  <PriceText amount={balance} size="S" />
                </dd>
              </div>
            )}
          </dl>
          <ul className={classes.items}>
            {order.sellerGroups.flatMap((group) =>
              group.items.map((item) => (
                <li key={item.orderItemId}>
                  <span>
                    {sellerNames[group.sellerId] ? `${sellerNames[group.sellerId]} · ` : ''}
                    {item.productName} {item.productOptionName} × {formatAmount(item.quantity)}
                  </span>
                  <PriceText amount={item.itemAmount} size="S" />
                </li>
              )),
            )}
            <li>
              <span className="pd-num">배송비 (농가 {shippingGroups}곳)</span>
              <PriceText amount={order.totalShippingFee} size="S" />
            </li>
            {order.totalRemoteAreaFee > 0 && (
              <li>
                <span>도서산간 추가 운임</span>
                <PriceText amount={order.totalRemoteAreaFee} size="S" />
              </li>
            )}
          </ul>
        </section>
      )}

      {paid && (
        <Alert color="info" icon={<Info />}>
          농가에서 상품을 준비하면 송장이 등록돼요. 송장 등록 전까지 취소를 요청할 수 있어요.
        </Alert>
      )}

      <div className={classes.actions}>
        <Button component={Link} to="/" variant="outline" size="lg">
          쇼핑 계속하기
        </Button>
        {payment === 'failed' ? (
          <Button component={Link} to="/cart" size="lg">
            장바구니로
          </Button>
        ) : payment === 'timedOut' ? (
          <Button component={Link} to="/orders" size="lg">
            주문 내역 보기
          </Button>
        ) : (
          <Button component={Link} to={`/orders/${orderId}`} size="lg">
            주문 상세 보기
          </Button>
        )}
      </div>
    </div>
  )
}
