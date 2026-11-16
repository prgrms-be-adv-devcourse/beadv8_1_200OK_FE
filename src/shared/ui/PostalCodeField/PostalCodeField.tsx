import { Button, Group, TextInput, type TextInputProps } from '@mantine/core'
import { Search } from 'lucide-react'
import { type Ref, useState } from 'react'
import { openPostcode } from '@/shared/lib/daumPostcode'

// 우편번호 칸 + 우편번호 찾기(다음). 판매자 신청·상점 프로필의 출고지 우편번호처럼 우편번호만 받는 폼에 쓴다.
// 배송지처럼 주소까지 받는 폼은 AddressModal을 쓴다.
// 찾기 창을 못 불러와도 숫자 5자리를 직접 넣을 수 있게 칸은 입력할 수 있게 둔다.

export type PostalCodeFieldProps = Omit<TextInputProps, 'inputMode' | 'maxLength'> & {
  ref?: Ref<HTMLInputElement>
  /** 찾기 창에서 고른 우편번호 (react-hook-form이면 setValue로 넣는다) */
  onPick: (zipCode: string) => void
}

export function PostalCodeField({
  onPick,
  error,
  label = '우편번호',
  ...inputProps
}: PostalCodeFieldProps) {
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const search = async () => {
    setSearching(true)
    setSearchError(null)
    try {
      await openPostcode((picked) => onPick(picked.zipCode))
    } catch {
      setSearchError('우편번호 찾기를 불러오지 못했어요. 숫자 5자리를 직접 입력해 주세요.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <TextInput
      label={label}
      inputMode="numeric"
      maxLength={5}
      placeholder="00000"
      classNames={{ input: 'pd-num' }}
      error={error ?? searchError}
      // 버튼을 입력 칸 옆에 둔다. 설명·오류 문구가 있어도 칸과 버튼 높이가 맞는다
      inputContainer={(input) => (
        <Group gap="xs" wrap="nowrap" align="flex-start">
          <div style={{ flex: 1 }}>{input}</div>
          <Button
            variant="outline"
            leftSection={<Search size={16} aria-hidden="true" />}
            loading={searching}
            onClick={search}
          >
            우편번호 찾기
          </Button>
        </Group>
      )}
      {...inputProps}
    />
  )
}
