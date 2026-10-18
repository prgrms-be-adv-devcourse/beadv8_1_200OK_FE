import axios from 'axios'
import { useCallback, useEffect, useRef, useState } from 'react'
import { isApiError } from '@/shared/api/ApiError'
import { uploadMedia } from '@/shared/api/media'
import type { MediaPurpose } from '@/shared/api/types'
import type { PhotoItem } from './PhotoUploader'

// PhotoUploader에 붙이는 업로드 상태. 고른 파일을 바로 POST /media/{purpose}로 올리고,
// 올리는 동안은 브라우저 미리보기 + 진행률, 다 올리면 서버 url로 바꾼다.
// 실패한 파일은 목록에서 빼고 서버 detail을 error로 준다. 지운 파일은 업로드를 취소한다.
// 제출에는 urls(다 올린 것만, 화면 순서대로)를 쓰고, uploading이면 제출을 막는다.

export type SavedMedia = Pick<PhotoItem, 'url' | 'alt' | 'kind'>

let seq = 0
const nextId = () => {
  seq += 1
  return `upload${seq}`
}

const kindOf = (file: File): PhotoItem['kind'] =>
  file.type.startsWith('video/') ? 'video' : 'image'

export function useMediaUploads(purpose: MediaPurpose, initial: SavedMedia[] = []) {
  const [items, setItems] = useState<PhotoItem[]>(() =>
    initial.map((media, index) => ({ ...media, id: `saved${index}` })),
  )
  const [error, setError] = useState<string | null>(null)
  const controllers = useRef(new Map<string, AbortController>())

  useEffect(() => {
    const pending = controllers.current
    return () => {
      for (const controller of pending.values()) controller.abort()
    }
  }, [])

  const update = useCallback((id: string, patch: Partial<PhotoItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }, [])

  const add = useCallback(
    (files: File[]) => {
      setError(null)
      for (const file of files) {
        const id = nextId()
        const preview = URL.createObjectURL(file)
        const controller = new AbortController()
        controllers.current.set(id, controller)
        setItems((current) => [...current, { id, url: preview, kind: kindOf(file), progress: 0 }])

        uploadMedia(purpose, file, {
          signal: controller.signal,
          // 전송이 끝나도 서버 응답 전까지는 올리는 중으로 둔다
          onProgress: (percent) => update(id, { progress: Math.min(percent, 99) }),
        })
          .then((media) => update(id, { url: media.url, progress: undefined }))
          .catch((reason: unknown) => {
            if (axios.isCancel(reason)) return
            setItems((current) => current.filter((item) => item.id !== id))
            setError(
              isApiError(reason) ? reason.detail : '파일을 올리지 못했어요. 다시 시도해 주세요',
            )
          })
          .finally(() => {
            controllers.current.delete(id)
            URL.revokeObjectURL(preview)
          })
      }
    },
    [purpose, update],
  )

  const remove = useCallback((id: string) => {
    controllers.current.get(id)?.abort()
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const move = useCallback((id: string, direction: -1 | 1) => {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= current.length) return current
      const next = [...current]
      const [moved] = next.splice(index, 1)
      if (moved) next.splice(target, 0, moved)
      return next
    })
  }, [])

  const done = items.filter((item) => item.progress === undefined)

  return {
    items,
    add,
    remove,
    move,
    error,
    uploading: done.length < items.length,
    /** 다 올린 파일의 서버 url (화면 순서) */
    urls: done.map((item) => item.url),
  }
}
