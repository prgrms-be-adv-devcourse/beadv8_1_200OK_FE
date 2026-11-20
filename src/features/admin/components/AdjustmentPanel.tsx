import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Group, Modal, NativeSelect, Stack, Text, TextInput } from '@mantine/core'
import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Controller, type FieldPath, useForm } from 'react-hook-form'
import {
  type AdjustablePayoutEventType,
  type PayoutCandidate,
  PayoutEventType,
} from '@/shared/api/types'
import { formatAmount, formatDate, formatPrice, formatSignedAmount } from '@/shared/lib/format'
import { payoutEventTypeLabels } from '@/shared/lib/labels'
import {
  isPayoutAdjustmentCheckStatus,
  PayoutAdjustmentCheckStatus,
} from '@/shared/lib/payoutAdjustmentCheck'
import { useServerFieldErrors } from '@/shared/lib/useServerFieldErrors'
import { DisabledReason, PriceText, StatusBadge } from '@/shared/ui'
import {
  ADJUST_REASON_MAX,
  type AdjustmentFormValues,
  adjustmentSchema,
  formatSignedInput,
  parseSignedAmount,
} from '../schemas'
import type { AdjustmentInput, AdjustmentLog, AdjustmentResult } from '../types'
import classes from './AdjustmentPanel.module.css'

// 정산 조정. 시안: admin/AdminSettlements ‘정산 조정’ + 확인 모달
// 기존 기록은 지우지 않고 조정 금액(−/+)을 한 줄 더한다. 오류: 사유 없음 · 0원 · (후보를 알 때) 이 주문에 없는 상품 · 0원 미만 · 서버 422.
// ✅ POST /api/v1/admin/payouts/adjustments { orderItemId, eventType, amount, reason } → 201. 배송비는 조정할 수 없다.
// 주문 상품 번호만으로 금액을 찾는 API는 없다. 막힌 주문 탭에서 한 주문을 열면 그 주문의 정산후보(candidates)를 받아
// 고른 주문 상품·종류의 지금 금액(원래 + 조정)을 미리 보여 준다. 정산 탭에서는 금액 미리보기 없이 서버 검증에 맡긴다.
// 조정 내역 목록 API도 없어서, ‘조정 내역’은 이 화면을 연 동안 저장한 조정(201 응답)만 쌓는다.
// 201의 adjustmentCheckStatus(넣은 순간의 금액 검사 상태)를 결과와 내역에 보여 준다. 서버는 조정을 막지 않으니
// 검사 밖(UNCHECKED)이면 경고하고 반대 금액 상쇄를 안내한다. 확인됨 조정은 상쇄하면 돈이 더 나가 상쇄하지 말라고 한다.

type MaybeAsync = unknown

/** 후보 줄에서 고른 조정 대상. nonce가 바뀔 때마다 칸을 채우고 금액 칸으로 옮긴다 */
export type AdjustmentPreset = {
  orderItemId: number
  eventType: AdjustablePayoutEventType
  nonce: number
}

export type AdjustmentPanelProps = {
  /** 실패하면 reject(throw)한다. 422는 serverErrors, 나머지는 errorMessage로 돌아온다 */
  onSubmit: (input: AdjustmentInput) => MaybeAsync
  submitting?: boolean
  /** 방금 저장한 조정 (201 응답) */
  result: AdjustmentResult | null
  /** 이 화면에서 저장한 조정 (최신순) */
  logs: AdjustmentLog[]
  /** 칸에 붙일 수 없는 서버 오류(409 같은 조정 · 403 등) */
  errorMessage?: string | null
  /** 서버가 돌려준 칸 오류(422 errors[].path). 문구는 서버 detail */
  serverErrors?: Partial<Record<keyof AdjustmentFormValues, string>>
  defaultValues?: Partial<AdjustmentFormValues>
  /** 처음부터 검사해 오류를 보여 준다 (미리보기) */
  defaultShowErrors?: boolean
  /** 한 주문을 처리하는 중이면 그 주문의 정산후보. 지금 금액 미리보기 · 0원 미만 검사에 쓴다 */
  candidates?: PayoutCandidate[]
  preset?: AdjustmentPreset | null
  /** 제목 아래 설명 (기본: 언제 쓰는지) */
  description?: ReactNode
}

const LOG_LIMIT = 5

const empty: AdjustmentFormValues = {
  orderItemId: '',
  eventType: PayoutEventType.SALE_AMOUNT,
  amount: '',
  reason: '',
}

const adjustableTypes: AdjustablePayoutEventType[] = [
  PayoutEventType.SALE_AMOUNT,
  PayoutEventType.SALE_FEE,
]

