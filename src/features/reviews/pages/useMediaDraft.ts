import { useState } from 'react'
import type { PhotoItem } from '@/shared/ui'

// 1단계 미디어 초안: 고른 파일을 브라우저 미리보기로만 보여 준다.
// TODO(api): 2-5 POST /media/PRODUCT_REVIEW로 올리고 progress·url을 채운다

let seq = 0

export function useMediaDraft(initial: PhotoItem[] = []) {
  const [items, setItems] = useState<PhotoItem[]>(initial)
  return {
    items,
    add: (files: File[]) =>
      setItems((current) => [
        ...current,
        ...files.map((file) => {
          seq += 1
          return {
            id: `m${seq}`,
            url: URL.createObjectURL(file),
            kind: file.type.startsWith('video/') ? ('video' as const) : ('image' as const),
          }
        }),
      ]),
    remove: (id: string) => setItems((current) => current.filter((item) => item.id !== id)),
  }
}
