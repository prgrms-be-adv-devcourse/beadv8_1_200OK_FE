import { Alert, Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core'
import { CircleAlert, CircleX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { RESOLUTION_MEMO_MAX, resolutionMemoSchema } from '../schemas'
import classes from '../views/PayoutReviewViews.module.css'

// 막힌 주문 해결(다시 처리) 모달. 메모는 해결 기록에 남는다.
// 서버 422(메모 공백·255자 초과)는 serverError로 받아 칸에 붙이고, 409 같은 오류는 errorMessage로 위에 보여 준다.

type MaybeAsync = unknown

export type ResolveOrderModalProps = {
  /** 해결할 주문. null이면 닫힘 */
  orderId: number | null
  onClose: () => void
  onConfirm: (memo: string) => MaybeAsync
  submitting?: boolean
  serverError?: string | null
  errorMessage?: string | null
  /** 해결 전에 다시 볼 것 (예: 금액 불일치인데 대기 조정이 0원) */
  warning?: string | null
  /** 처음 메모 (미리보기) */
  defaultMemo?: string
}

export function ResolveOrderModal({ orderId, ...rest }: ResolveOrderModalProps) {
  return (
    <Modal
      opened={orderId !== null}
      onClose={rest.onClose}
      title={orderId === null ? '' : `주문 ${orderId} 해결`}
      closeOnClickOutside={!rest.submitting}
      closeOnEscape={!rest.submitting}
    >
      {orderId !== null && <MemoForm key={orderId} {...rest} />}
    </Modal>
  )
}

function MemoForm({
  onClose,
  onConfirm,
  submitting = false,
  serverError = null,
  errorMessage = null,
  warning = null,
  defaultMemo = '',
}: Omit<ResolveOrderModalProps, 'orderId'>) {
  const [memo, setMemo] = useState(defaultMemo)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!serverError) return
    setError(serverError)
    inputRef.current?.focus()
  }, [serverError])

  const submit = () => {
    const parsed = resolutionMemoSchema.safeParse(memo)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '메모를 입력해 주세요')
      inputRef.current?.focus()
      return
    }
    onConfirm(parsed.data)
  }

  return (
    <Stack gap="md">
      <Text className={classes.desc}>
        이 주문의 해결되지 않은 실패 기록을 모두 해결로 표시하고, 다음 정산 실행에서 다시 검사해요.
        돈을 바로 보내지 않아요. 데이터나 코드를 고치지 않고 해결하면 다시 막혀요. 되돌릴 수 없어요.
      </Text>
      {warning && (
        <Alert color="warning" icon={<CircleAlert />}>
          {warning}
        </Alert>
      )}
      {errorMessage && (
        <Alert color="error" icon={<CircleX />}>
          {errorMessage}
        </Alert>
      )}
      <Textarea
        ref={inputRef}
        label="해결 메모"
        description="무엇을 확인하거나 고쳤는지 남겨요. 해결 기록에 그대로 보여요."
        inputWrapperOrder={['label', 'input', 'error', 'description']}
        placeholder="예: 차감액을 9,000원으로 바로잡음"
        autosize
        minRows={3}
        maxLength={RESOLUTION_MEMO_MAX}
        value={memo}
        onChange={(e) => {
          setMemo(e.currentTarget.value)
          setError(null)
        }}
        error={error}
        data-autofocus
      />
      <Group justify="flex-end" gap="xs">
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          닫기
        </Button>
        <Button loading={submitting} onClick={submit}>
          해결
        </Button>
      </Group>
    </Stack>
  )
}