const eventTypeOptions = adjustableTypes.map((value) => ({
  value,
  label: payoutEventTypeLabels[value],
}))

/** 한 주문 상품 · 종류의 지금 금액 (원래 후보 + 지금까지 넣은 조정) */
type AdjustTarget = {
  orderItemId: number
  eventType: AdjustablePayoutEventType
  sellerId: number
  original: number
  adjustmentCount: number
  adjustmentTotal: number
  current: number
}

type AdjustLookup =
  | { status: 'idle' }
  | { status: 'notFound' }
  | { status: 'found'; target: AdjustTarget }

function lookupOf(
  candidates: PayoutCandidate[] | undefined,
  orderItemIdText: string,
  eventType: AdjustablePayoutEventType,
): AdjustLookup {
  if (!candidates || !/^\d+$/.test(orderItemIdText)) return { status: 'idle' }
  const orderItemId = Number(orderItemIdText)
  const rows = candidates.filter((c) => c.orderItemId === orderItemId && c.eventType === eventType)
  const originals = rows.filter((c) => !c.adjustment)
  const first = originals[0] ?? rows[0]
  if (!first) return { status: 'notFound' }
  const adjustments = rows.filter((c) => c.adjustment)
  const original = originals.reduce((sum, c) => sum + c.amount, 0)
  const adjustmentTotal = adjustments.reduce((sum, c) => sum + c.amount, 0)
  return {
    status: 'found',
    target: {
      orderItemId,
      eventType,
      sellerId: first.sellerId,
      original,
      adjustmentCount: adjustments.length,
      adjustmentTotal,
      current: original + adjustmentTotal,
    },
  }
}

/** 스키마 밖 검사: 이 주문의 상품인지 · 조정 후 0원 미만 */
function lookupErrors(
  values: AdjustmentFormValues,
  lookup: AdjustLookup,
): [FieldPath<AdjustmentFormValues>, string][] {
  const errors: [FieldPath<AdjustmentFormValues>, string][] = []
  if (lookup.status === 'notFound') {
    errors.push([
      'orderItemId',
      '이 주문의 정산후보에 없는 주문 상품이에요. 번호와 항목을 다시 확인해 주세요',
    ])
  }
  if (lookup.status === 'found') {
    const { current } = lookup.target
    if (current + parseSignedAmount(values.amount) < 0) {
      errors.push([
        'amount',
        `조정 후 금액이 0원보다 적어져요. 이 항목은 ${formatPrice(current)}까지 뺄 수 있어요`,
      ])
    }
  }
  return errors
}

