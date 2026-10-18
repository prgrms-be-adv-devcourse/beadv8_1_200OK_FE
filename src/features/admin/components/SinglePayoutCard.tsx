import { Alert, Button, Group, Text, TextInput } from '@mantine/core'
import { CircleCheck } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import type { SinglePayoutResult } from '../types'
import classes from './PayoutCards.module.css'

// 주문 상품 번호로 1건 정산. 시안: admin/AdminSettlements ‘주문 상품 번호로 1건 정산’
// 오류 2종(구매확정 전 · 이미 정산됨)은 서버 detail을 입력 아래에 보여 준다.
// TODO(api): 📝 POST /payout/run/orderItems/{orderItemId}. 주문 상품 번호는 API의 orderItemId(숫자)

type MaybeAsync = unknown

export type SinglePayoutCardProps = {
  running?: boolean
  /** 마지막으로 보낸 번호의 결과. 번호를 고치면 숨긴다 */
  result: SinglePayoutResult | null
  onRun: (orderItemId: number) => MaybeAsync
  /** 처음 입력값 (미리보기: result와 같이 준다) */
  defaultOrderItemId?: string
}

export function SinglePayoutCard({
  running = false,
  result,
  onRun,
  defaultOrderItemId = '',
}: SinglePayoutCardProps) {
  const [value, setValue] = useState(defaultOrderItemId)
  const [sent, setSent] = useState<string | null>(defaultOrderItemId || null)
  const [formatError, setFormatError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const reasonId = useId()
  const trimmed = value.trim()
  const shown = result && sent === trimmed ? result : null
  const error = formatError ?? (shown?.kind === 'error' ? shown.message : null)

  const submit = () => {
    if (!/^\d+$/.test(trimmed)) {
      setFormatError('주문 상품 번호는 숫자로 입력해 주세요')
      inputRef.current?.focus()
      return
    }
    setSent(trimmed)
    onRun(Number(trimmed))
  }

  return (
    <section className={classes.card} aria-labelledby="payout-single-title">
      <h2 id="payout-single-title" className={classes.title}>
        주문 상품 번호로 1건 정산
      </h2>
      <Text className={classes.desc}>자동 정산에서 빠진 주문 상품 1건만 바로 정산해요.</Text>
      <form
        className={classes.inlineForm}
        onSubmit={(e) => {
          e.preventDefault()
          if (trimmed) submit()
        }}
      >
        <Group gap="xs" align="flex-start" wrap="nowrap">
          <TextInput
            ref={inputRef}
            className={classes.grow}
            label="주문 상품 번호"
            placeholder="예: 1301"
            inputMode="numeric"
            classNames={{ input: 'pd-num' }}
            value={value}
            onChange={(e) => {
              setValue(e.currentTarget.value)
              setFormatError(null)
            }}
            error={error}
          />
          <Button
            type="submit"
            variant="outline"
            className={classes.inlineButton}
            disabled={!trimmed}
            loading={running}
            aria-describedby={trimmed ? undefined : reasonId}
          >
            정산
          </Button>
        </Group>
        {/* 비활성 이유. 입력 옆 버튼이라 DisabledReason 대신 줄 아래에 둔다 */}
        <Text id={reasonId} className={classes.help} hidden={Boolean(trimmed)}>
          주문 상품 번호를 입력하면 정산할 수 있어요
        </Text>
      </form>
      {shown?.kind === 'success' && (
        <Alert color="success" icon={<CircleCheck />}>
          <span className="pd-num">
            주문 상품 {shown.orderItemId} 정산을 마쳤어요. 판매자 지갑으로 입금돼요.
          </span>
        </Alert>
      )}
    </section>
  )
}
