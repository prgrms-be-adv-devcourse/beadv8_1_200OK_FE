import { Button, TextInput } from '@mantine/core'
import { Search } from 'lucide-react'
import { type FormEvent, useRef, useState } from 'react'
import classes from './ProductSearchForm.module.css'

// 상품 검색창. 데스크톱 헤더(PublicLayout)와 모바일 상품 목록 위가 같이 쓴다.
// 제출만 알리고 이동은 쓰는 쪽이 정한다. 서버는 검색어를 50자까지 받고(넘으면 400),
// 공백·기호만 보내면 검색어 없이 전체를 주므로 글자·숫자가 없으면 막는다.

export const PRODUCT_KEYWORD_MAX_LENGTH = 50

const hasSearchableText = (value: string) => /[\p{L}\p{N}]/u.test(value)

export type ProductSearchFormProps = {
  /** 처음 값. 주소의 검색어가 바뀌면 쓰는 쪽이 key로 다시 그린다 */
  defaultValue?: string
  /** 앞뒤 공백을 뺀 검색어 */
  onSearch: (keyword: string) => void
  placeholder?: string
  className?: string
}

export function ProductSearchForm({
  defaultValue = '',
  onSearch,
  placeholder = '사과, 고구마처럼 상품 이름으로 찾아보세요',
  className,
}: ProductSearchFormProps) {
  const [value, setValue] = useState(defaultValue)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const keyword = value.trim()
    if (!hasSearchableText(keyword)) {
      setError('찾을 상품 이름을 입력해 주세요')
      inputRef.current?.focus()
      return
    }
    setError(null)
    onSearch(keyword)
  }

  return (
    <search aria-label="상품 검색" className={className}>
      <form noValidate onSubmit={submit} className={classes.root}>
        <TextInput
          ref={inputRef}
          type="search"
          aria-label="상품 검색어"
          className={classes.field}
          placeholder={placeholder}
          leftSection={<Search size={20} aria-hidden="true" />}
          maxLength={PRODUCT_KEYWORD_MAX_LENGTH}
          enterKeyHint="search"
          value={value}
          error={error}
          onChange={(event) => {
            setValue(event.currentTarget.value)
            if (error) setError(null)
          }}
        />
        <Button type="submit" className={classes.submit}>
          검색
        </Button>
      </form>
    </search>
  )
}
