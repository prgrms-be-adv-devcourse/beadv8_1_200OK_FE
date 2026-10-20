import type { ApiError } from '@/shared/api/ApiError'
import type { ApplyFormValues } from './schemas'

// 판매자 신청 실패 → 폼에 보여 줄 모양 (서버 detail 우선).
// - 422 errors[].path가 폼 칸이면 그 칸에 붙인다. 칸이 없으면 폼 위 문구
// - 409 사업자등록번호 중복("이미 신청된 사업자등록번호입니다.")은 그 칸에, 그 밖의 409(진행 중인 신청·이미 판매자)는 폼 위 문구
// - 나머지도 서버 detail을 폼 위 문구로

export type ApplyField = keyof ApplyFormValues

export type ApplyFailure = {
  serverErrors?: Partial<Record<ApplyField, string>>
  errorMessage?: string | null
}

const FIELDS: ApplyField[] = [
  'storeName',
  'representativeName',
  'businessNumber',
  'mailOrderNumber',
]

const isField = (path: string): path is ApplyField => (FIELDS as string[]).includes(path)

export function toApplyFailure(error: ApiError | null): ApplyFailure {
  if (!error) return {}
  if (error.status === 422) {
    const serverErrors: Partial<Record<ApplyField, string>> = {}
    const rest: string[] = []
    for (const { path, detail } of error.errors) {
      if (isField(path)) serverErrors[path] ??= detail
      else rest.push(detail)
    }
    const hasFields = Object.keys(serverErrors).length > 0
    return {
      serverErrors: hasFields ? serverErrors : undefined,
      errorMessage: rest.length > 0 ? rest.join(' ') : hasFields ? null : error.detail,
    }
  }
  if (error.status === 409 && error.detail.includes('사업자등록번호')) {
    return { serverErrors: { businessNumber: error.detail } }
  }
  return { errorMessage: error.detail }
}
