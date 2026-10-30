import { Radio, Select, Stack } from '@mantine/core'
import type { ProductOption } from '@/shared/api/types'
import { MAX_CART_QUANTITY } from '@/shared/lib/constants'
import { formatPrice, formatQuantity } from '@/shared/lib/format'
import { OptionCard, PriceText, QuantityStepper } from '@/shared/ui'
import classes from './PurchaseForm.module.css'

// 옵션 선택 → 수량 → 총 상품 금액. 상세 데스크톱 오른쪽과 모바일 옵션 시트가 같이 쓴다.
// 옵션 5개 이하는 옵션 카드, 넘으면 Select(design/COMPONENTS.md). 품절 옵션은 고를 수 없다.
// 수량 상한은 API에 없어 MAX_CART_QUANTITY(가정)로 막는다.

export type PurchaseFormProps = {
  productName: string
  options: ProductOption[]
  selectedOptionId: number | null
  onSelectOption: (optionId: number) => void
  quantity: number
  onQuantityChange: (quantity: number) => void
  /** 살 수 없는 상품이면 고르기·수량을 막는다 */
  disabled?: boolean
  /** ‘옵션 선택’ 라벨을 화면에서 숨긴다 (제목이 같은 옵션 시트) */
  hideOptionLabel?: boolean
}

export function PurchaseForm({
  productName,
  options,
  selectedOptionId,
  onSelectOption,
  quantity,
  onQuantityChange,
  disabled = false,
  hideOptionLabel = false,
}: PurchaseFormProps) {
  const selected = options.find((option) => option.optionId === selectedOptionId)
  const value = selectedOptionId === null ? null : String(selectedOptionId)

  return (
    <Stack gap="lg">
      {options.length <= 5 ? (
        <Radio.Group
          label={hideOptionLabel ? undefined : '옵션 선택'}
          aria-label={hideOptionLabel ? '옵션 선택' : undefined}
          value={value}
          onChange={(next) => onSelectOption(Number(next))}
          classNames={{ label: classes.legend }}
        >
          <Stack gap="xs">
            {options.map((option) => (
              <OptionCard key={option.optionId} option={option} disabled={disabled} />
            ))}
          </Stack>
        </Radio.Group>
      ) : (
        <Select
          label={hideOptionLabel ? undefined : '옵션 선택'}
          aria-label={hideOptionLabel ? '옵션 선택' : undefined}
          placeholder="옵션을 골라 주세요"
          disabled={disabled}
          value={value}
          onChange={(next) => next && onSelectOption(Number(next))}
          data={options.map((option) => ({
            value: String(option.optionId),
            label: `${option.name} · ${formatPrice(option.salePrice)}${option.soldOut ? ' (품절)' : ''}`,
            disabled: option.soldOut,
          }))}
        />
      )}

      <div className={classes.quantity}>
        <span className={classes.label} aria-hidden="true">
          수량
        </span>
        <QuantityStepper
          value={quantity}
          onChange={onQuantityChange}
          max={MAX_CART_QUANTITY}
          label={`${productName} 수량`}
          maxHelp={`한 번에 ${MAX_CART_QUANTITY}개까지 담을 수 있어요`}
          disabled={disabled || !selected}
        />
      </div>

      <div className={classes.total}>
        <div className={classes.totalLabel}>
          <span className={classes.label}>총 상품 금액</span>
          {selected && (
            <span className={`pd-num ${classes.help}`}>
              {formatQuantity(quantity, selected.name)}
            </span>
          )}
        </div>
        <PriceText amount={selected ? selected.salePrice * quantity : 0} size="L" />
      </div>
    </Stack>
  )
}
