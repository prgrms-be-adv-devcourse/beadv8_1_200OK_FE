import { Alert, Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core'
import { TriangleAlert } from 'lucide-react'
import { useRef, useState } from 'react'
import { formatAmount } from '@/shared/lib/format'
import { REVIEW_REASON_MAX, reviewReasonSchema } from '../schemas'
import type { AdminSellerApplication } from '../types'
import classes from './ReviewReasonModal.module.css'

// 반려 · 권한 회수 사유 모달. 시안: admin/AdminSellers (모달)
// 권한 회수는 진행 중 주문 일괄 취소 경고를 먼저 보여 준다. 사유는 신청자(판매자)에게 그대로 보인다.

export type ReviewReasonKind = 'reject' | 'suspend'

type MaybeAsync = unknown

const copy: Record<ReviewReasonKind, { title: string; placeholder: string; description: string }> =
  {
    reject: {
      title: '반려',
      placeholder: '예: 통신판매업 신고번호를 확인할 수 없어요',
      description: '신청자에게 반려 사유로 보여요. 고친 뒤 바로 다시 신청할 수 있어요.',
    },
    suspend: {
      title: '권한 회수',
      placeholder: '예: 출고 지연이 반복돼요',
      description: '판매자에게 정지 사유로 보여요',
    },
  }

function cancelWarning(count: number | null) {
  if (count === null) return '진행 중인 주문이 있으면 모두 취소되고 구매자에게 환불돼요'
  if (count === 0) return '진행 중인 주문은 없어요. 판매 중인 상품은 바로 멈춰요'
  return `진행 중인 주문 ${formatAmount(count)}건이 일괄 취소되고 구매자에게 환불돼요`
}

export type ReviewReasonModalProps = {
  kind: ReviewReasonKind | null
  application: AdminSellerApplication
  onClose: () => void
  onConfirm: (reason: string) => MaybeAsync
  submitting?: boolean
}

export function ReviewReasonModal({ kind, application, ...rest }: ReviewReasonModalProps) {
  return (
    <Modal
      opened={kind !== null}
      onClose={rest.onClose}
      title={kind ? copy[kind].title : ''}
      closeOnClickOutside={!rest.submitting}
      closeOnEscape={!rest.submitting}
    >
      {kind && <ReasonForm key={kind} kind={kind} application={application} {...rest} />}
    </Modal>
  )
}

function ReasonForm({
  kind,
  application,
  onClose,
  onConfirm,
  submitting = false,
}: Omit<ReviewReasonModalProps, 'kind'> & { kind: ReviewReasonKind }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const text = copy[kind]

  const submit = () => {
    const parsed = reviewReasonSchema.safeParse(reason)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '사유를 입력해 주세요')
      inputRef.current?.focus()
      return
    }
    onConfirm(parsed.data)
  }

  return (
    <Stack gap="md">
      <Text className={classes.summary}>
        {application.storeName} · {application.representativeName}
      </Text>
      {kind === 'suspend' && (
        <Alert color="warning" icon={<TriangleAlert />}>
          {cancelWarning(application.activeOrderCount)}
        </Alert>
      )}
      <Textarea
        ref={inputRef}
        label="사유"
        description={text.description}
        inputWrapperOrder={['label', 'input', 'error', 'description']}
        placeholder={text.placeholder}
        autosize
        minRows={3}
        maxLength={REVIEW_REASON_MAX}
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
        <Button
          color={kind === 'suspend' ? 'red' : undefined}
          loading={submitting}
          onClick={submit}
        >
          {text.title}
        </Button>
      </Group>
    </Stack>
  )
}
