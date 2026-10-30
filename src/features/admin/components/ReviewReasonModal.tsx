import { Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core'
import { useEffect, useRef, useState } from 'react'
import type { SellerApplicationAdminDetail } from '@/shared/api/types'
import { REVIEW_REASON_MAX, reviewReasonSchema } from '../schemas'
import classes from './ReviewReasonModal.module.css'

// 반려 사유 모달. 시안: admin/AdminSellers (모달)
// 사유는 신청자(판매자)의 신청 내역에 그대로 보인다. 서버 422(사유 비었거나 500자 초과)는 serverError로 받아 칸에 붙인다.
// 권한 회수(suspend) 모달은 API가 없어 뺐다(❌).

export type ReviewReasonKind = 'reject'

type MaybeAsync = unknown

const copy = {
  title: '반려',
  placeholder: '예: 통신판매업 신고번호를 확인할 수 없어요',
  description: '신청자에게 반려 사유로 보여요. 고친 뒤 바로 다시 신청할 수 있어요.',
}

export type ReviewReasonModalProps = {
  kind: ReviewReasonKind | null
  application: Pick<SellerApplicationAdminDetail, 'storeName' | 'representativeName'>
  onClose: () => void
  /** 실패하면 reject(throw)해서 모달을 열어 둔다 */
  onConfirm: (reason: string) => MaybeAsync
  submitting?: boolean
  /** 서버가 돌려준 사유 오류(422). 입력 아래에 보여 주고 focus한다 */
  serverError?: string | null
}

export function ReviewReasonModal({ kind, application, ...rest }: ReviewReasonModalProps) {
  return (
    <Modal
      opened={kind !== null}
      onClose={rest.onClose}
      title={kind ? copy.title : ''}
      closeOnClickOutside={!rest.submitting}
      closeOnEscape={!rest.submitting}
    >
      {kind && <ReasonForm key={kind} application={application} {...rest} />}
    </Modal>
  )
}

function ReasonForm({
  application,
  onClose,
  onConfirm,
  submitting = false,
  serverError = null,
}: Omit<ReviewReasonModalProps, 'kind'>) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!serverError) return
    setError(serverError)
    inputRef.current?.focus()
  }, [serverError])

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
      <Textarea
        ref={inputRef}
        label="사유"
        description={copy.description}
        inputWrapperOrder={['label', 'input', 'error', 'description']}
        placeholder={copy.placeholder}
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
        <Button loading={submitting} onClick={submit}>
          {copy.title}
        </Button>
      </Group>
    </Stack>
  )
}
