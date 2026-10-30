import { Textarea } from '@mantine/core'
import type { ProductDescriptionEditorProps } from '@/features/seller/components/ProductDescriptionEditor'

// 테스트용 상품 설명 에디터. jsdom은 contenteditable(SunEditor)을 제대로 돌리지 못해 같은 props의 textarea로 바꿔 끼운다.
// 화면에는 태그를 뺀 글을 보여 주고, 입력한 글은 <p>…</p> 한 문단 HTML로 넘긴다(실제 에디터 출력과 같은 모양).
// 실제 에디터 동작(서식·사진 넣기)은 브라우저에서 확인한다.

const toText = (html: string) => html.replace(/<[^>]+>/g, '')

export default function DescriptionEditorStub({
  id,
  label,
  description,
  value,
  onChange,
  onBlur,
  error,
}: ProductDescriptionEditorProps) {
  return (
    <Textarea
      id={id}
      label={label}
      description={description}
      error={error}
      value={toText(value)}
      onChange={(event) => {
        const text = event.currentTarget.value
        onChange(text.trim() ? `<p>${text}</p>` : '')
      }}
      onBlur={onBlur}
    />
  )
}
