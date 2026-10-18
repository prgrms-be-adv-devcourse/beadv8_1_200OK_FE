import { Alert, Button, ThemeIcon } from '@mantine/core'
import { CircleCheck, Info } from 'lucide-react'
import { Link } from 'react-router'
import type { Checkout } from '@/shared/api/types'
import { formatAmount } from '@/shared/lib/format'
import { PriceText } from '@/shared/ui'
import classes from './CheckoutCompleteView.module.css'

// B-06 주문 완료 /checkout/complete?orderId=. 시안: b2c/Checkout (주문 완료 상태)
// 주문 생성 응답은 orderId만 준다. 금액·상품은 결제 직전 주문서 값을 넘겨받는다(없으면 주문번호만).
// TODO(api): 주문 시각·남은 예치금은 📝 주문 상세·지갑 API가 생기면 채운다.

export type CheckoutCompleteViewProps = {
  orderId: number
  checkout?: Checkout
  sellerNames?: Record<number, string>
  /** 결제 후 남은 예치금 */
  balanceAfter?: number
}

export function CheckoutCompleteView({
  orderId,
  checkout,
  sellerNames = {},
  balanceAfter,
}: CheckoutCompleteViewProps) {
  const shippingGroups = checkout?.sellerGroups.length ?? 0

  return (
    <div className={classes.root}>
      <div className={classes.head}>
        <ThemeIcon color="success" variant="light" size={64} radius="50%" aria-hidden="true">
          <CircleCheck size={32} />
        </ThemeIcon>
        <h1 className={classes.title}>주문이 완료됐어요</h1>
        <p className={`pd-num ${classes.meta}`}>주문번호 {orderId}</p>
      </div>

      {checkout && (
        <section className={classes.card} aria-label="결제 내역">
          <dl className={classes.rows}>
            <div className={classes.strong}>
              <dt>결제 금액</dt>
              <dd>
                <PriceText amount={checkout.totalAmount} size="M" />
              </dd>
            </div>
            {balanceAfter !== undefined && (
              <div>
                <dt>남은 예치금</dt>
                <dd>
                  <PriceText amount={balanceAfter} size="S" />
                </dd>
              </div>
            )}
          </dl>
          <ul className={classes.items}>
            {checkout.sellerGroups.flatMap((group) =>
              group.items.map((item) => (
                <li key={item.productOptionId}>
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
              <PriceText amount={checkout.totalShippingFee} size="S" />
            </li>
          </ul>
        </section>
      )}

      <Alert color="info" icon={<Info />}>
        농가에서 상품을 준비하면 송장이 등록돼요. 송장 등록 전까지 취소를 요청할 수 있어요.
      </Alert>

      <div className={classes.actions}>
        <Button component={Link} to="/" variant="outline" size="lg">
          쇼핑 계속하기
        </Button>
        <Button component={Link} to={`/orders/${orderId}`} size="lg">
          주문 상세 보기
        </Button>
      </div>
    </div>
  )
}
