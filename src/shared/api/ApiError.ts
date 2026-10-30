import axios from 'axios'
import type { ProblemDetail } from './types'

// 서버 오류(application/problem+json)를 화면이 쓰는 한 모양으로 맞춘다 (DECISIONS.md A-13).
// 사용자에게는 detail을 보여 주고, 분기는 status로 한다. 422는 errors[].path로 폼 입력에 붙인다.

export type ProblemFieldError = NonNullable<ProblemDetail['errors']>[number]

/** status 0 = 응답을 못 받음(네트워크·시간 초과) */
export class ApiError extends Error {
  readonly status: number
  readonly detail: string
  readonly title: string | null
  readonly type: string | null
  readonly instance: string | null
  readonly errors: ProblemFieldError[]

  constructor(init: {
    status: number
    detail: string
    title?: string | null
    type?: string | null
    instance?: string | null
    errors?: ProblemFieldError[]
  }) {
    super(init.detail)
    this.name = 'ApiError'
    this.status = init.status
    this.detail = init.detail
    this.title = init.title ?? null
    this.type = init.type ?? null
    this.instance = init.instance ?? null
    this.errors = init.errors ?? []
  }

  /** path → 첫 오류 문구. useServerFieldErrors에 그대로 넘긴다 */
  get fieldErrors(): Record<string, string> {
    const map: Record<string, string> = {}
    for (const error of this.errors) map[error.path] ??= error.detail
    return map
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError

// 서버가 detail을 주지 않을 때만 쓴다
function fallbackDetail(status: number): string {
  if (status === 401) return '로그인이 필요해요'
  if (status === 403) return '이 작업을 할 권한이 없어요'
  if (status === 404) return '찾는 정보가 없어요'
  if (status >= 500) return '서버에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요'
  return '요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요'
}

function isProblem(data: unknown): data is Partial<ProblemDetail> {
  return typeof data === 'object' && data !== null && 'detail' in data
}

/** Axios 오류·알 수 없는 오류 → ApiError. 취소된 요청은 바꾸지 않는다(쿼리가 버린다) */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error
  if (axios.isAxiosError(error)) {
    const response = error.response
    if (!response) {
      const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      return new ApiError({
        status: 0,
        detail: timedOut
          ? '응답이 늦어지고 있어요. 잠시 뒤 다시 시도해 주세요'
          : '서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요',
      })
    }
    const data = response.data
    if (isProblem(data) && typeof data.detail === 'string' && data.detail) {
      return new ApiError({
        status: response.status,
        detail: data.detail,
        title: data.title,
        type: data.type,
        instance: data.instance,
        errors: Array.isArray(data.errors) ? data.errors : [],
      })
    }
    return new ApiError({ status: response.status, detail: fallbackDetail(response.status) })
  }
  return new ApiError({ status: 0, detail: fallbackDetail(0) })
}
