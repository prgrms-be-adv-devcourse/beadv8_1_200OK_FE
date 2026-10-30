import { Image as ImageIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { formatAmount } from '@/shared/lib/format'
import { PriceText } from '@/shared/ui'
import type { OrderItemRowItem } from '../types'
import classes from './OrderItemRow.module.css'

// 주문 상품 한 줄: 사진 64 + (위 줄: 배지·농가) 상품명 · 옵션·수량 · 금액 + 오른쪽 액션
// 주문 목록·상세·배송 조회·문의·리뷰가 같이 쓴다.

export type OrderItemRowProps = {
  item: OrderItemRowItem
  /** 상품명 위 줄 (상태 배지, 농가 이름) */
  meta?: ReactNode
  /** 오른쪽 (버튼·안내) */
  actions?: ReactNode
  /** 금액을 이름 아래에 (기본: 오른쪽) */
  priceBelow?: boolean
}

export function OrderItemRow({ item, meta, actions, priceBelow = false }: OrderItemRowProps) {
  const price = <PriceText amount={item.itemAmount} size="S" />
  return (
    <div className={classes.root}>
      <Link
        to={`/products/${item.productId}`}
        className={classes.thumb}
        tabIndex={-1}
        aria-hidden="true"
      >
        {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" /> : <ImageIcon size={20} />}
      </Link>
      <div className={classes.body}>
        {meta && <div className={classes.meta}>{meta}</div>}
        <Link to={`/products/${item.productId}`} className={classes.name}>
          {item.productName}
        </Link>
        <span className={`pd-num ${classes.option}`}>
          {item.productOptionName} · {formatAmount(item.quantity)}개
        </span>
        {priceBelow && price}
      </div>
      {!priceBelow && <div className={classes.price}>{price}</div>}
      {actions && <div className={classes.actions}>{actions}</div>}
    </div>
  )
}
