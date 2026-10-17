import { CheckIcon, Radio } from '@mantine/core'
import type { ProductOption } from '@/shared/api/types'
import { PriceText } from '../PriceText/PriceText'
import classes from './OptionCard.module.css'

// 옵션 라디오 카드 (옵션 5개 이하일 때, 넘으면 Select). 행 높이 56, 옵션명 왼쪽 · 가격 오른쪽.
// <Radio.Group value onChange> 안에 둔다. 값은 String(optionId).
// 재고 수량은 API에 없어 ‘N개 남았어요’는 표시하지 않는다(DECISIONS.md A-7). 품절은 비활성.

export type OptionCardProps = {
  option: ProductOption
}

export function OptionCard({ option }: OptionCardProps) {
  return (
    <Radio.Card
      className={classes.card}
      value={String(option.optionId)}
      disabled={option.soldOut}
      radius="sm"
    >
      <Radio.Indicator
        className={classes.indicator}
        size="sm"
        icon={CheckIcon}
        disabled={option.soldOut}
      />
      <span className={classes.name}>{option.name}</span>
      <span className={classes.price}>
        <PriceText amount={option.salePrice} size="S" />
        {option.soldOut && <span className={classes.soldOut}>품절</span>}
      </span>
    </Radio.Card>
  )
}
