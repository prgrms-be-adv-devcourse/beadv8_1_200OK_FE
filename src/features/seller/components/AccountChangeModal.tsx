import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Button,
  Group,
  Modal,
  NativeSelect,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core'
import { CircleAlert, Info } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { BANKS } from '@/shared/lib/constants'
import {
  ACCOUNT_CHANGE_REASON_MAX,
  type AccountChangeValues,
  accountChangeSchema,
} from '../schemas'
import type { PayoutAccount } from '../types'
import classes from './AccountChangeModal.module.css'

// 정산 계좌 변경 요청 모달. 시안: seller/SellerWallet ‘정산 계좌 변경 요청’
// 바로 바뀌지 않고 관리자가 확인한 뒤 바뀐다(C-6). TODO(api): ❌ 계좌 변경 요청 API 없음

export type AccountChangeModalProps = {
  opened: boolean
  onClose: () => void
  account: PayoutAccount
  onSubmit: (values: AccountChangeValues) => unknown
  submitting?: boolean
  /** 보내기 실패 문구 (서버 detail이 있으면 그것) */
  errorMessage?: string | null
}

const emptyValues: AccountChangeValues = { bankName: '', accountNumber: '', holder: '', reason: '' }

export function AccountChangeModal({
  opened,
  onClose,
  account,
  onSubmit,
  submitting = false,
  errorMessage = null,
}: AccountChangeModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="정산 계좌 변경 요청"
      withCloseButton={!submitting}
      closeOnClickOutside={!submitting}
      closeOnEscape={!submitting}
    >
      {opened && (
        <AccountChangeForm
          account={account}
          onClose={onClose}
          onSubmit={onSubmit}
          submitting={submitting}
          errorMessage={errorMessage}
        />
      )}
    </Modal>
  )
}

function AccountChangeForm({
  account,
  onClose,
  onSubmit,
  submitting,
  errorMessage,
}: Omit<AccountChangeModalProps, 'opened'>) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountChangeValues>({
    resolver: zodResolver(accountChangeSchema),
    defaultValues: emptyValues,
    shouldFocusError: true,
  })

  return (
    <form noValidate onSubmit={handleSubmit((values) => onSubmit(values))}>
      <Stack gap="md">
        <p className={`pd-num ${classes.current}`}>
          지금 계좌 · {account.bankName} {account.accountNumberMasked} · {account.holder}
        </p>
        {errorMessage && (
          <Alert color="error" icon={<CircleAlert />} title="요청을 보내지 못했어요">
            {errorMessage}
          </Alert>
        )}
        <NativeSelect
          label="은행"
          data={[{ value: '', label: '은행 선택' }, ...BANKS]}
          error={errors.bankName?.message}
          data-autofocus
          {...register('bankName')}
        />
        <TextInput
          label="계좌번호"
          placeholder="숫자와 - 만 입력"
          inputMode="numeric"
          autoComplete="off"
          classNames={{ input: 'pd-num' }}
          error={errors.accountNumber?.message}
          {...register('accountNumber')}
        />
        <TextInput label="예금주" error={errors.holder?.message} {...register('holder')} />
        <Textarea
          label="변경 사유 (선택)"
          placeholder="예: 주거래 은행을 바꿨어요"
          autosize
          minRows={2}
          maxLength={ACCOUNT_CHANGE_REASON_MAX}
          error={errors.reason?.message}
          {...register('reason')}
        />
        <Alert color="info" icon={<Info />}>
          관리자가 확인한 뒤 바꿔 드려요. 바뀌기 전까지는 지금 계좌로 출금돼요.
        </Alert>
        <Group justify="flex-end" gap="xs">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            닫기
          </Button>
          <Button type="submit" loading={submitting}>
            변경 요청 보내기
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
