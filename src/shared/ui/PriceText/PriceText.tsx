import { VisuallyHidden } from '@mantine/core'
import { formatAmount } from '@/shared/lib/format'
import classes from './PriceText.module.css'

// 금액 표기: 숫자 + 0.85배 ‘원’, tabular-nums (design/tokens.md 2장)
// 할인: 할인율(accent) → 판매가 → 취소선 정가. 차감: −717원(기본색)

export type PriceTextSize = 'L' | 'M' | 'S'

export type PriceTextProps = {
  amount: number
  /** L 26/34(모바일 24/32) · M 18/26(17/24) · S 15/22 */
  size?: PriceTextSize
  /** 할인율(%). 0보다 크면 판매가 앞에 accent로 */
  discountRate?: number
  /** 정가. amount보다 크면 취소선으로 함께 보여 준다 */
  listPrice?: number
  /** 차감 표기(−). 부호와 상관없이 빼는 금액으로 보여 준다 */
  deduct?: boolean
  /** inline: 할인율 · 판매가 · 정가 한 줄 / stacked: 위에 할인율 · 정가, 아래 판매가 (상품 상세) */
  layout?: 'inline' | 'stacked'
  className?: string
}

function Won({ amount }: { amount: number }) {
  return (
    <>
      {formatAmount(amount)}
      <span className="pd-won">원</span>
    </>
  )
}

export function PriceText({
  amount,
  size = 'M',
  discountRate,
  listPrice,
  deduct = false,
  layout = 'inline',
  className,
}: PriceTextProps) {
  const value = deduct ? -Math.abs(amount) : amount
  const hasRate = discountRate !== undefined && discountRate > 0
  const hasListPrice = listPrice !== undefined && listPrice > amount

  const rate = hasRate && (
    <span className={classes.rate}>
      {discountRate}%<VisuallyHidden> 할인</VisuallyHidden>
    </span>
  )
  const list = hasListPrice && (
    <s className={classes.list}>
      <VisuallyHidden>정가 </VisuallyHidden>
      <Won amount={listPrice} />
    </s>
  )
  const sale = (
    <span className={classes.amount}>
      <Won amount={value} />
    </span>
  )

  if (layout === 'stacked' && (rate || list)) {
    return (
      <span
        className={[classes.root, className].filter(Boolean).join(' ')}
        data-size={size}
        data-layout="stacked"
      >
        <span className={classes.row}>
          {rate}
          {list}
        </span>
        {sale}
      </span>
    )
  }

  return (
    <span className={[classes.root, className].filter(Boolean).join(' ')} data-size={size}>
      {rate}
      {sale}
      {list}
    </span>
  )
}