function Preview({
  lookup,
  amount,
  withCandidates,
}: {
  lookup: AdjustLookup
  amount: number
  withCandidates: boolean
}) {
  if (lookup.status !== 'found') {
    const text =
      lookup.status === 'notFound'
        ? '이 주문의 정산후보에 없는 주문 상품이에요. 아래 정산후보 표에서 골라 주세요.'
        : withCandidates
          ? '정산후보 표에서 ‘조정’을 누르거나 주문 상품 번호를 입력하면 지금 금액을 보여 드려요.'
          : '조정 전 금액은 막힌 주문 탭에서 주문 번호로 찾아 정산후보에서 확인해 주세요.'
    return (
      <div className={classes.ledger} aria-live="polite">
        <Text className={classes.help}>{text}</Text>
      </div>
    )
  }
  const target = lookup.target
  const after = target.current + amount
  return (
    <section className={classes.ledger} aria-label="조정 미리보기" aria-live="polite">
      <dl className={classes.rows}>
        <div>
          <dt>주문 상품</dt>
          <dd className="pd-num">
            {target.orderItemId} · 판매자 {target.sellerId}
          </dd>
        </div>
        <div>
          <dt>{payoutEventTypeLabels[target.eventType]}</dt>
          <dd>
            <PriceText amount={target.current} size="S" />
          </dd>
        </div>
        <div>
          <dt>조정 금액</dt>
          <dd className="pd-num">{formatSignedAmount(amount)}원</dd>
        </div>
        <div className={classes.afterRow}>
          <dt>조정 후 금액</dt>
          <dd className="pd-num" data-negative={after < 0 || undefined}>
            {formatPrice(target.current)} → {formatPrice(after)}
          </dd>
        </div>
      </dl>
      {target.adjustmentCount > 0 && (
        <Text className={`pd-num ${classes.help}`}>
          원래 {formatPrice(target.original)}에 이전 조정 {formatAmount(target.adjustmentCount)}건(
          {formatSignedAmount(target.adjustmentTotal)}원)을 더한 금액이에요
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
            {target && ` · 판매자 ${target.sellerId}`}
          </dd>
        </div>
        <div>
          <dt>항목</dt>
          <dd>{payoutEventTypeLabels[values.eventType]}</dd>
        </div>
        <div>
          <dt>조정 금액</dt>
          <dd className="pd-num">{formatSignedAmount(amount)}원</dd>
        </div>
        {target && (
          <div>
            <dt>금액</dt>
            <dd className="pd-num">
              {formatPrice(target.current)} → {formatPrice(target.current + amount)}
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

/** 금액 검사 상태 한 줄: ‘금액 검사’ + 배지. 모르는 값이면 그리지 않는다 */
function CheckStatus({ status }: { status: string | null }) {
  if (!isPayoutAdjustmentCheckStatus(status)) return null
  return (
    <span className={classes.checkStatus}>
      <span className={classes.help}>금액 검사</span>
      <StatusBadge status={status} size="sm" inline />
    </span>
  )
}

/** 방금 저장한 조정. 금액 검사 상태에 따라 할 일을 알려 준다 */
function SavedResult({ result, inOrder }: { result: AdjustmentResult; inOrder: boolean }) {
  const status = isPayoutAdjustmentCheckStatus(result.adjustmentCheckStatus)
    ? result.adjustmentCheckStatus
    : null
  const unchecked = status === PayoutAdjustmentCheckStatus.UNCHECKED
  const saved = (
    <p className={`pd-num ${classes.resultText}`}>
      주문 {result.orderId} · 주문 상품 {result.orderItemId}{' '}
      {payoutEventTypeLabels[result.eventType]} {formatSignedAmount(result.amount)}원 조정을
      저장했어요(조정 번호 {result.adjustmentId}).
    </p>
  )

  if (unchecked) {
    return (
      <Alert color="warning" icon={<TriangleAlert />} title="금액 검사 없이 지급되는 조정이에요">
        {saved}
        <CheckStatus status={status} />
        <p className={classes.resultText}>
          막힘과 상관없는 보상이면 그대로 둬요. 막힌 주문을 고치려던 조정이면 순서가 어긋났어요(실패
          전이거나 이미 해결함). 같은 조정이 이미 있는지 정산후보에서 확인하고, 의도한 조정이 아니면
          다음 정산 실행 전에 사유를 다르게 적어{' '}
          <strong className="pd-num">{formatSignedAmount(-result.amount)}원</strong>으로 상쇄해요.
        </p>
      </Alert>
    )
  }

  const guide =
    status === PayoutAdjustmentCheckStatus.AWAITING_RESOLUTION
      ? inOrder
        ? '막힌 주문을 해결하면 금액 검사에 들어가요. 위 주문 줄의 대기 조정 합계에 들어갔는지 확인한 뒤 해결해 주세요.'
        : '막힌 주문을 해결하면 금액 검사에 들어가요. 막힌 주문 탭에서 이 주문을 찾아 해결해 주세요.'
      : status === PayoutAdjustmentCheckStatus.CONFIRMED
        ? '금액 검사에 들어가요. 이 조정은 반대 금액으로 상쇄하지 마세요. 지급이 결제 금액보다 많아질 수 있어요.'
        : inOrder
          ? '대기 조정 합계에 들어갔는지 확인한 뒤 해결해 주세요.'
          : '원래 정산후보를 따라 정산돼요.'
  return (
    <Alert color="success" icon={<CircleCheck />}>
      {saved}
      <CheckStatus status={status} />
      <p className={classes.resultText}>{guide}</p>
    </Alert>
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
        <span className={`pd-num ${classes.help}`}>이 화면에서 {formatAmount(logs.length)}건</span>
      </div>
      {recent.length === 0 ? (
        <Text className={`${classes.help} ${classes.logsEmpty}`}>
          이 화면에서 저장한 조정이 여기에 쌓여요. 지난 조정은 막힌 주문 탭에서 주문 번호로 찾아
          정산후보에서 봐요.
        </Text>
      ) : (
        <ul className={classes.logList} aria-label="이 화면에서 저장한 조정">
          {recent.map((log) => (
            <li key={log.candidateId}>
              <div className={classes.logLine}>
                <strong className="pd-num">
                  주문 상품 {log.orderItemId} · {payoutEventTypeLabels[log.eventType]}
                </strong>
                <strong className={`pd-num ${classes.logAmount}`}>
                  {formatSignedAmount(log.amount)}원
                </strong>
              </div>
              <span className={`pd-num ${classes.help}`}>
                주문 {log.orderId} · 판매자 {log.sellerId} · 조정 번호 {log.adjustmentId}
              </span>
              <span className={classes.logReason}>사유 · {log.reason}</span>
              <span className={`pd-num ${classes.help}`}>
                {formatDate(log.createdAt, 'dateTime')} · 관리자 {log.adminId}
              </span>
              <CheckStatus status={log.adjustmentCheckStatus} />
            </li>
          ))}
        </ul>
      )}
      <p className={`${classes.help} ${classes.logsFoot}`}>
        조정은 지울 수 없어요. 잘못 조정했다면 사유를 다르게 적어 반대 금액으로 한 번 더 조정해요.
        금액 검사 상태는 저장한 때 값이에요. 해결 대기 조정은 해결하면 확인됨이 되니 지금 상태는
        막힌 주문 탭에서 주문 번호로 찾아 정산후보에서 봐요.
      </p>
    </section>
  )
}

export function AdjustmentPanel({
  onSubmit,
  submitting = false,
  result,
  logs,
  errorMessage = null,
  serverErrors,
  defaultValues,
  defaultShowErrors = false,
  candidates,
  preset,
  description = '정산이나 정산후보 금액을 고쳐야 할 때 써요. 기존 기록은 지우지 않고, 조정 금액(−/+)을 한 줄 더해 남겨요.',
}: AdjustmentPanelProps) {
  const [confirming, setConfirming] = useState<AdjustmentFormValues | null>(null)
  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    setValue,
    setFocus,
    clearErrors,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { ...empty, ...defaultValues },
  })
  useServerFieldErrors(setError, serverErrors)

  const orderItemId = watch('orderItemId').trim()
  const eventType = watch('eventType')
  const amount = parseSignedAmount(watch('amount'))
  const lookup = lookupOf(candidates, orderItemId, eventType)

  // 후보 줄에서 ‘조정’을 누르면 주문 상품 · 항목을 채우고 금액 칸으로 옮긴다 (사유는 남긴다)
  const nonce = preset?.nonce
  const presetRef = useRef(preset)
  presetRef.current = preset
  useEffect(() => {
    const next = presetRef.current
    if (nonce === undefined || !next) return
    setValue('orderItemId', String(next.orderItemId))
    setValue('eventType', next.eventType)
    clearErrors(['orderItemId', 'eventType', 'amount'])
    setFocus('amount')
  }, [nonce, setValue, clearErrors, setFocus])

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
      const extra = lookupErrors(values, lookup)
      extra.forEach(([field, message], i) => {
        setError(field, { type: 'lookup', message }, { shouldFocus: i === 0 })
      })
      if (extra.length > 0) return
      setConfirming(values)
    },
    (fieldErrors) => {
      // 형식 오류와 함께 주문 상품·0원 미만 오류도 같이 보여 준다 (형식 오류가 없는 칸만)
      lookupErrors(getValues(), lookup)
        .filter(([field]) => !fieldErrors[field])
        .forEach(([field, message]) => {
          setError(field, { type: 'lookup', message })
        })
    },
  )

  // 성공·실패 모두 모달을 닫는다. 서버 오류는 패널 위(errorMessage)나 칸(serverErrors)에 보인다
  const save = async () => {
    if (!confirming) return
    try {
      await onSubmit({
        orderItemId: Number(confirming.orderItemId.trim()),
        eventType: confirming.eventType,
        amount: parseSignedAmount(confirming.amount),
        reason: confirming.reason.trim(),
      })
      reset(empty)
    } catch {
      // errorMessage · serverErrors로 받는다
    } finally {
      setConfirming(null)
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
          <Text className={classes.desc}>{description}</Text>
        </div>

        {result && <SavedResult result={result} inOrder={candidates !== undefined} />}
        {errorMessage && !result && (
          <Alert color="error" icon={<CircleX />}>
            {errorMessage}
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
        <NativeSelect
          label="항목"
          description="원래 정산후보와 같은 종류를 골라요. 배송비는 조정할 수 없어요"
          data={eventTypeOptions}
          {...register('eventType')}
          error={errors.eventType?.message}
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
          placeholder="예: 판매 금액 오입력 정정"
          maxLength={ADJUST_REASON_MAX}
          {...register('reason')}
          error={errors.reason?.message}
        />

        <Preview lookup={lookup} amount={amount} withCandidates={candidates !== undefined} />

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
              바로잡으려면 사유를 다르게 적어 반대 금액으로 다시 조정해요.
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
