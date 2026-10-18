import { useState } from 'react'
import type { PhotoItem } from '@/shared/ui'

// 1단계 사진 초안: 고른 파일을 브라우저 미리보기로만 보여 준다(순서 바꾸기 포함).
// TODO(api): 2-6 POST /media/PRODUCT로 올리고 progress·url을 채운다

let seq = 0

export function usePhotoDraft(initial: PhotoItem[] = []) {
  const [items, setItems] = useState<PhotoItem[]>(initial)
  return {
    items,
    add: (files: File[]) =>
      setItems((current) => [
        ...current,
        ...files.map((file) => {
          seq += 1
          return { id: `photo${seq}`, url: URL.createObjectURL(file) }
        }),
      ]),
    remove: (id: string) => setItems((current) => current.filter((item) => item.id !== id)),
    move: (id: string, direction: -1 | 1) =>
      setItems((current) => {
        const index = current.findIndex((item) => item.id === id)
        const target = index + direction
        if (index < 0 || target < 0 || target >= current.length) return current
        const next = [...current]
        const [moved] = next.splice(index, 1)
        if (moved) next.splice(target, 0, moved)
        return next
      }),
  }
}
