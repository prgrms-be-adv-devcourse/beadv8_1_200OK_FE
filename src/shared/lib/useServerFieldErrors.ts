import { useEffect } from 'react'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

/**
 * 서버가 돌려준 필드 오류(409 중복, 422 errors[].path)를 폼 입력에 붙이고 첫 오류로 focus한다.
 * 문구는 서버 detail을 그대로 쓴다(DECISIONS.md A-13).
 */
export function useServerFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  errors: Partial<Record<Path<T>, string>> | undefined,
) {
  useEffect(() => {
    if (!errors) return
    let first = true
    for (const [field, message] of Object.entries(errors) as [Path<T>, string | undefined][]) {
      if (!message) continue
      setError(field, { type: 'server', message }, { shouldFocus: first })
      first = false
    }
  }, [errors, setError])
}
