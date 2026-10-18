import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core'
import { CircleCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Controller, type FieldPath, useForm } from 'react-hook-form'
import { formatAmount, formatDate, formatPrice, formatSignedAmount } from '@/shared/lib/format'
import { useServerFieldErrors } from '@/shared/lib/useServerFieldErrors'
import { DisabledReason, PriceText } from '@/shared/ui'
import {
  ADJUST_REASON_MAX,
  type AdjustmentFormValues,
  adjustmentSchema,
  formatSignedInput,
  parseSignedAmount,
} from '../schemas'
import type {
  AdjustLookup,
  AdjustmentInput,
  AdjustmentLog,
  AdjustmentResult,
  AdjustTarget,
} from '../types'
import classes from './AdjustmentPanel.module.css'

// 정산 조정. 시안: admin/AdminSettlements ‘정산 조정’ + 확인 모달
// 기존 기록은 지우지 않고 조정 금액(−/+)을 한 줄 더한다. 오류 3종: 없는 주문 상품 · 사유 없음 · 0원 미만.
// 왼쪽 입력 + 미리보기, 오른쪽 최근 조정 내역.
// TODO(api): 📝 POST /payout/payouts/adjustments. 조정 대상 금액 조회·조정 내역 목록은 API 없음(❌)

type MaybeAsync = unknown

export type AdjustmentPanelProps = {
  /** 입력한 주문 상품의 지금 정산 금액 */
  lookup: AdjustLookup
  /** 주문 상품 번호가 바뀌면 부른다 (숫자가 아니면 null) */
  onOrderItemChange: (orderItemId: number | null) => void
  onSubmit: (input: AdjustmentInput) => MaybeAsync
  submitting?: boolean
  /** 방금 저장한 조정 */
  result: AdjustmentResult | null
  /** 최근 조정 (최신순) */
  logs: AdjustmentLog[]
  /** 서버 오류(404 없는 주문 상품 · 422 0원 미만 등)를 입력에 붙인다. 문구는 서버 detail */
  serverErrors?: Partial<Record<keyof AdjustmentFormValues, string>>
  defaultValues?: Partial<AdjustmentFormValues>
  /** 처음부터 검사해 오류를 보여 준다 (미리보기) */
  defaultShowErrors?: boolean
}

const LOG_LIMIT = 3

const empty: AdjustmentFormValues = { orderItemId: '', amount: '', reason: '' }

/** 스키마 밖 검사: 주문 상품이 있는지 · 조정 후 0원 미만 */
function lookupErrors(
  values: AdjustmentFormValues,
  lookup: AdjustLookup,
): [FieldPath<AdjustmentFormValues>, string][] {
  const errors: [FieldPath<AdjustmentFormValues>, string][] = []
  if (lookup.status === 'notFound') {
    errors.push(['orderItemId', '없는 주문 상품 번호예요. 번호를 다시 확인해 주세요'])
  }
  if (lookup.status === 'found') {
    const { currentAmount } = lookup.target
    if (currentAmount + parseSignedAmount(values.amount) < 0) {
      errors.push([
        'amount',
        `조정 후 금액이 0원보다 적어져요. 이 주문 상품은 ${formatPrice(-currentAmount)}까지 뺄 수 있어요`,
      ])
    }
  }
  return errors
}

function Preview({ lookup, amount }: { lookup: AdjustLookup; amount: number }) {
  if (lookup.status !== 'found') {
    const text = {
      idle: '주문 상품 번호를 입력하면 원래 정산 금액과 조정 후 금액을 미리 보여 드려요.',
      pending: '정산 금액을 찾고 있어요',
      notFound: '입력한 번호와 맞는 주문 상품이 없어요. 번호를 다시 확인해 주세요.',
    }[lookup.status]
    return (
      <div className={classes.ledger} aria-live="polite">
        <Text className={classes.help}>{text}</Text>
      </div>
    )
  }
  const target = lookup.target
  const after = target.currentAmount + amount
  return (
    <section className={classes.ledger} aria-label="조정 미리보기" aria-live="polite">
      <dl className={classes.rows}>
        <div>
          <dt>주문 상품</dt>
          <dd className="pd-num">
            {target.orderItemId} · {target.payeeName}
          </dd>
        </div>
        <div>
          <dt>정산</dt>
          <dd className="pd-num">
            {target.payoutId} · {formatDate(target.payoutCreatedAt, 'monthDay')} 정산
          </dd>
        </div>
        <div>
          <dt>원래 정산 금액</dt>
          <dd>
            <PriceText amount={target.currentAmount} size="S" />
          </dd>
        </div>
        <div>
          <dt>조정 금액</dt>
          <dd className="pd-num">{formatSignedAmount(amount)}원</dd>
        </div>
        <div className={classes.afterRow}>
          <dt>조정 후 정산 금액</dt>
          <dd className="pd-num" data-negative={after < 0 || undefined}>
            {formatPrice(target.currentAmount)} → {formatPrice(after)}
          </dd>
        </div>
      </dl>
      {target.priorAdjustmentCount > 0 && (
        <Text className={`pd-num ${classes.help}`}>
          이전 조정 {formatAmount(target.priorAdjustmentCount)}건(
          {formatSignedAmount(target.priorAdjustmentTotal)}원)을 반영한 금액이에요
        </Text>
      )}
    </section>
  )
}

