import { Minus, Plus } from 'lucide-react'
import { useId } from 'react'
import classes from './QuantityStepper.module.css'

// 수량 스테퍼: 높이 36, 최소 1. 한도에 닿은 버튼은 비활성 + 도움말(최대일 때)
// 바뀐 수량은 aria-live로 읽어 준다.

export type QuantityStepperProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  /** 최대 수량. 없으면 제한 없음 */
  max?: number
  /** 그룹 이름 (예: ‘청송 꿀사과 2kg 수량’) */
  label?: string
  /** 최대에 닿았을 때 도움말 */
  maxHelp?: string
  disabled?: boolean
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  label = '수량',
  maxHelp,
  disabled = false,
}: QuantityStepperProps) {
  const helpId = useId()
  const atMin = value <= min
  const atMax = max !== undefined && value >= max
  const help = atMax ? (maxHelp ?? `최대 ${max}개까지 담을 수 있어요`) : null

  return (
    <div className={classes.root}>
      <fieldset
        className={classes.stepper}
        aria-label={label}
        aria-describedby={help ? helpId : undefined}
        data-disabled={disabled || undefined}
      >
        <button
          type="button"
          className={classes.button}
          aria-label="수량 줄이기"
          disabled={disabled || atMin}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        <output className={classes.value} aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          className={classes.button}
          aria-label="수량 늘리기"
          disabled={disabled || atMax}
          onClick={() => onChange(max === undefined ? value + 1 : Math.min(max, value + 1))}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </fieldset>
      {help && (
        <p id={helpId} className={classes.help}>
          {help}
        </p>
      )}
    </div>
  )
}
