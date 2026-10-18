import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Group, Modal, SimpleGrid, Stack, Text, TextInput } from '@mantine/core'
import { CircleAlert, Search } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { ShippingAddress } from '@/shared/api/types'
import { openPostcode } from '@/shared/lib/daumPostcode'
import { type AddressFormValues, addressSchema } from './addressSchema'

// 배송지 입력·변경 모달: 받는 분 · 연락처 · 우편번호 찾기(다음) · 주소 · 상세주소.
// 주문서(이번 주문에만), 주문 상세(배송지 변경 요청), 계정 관리(기본 배송지)가 같이 쓰고 제목·안내·버튼 문구만 바꾼다.
// 우편번호·주소는 다음 우편번호 서비스로 고르고(읽기 전용), 상세주소만 직접 입력한다.

export type AddressModalProps = {
  opened: boolean
  initial?: ShippingAddress | null
  onClose: () => void
  onSave: (address: ShippingAddress) => void
  /** 기본: 배송지 입력 / 배송지 변경 */
  title?: string
  /** 제목 아래 안내 (예: ‘청송 햇살농원 · 송장 등록 전까지만 요청할 수 있어요’) */
  description?: string
  /** 입력 칸 아래 안내 (기본: 이번 주문에만 적용) */
  help?: string
  /** 기본: 이번 주문에 적용 */
  submitLabel?: string
  submitting?: boolean
}

const empty: AddressFormValues = {
  recipientName: '',
  recipientPhone: '',
  zipCode: '',
  address: '',
  addressDetail: '',
}

function AddressForm({
  initial,
  onClose,
  onSave,
  description,
  help = '여기서 바꾼 배송지는 이번 주문에만 적용돼요',
  submitLabel = '이번 주문에 적용',
  submitting,
}: Omit<AddressModalProps, 'opened' | 'title'>) {
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: { ...empty, ...initial, addressDetail: initial?.addressDetail ?? '' },
  })

  const searchAddress = async () => {
    setSearching(true)
    setSearchError(null)
    try {
      await openPostcode((picked) => {
        setValue('zipCode', picked.zipCode, { shouldValidate: true })
        setValue('address', picked.address, { shouldValidate: true })
        setFocus('addressDetail')
      })
    } catch {
      setSearchError('주소 검색을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(({ addressDetail, ...values }) =>
        onSave({ ...values, ...(addressDetail ? { addressDetail } : {}) }),
      )}
      noValidate
    >
      <Stack gap="md">
        {description && (
          <Text size="sm" c="var(--pd-color-text-muted)">
            {description}
          </Text>
        )}
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <TextInput
            label="받는 분"
            autoComplete="name"
            error={errors.recipientName?.message}
            {...register('recipientName')}
          />
          <TextInput
            label="연락처"
            inputMode="tel"
            autoComplete="tel"
            placeholder="010-1234-5678"
            error={errors.recipientPhone?.message}
            {...register('recipientPhone')}
          />
        </SimpleGrid>
        {searchError && (
          <Alert color="error" icon={<CircleAlert />} role="alert">
            {searchError}
          </Alert>
        )}
        <Group align="flex-start" gap="xs" wrap="nowrap">
          <TextInput
            label="우편번호"
            readOnly
            placeholder="우편번호 찾기를 눌러 주세요"
            className="pd-num"
            style={{ flex: 1 }}
            error={errors.zipCode?.message}
            {...register('zipCode')}
          />
          <Button
            variant="outline"
            mt={28}
            leftSection={<Search size={16} aria-hidden="true" />}
            loading={searching}
            onClick={searchAddress}
          >
            우편번호 찾기
          </Button>
        </Group>
        <TextInput label="주소" readOnly error={errors.address?.message} {...register('address')} />
        <TextInput
          label="상세주소"
          autoComplete="address-line2"
          placeholder="동·호수까지 입력해 주세요"
          error={errors.addressDetail?.message}
          {...register('addressDetail')}
        />
        <Text size="sm" c="var(--pd-color-text-muted)">
          {help}
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" loading={submitting}>
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}

export function AddressModal({ opened, title, ...props }: AddressModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={props.onClose}
      title={title ?? (props.initial ? '배송지 변경' : '배송지 입력')}
    >
      {/* 열 때마다 처음 값으로 다시 채운다 */}
      {opened && <AddressForm {...props} />}
    </Modal>
  )
}
