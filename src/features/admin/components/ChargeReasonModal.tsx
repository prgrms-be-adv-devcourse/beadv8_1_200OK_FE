import { Alert, Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core'
import { CircleX, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { formatPrice } from '@/shared/lib/format'
import { type AdminCharge, ChargeAction, chargeActionLabels } from '../charges'
import { CHARGE_REASON_MAX, chargeReasonSchema } from '../schemas'
import classes from '../views/AdminChargesViews.module.css'

// 충전 건 실패 처리 · 결제 취소 사유 모달. 사유는 필수(200자 이하)이고 충전 건에 남는다. 결제 취소 사유는 토스에도 간다.
// 결제 취소는 실제 환불이라 사유를 쓴 뒤 확인 단계를 한 번 더 거친다(토스에서 이미 취소된 결제는 기록만 해서 바로 보낸다).
// 서버 422는 serverError로 받아 칸에 붙이고, 503 같은 오류는 errorMessage로 위에 보여 준다.

type MaybeAsync = unknown

export type ReasonAction = ChargeAction.FAIL | ChargeAction.CANCEL_PAYMENT

export type ChargeReasonModalProps = {
  /** null이면 닫힘 */
  action: ReasonAction | null
  charge: Pick<AdminCharge, 'chargeNo' | 'amount' | 'memberId'>
  /** 토스에서 이미 취소된 결제 (결제 취소가 기록만 한다) */
  alreadyCanceled?: boolean
  onClose: () => void
  onConfirm: (reason: string) => MaybeAsync
  submitting?: boolean
  serverError?: string | null
  errorMessage?: string | null
  /** 미리보기: 처음 사유 · 단계 */
  defaultReason?: string
  defaultStep?: Step
}

type Step = 'reason' | 'confirm'

export function ChargeReasonModal({ action, ...rest }: ChargeReasonModalProps) {
  return (
    <Modal
      opened={action !== null}
      onClose={rest.onClose}
      title={action === null ? '' : titleOf(action, rest.alreadyCanceled)}
      closeOnClickOutside={!rest.submitting}
      closeOnEscape={!rest.submitting}
    >
      {action !== null && <ReasonForm key={action} action={action} {...rest} />}
    </Modal>
  )
}

const titleOf = (action: ReasonAction, alreadyCanceled = false) =>
  action === ChargeAction.CANCEL_PAYMENT && alreadyCanceled
    ? '결제 취소 기록'
    : chargeActionLabels[action]

function ReasonForm({
  action,
  charge,
  alreadyCanceled = false,
  onClose,
  onConfirm,
  submitting = false,
  serverError = null,
  errorMessage = null,
  defaultReason = '',
  defaultStep = 'reason',
}: Omit<ChargeReasonModalProps, 'action'> & { action: ReasonAction }) {
  const [reason, setReason] = useState(defaultReason)
  const [step, setStep] = useState<Step>(defaultStep)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const refund = action === ChargeAction.CANCEL_PAYMENT && !alreadyCanceled
  const amount = formatPrice(charge.amount)

  useEffect(() => {
    if (!serverError) return
    setStep('reason')
    setError(serverError)
    // 확인 단계에서 돌아오면 칸이 그려진 뒤 focus한다
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [serverError])

  useEffect(() => {
    if (step === 'confirm') backRef.current?.focus()
  }, [step])

  const parse = () => {
    const parsed = chargeReasonSchema.safeParse(reason)
    if (parsed.success) return parsed.data
    setError(parsed.error.issues[0]?.message ?? '사유를 입력해 주세요')
    inputRef.current?.focus()
    return null
  }

  const submit = () => {
    const value = parse()
    if (value === null) return
    if (refund) setStep('confirm')
    else onConfirm(value)
  }

  const errorAlert = errorMessage && (
    <Alert color="error" icon={<CircleX />}>
      {errorMessage}
    </Alert>
  )

  if (step === 'confirm') {
    return (
      <Stack gap="md">
        {errorAlert}
        <Alert color="warning" icon={<TriangleAlert />} title="정말 결제를 취소할까요?">
          <span className="pd-num">
            회원 {charge.memberId}에게 {amount}을 환불해요. 되돌릴 수 없어요.
          </span>
        </Alert>
        <Text size="sm" className={classes.chargeNo}>
          사유: {reason.trim()}
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button
            ref={backRef}
            variant="outline"
            onClick={() => setStep('reason')}
            disabled={submitting}
          >
            돌아가기
          </Button>
          <Button color="red" loading={submitting} onClick={() => onConfirm(reason.trim())}>
            환불하기
          </Button>
        </Group>
      </Stack>
    )
  }

  return (
    <Stack gap="md">
      <Text className={classes.desc}>
        {action === ChargeAction.FAIL
          ? '충전 건을 실패로 끝내요. 잔액은 늘지 않고 되돌릴 수 없어요.'
          : alreadyCanceled
            ? '토스에서 이미 취소된 결제예요. 다시 취소하지 않고 충전 건에 취소 기록만 남겨요.'
            : `토스 결제 ${amount}을 전액 취소해 회원에게 돌려줘요. 사유는 토스에도 보내요.`}
      </Text>
      <Text size="sm" className={`pd-num ${classes.chargeNo} ${classes.help}`}>
        {charge.chargeNo}
      </Text>
      {errorAlert}
      <Textarea
        ref={inputRef}
        label="사유"
        description="충전 건 기록에 남아요."
        inputWrapperOrder={['label', 'input', 'error', 'description']}
        placeholder={
          action === ChargeAction.FAIL
            ? '예: 토스 결제 확인 결과 승인되지 않음'
            : '예: 실패 처리 뒤 승인된 결제라 환불함'
        }
        autosize
        minRows={3}
        maxLength={CHARGE_REASON_MAX}
        value={reason}
        onChange={(e) => {
          setReason(e.currentTarget.value)
          setError(null)
        }}
        error={error}
        data-autofocus
      />
      <Group justify="flex-end" gap="xs">
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          닫기
        </Button>
        <Button color={refund ? 'red' : undefined} loading={submitting} onClick={submit}>
          {refund ? '다음' : titleOf(action, alreadyCanceled)}
        </Button>
      </Group>
    </Stack>
  )
}