function ConfirmRows({
  values,
  target,
}: {
  values: AdjustmentFormValues
  target: AdjustTarget | null
}) {
  const amount = parseSignedAmount(values.amount)
  return (
    <div className={classes.ledger}>
      <dl className={classes.rows}>
        <div>
          <dt>주문 상품</dt>
          <dd className="pd-num">
            {values.orderItemId.trim()}
            {target && ` · ${target.payeeName}`}
          </dd>
        </div>
        <div>
          <dt>조정 금액</dt>
          <dd className="pd-num">{formatSignedAmount(amount)}원</dd>
        </div>
        {target && (
          <div>
            <dt>정산 금액</dt>
            <dd className="pd-num">
              {formatPrice(target.currentAmount)} → {formatPrice(target.currentAmount + amount)}
            </dd>
          </div>
        )}
        <div>
          <dt>사유</dt>
          <dd>{values.reason.trim()}</dd>
        </div>
      </dl>
    </div>
  )
}

function Logs({ logs }: { logs: AdjustmentLog[] }) {
  const recent = logs.slice(0, LOG_LIMIT)
  return (
    <section className={classes.logs} aria-labelledby="adjust-log-title">
      <div className={classes.logsHead}>
        <h3 id="adjust-log-title" className={classes.logsTitle}>
          조정 내역
        </h3>
        <span className={`pd-num ${classes.help}`}>최근 {formatAmount(recent.length)}건</span>
      </div>
      {recent.length === 0 ? (
        <Text className={`${classes.help} ${classes.logsEmpty}`}>아직 조정한 내역이 없어요</Text>
      ) : (
        <ul className={classes.logList}>
          {recent.map((log) => (
            <li key={log.adjustmentId}>
              <div className={classes.logLine}>
                <strong className="pd-num">주문 상품 {log.orderItemId}</strong>
                <strong className={`pd-num ${classes.logAmount}`}>
                  {formatSignedAmount(log.amount)}원
                </strong>
              </div>
              <div className={classes.logLine}>
                <span className={classes.help}>{log.payeeName}</span>
                <span className={`pd-num ${classes.help}`}>
                  정산 금액 {formatPrice(log.before)} → {formatPrice(log.after)}
                </span>
              </div>
              <span className={classes.logReason}>사유 · {log.reason}</span>
              <span className={`pd-num ${classes.help}`}>
                {formatDate(log.createdAt, 'dateTime')} · {log.adminName}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className={`${classes.help} ${classes.logsFoot}`}>
        조정은 지울 수 없어요. 잘못 조정했다면 반대 금액으로 한 번 더 조정해요.
      </p>
    </section>
  )
}

export function AdjustmentPanel({
  lookup,
  onOrderItemChange,
  onSubmit,
  submitting = false,
  result,
  logs,
  serverErrors,
  defaultValues,
  defaultShowErrors = false,
}: AdjustmentPanelProps) {
  const [confirming, setConfirming] = useState<AdjustmentFormValues | null>(null)
  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { ...empty, ...defaultValues },
  })
  useServerFieldErrors(setError, serverErrors)

  const orderItemId = watch('orderItemId').trim()
  const amountText = watch('amount')
  const amount = parseSignedAmount(amountText)

  const onChangeRef = useRef(onOrderItemChange)
  onChangeRef.current = onOrderItemChange
  useEffect(() => {
    onChangeRef.current(/^\d+$/.test(orderItemId) ? Number(orderItemId) : null)
  }, [orderItemId])

  const applyLookupErrors = (values: AdjustmentFormValues, focus: boolean) => {
    const extra = lookupErrors(values, lookup)
    extra.forEach(([field, message], i) => {
      setError(field, { type: 'lookup', message }, { shouldFocus: focus && i === 0 })
    })
    return extra.length
  }

  // 미리보기: 처음부터 오류를 보여 준다
  const lookupRef = useRef(lookup)
  lookupRef.current = lookup
  useEffect(() => {
    if (!defaultShowErrors) return
    void trigger().then(() => {
      lookupErrors(getValues(), lookupRef.current).forEach(([field, message]) => {
        setError(field, { type: 'lookup', message })
      })
    })
  }, [defaultShowErrors, trigger, getValues, setError])

  const submit = handleSubmit(
    (values) => {
      if (applyLookupErrors(values, true) > 0) return
      setConfirming(values)
    },
    (fieldErrors) => {
      // 형식 오류와 함께 주문 상품·0원 미만 오류도 같이 보여 준다 (형식 오류가 없는 칸만)
      const values = getValues()
      lookupErrors(values, lookup)
        .filter(([field]) => !fieldErrors[field])
        .forEach(([field, message]) => {
          setError(field, { type: 'lookup', message })
        })
    },
  )

  const save = async () => {
    if (!confirming) return
    try {
      await onSubmit({
        orderItemId: Number(confirming.orderItemId.trim()),
        amount: parseSignedAmount(confirming.amount),
        reason: confirming.reason.trim(),
      })
      setConfirming(null)
      reset(empty)
    } catch {
      // 모달을 열어 두고 서버 오류는 serverErrors로 받는다
    }
  }

  const disabled = !orderItemId || amount === 0

  return (
    <section className={classes.root} aria-labelledby="adjust-title">
      <form className={classes.form} onSubmit={submit} noValidate>
        <div>
          <h2 id="adjust-title" className={classes.title}>
            정산 조정
          </h2>
          <Text className={classes.desc}>
            정산이나 정산 후보 금액을 고쳐야 할 때 써요. 기존 기록은 지우지 않고, 조정 금액(−/+)을
            한 줄 더해 남겨요.
          </Text>
        </div>

        {result && (
          <Alert color="success" icon={<CircleCheck />}>
            <span className="pd-num">
              주문 상품 {result.orderItemId} 정산 금액을 {formatSignedAmount(result.amount)}원
              조정했어요. {formatPrice(result.before)} → {formatPrice(result.after)}으로 기록했어요.
            </span>
          </Alert>
        )}

        <TextInput
          label="주문 상품 번호"
          placeholder="예: 1210"
          inputMode="numeric"
          classNames={{ input: 'pd-num' }}
          {...register('orderItemId')}
          error={errors.orderItemId?.message}
        />
        <Controller
          control={control}
          name="amount"
          render={({ field, fieldState }) => (
            <TextInput
              label="조정 금액"
              description="빼려면 앞에 - 를 붙여요. 더하려면 숫자만 입력해요."
              inputWrapperOrder={['label', 'input', 'error', 'description']}
              placeholder="예: -10,000"
              classNames={{ input: `pd-num ${classes.amountInput}` }}
              rightSection={<span aria-hidden="true">원</span>}
              ref={field.ref}
              name={field.name}
              value={field.value}
              onBlur={field.onBlur}
              onChange={(e) => field.onChange(formatSignedInput(e.currentTarget.value))}
              error={fieldState.error?.message}
            />
          )}
        />
        <TextInput
          label="사유"
          placeholder="예: 구매확정 후 환불 회수"
          maxLength={ADJUST_REASON_MAX}
          {...register('reason')}
          error={errors.reason?.message}
        />

        <Preview lookup={lookup} amount={amount} />

        <div className={classes.submit}>
          <DisabledReason
            reason={disabled ? '주문 상품 번호와 조정 금액을 입력하면 조정할 수 있어요' : null}
          >
            <Button type="submit" disabled={disabled}>
              조정하기
            </Button>
          </DisabledReason>
          {!disabled && (
            <Text className={classes.help}>저장하기 전에 조정 내용을 한 번 더 보여 드려요</Text>
          )}
        </div>
      </form>

      <Logs logs={logs} />

      <Modal
        opened={confirming !== null}
        onClose={() => setConfirming(null)}
        title="정산 금액을 조정할까요?"
        closeOnClickOutside={!submitting}
        closeOnEscape={!submitting}
      >
        {confirming && (
          <Stack gap="md">
            <Text className={classes.desc}>
              기존 정산은 지우지 않고 조정 기록을 한 줄 더해요. 저장한 조정은 지울 수 없어요.
              바로잡으려면 반대 금액으로 다시 조정해요.
            </Text>
            <ConfirmRows
              values={confirming}
              target={lookup.status === 'found' ? lookup.target : null}
            />
            <Group justify="flex-end" gap="xs">
              <Button variant="outline" disabled={submitting} onClick={() => setConfirming(null)}>
                닫기
              </Button>
              <Button loading={submitting} onClick={save}>
                조정 저장
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </section>
  )
}
