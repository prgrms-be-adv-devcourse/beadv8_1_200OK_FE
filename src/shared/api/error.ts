import { isAxiosError, isCancel } from 'axios'

/** 백엔드 오류 응답 형식(설계서 "백엔드 계약" 3). 폼 필드 오류는 details에 필드명 → 메시지 배열로 온다. */
export interface ApiErrorBody {
  code: string
  message: string
  details?: Record<string, string[]>
}

/** 응답이 없거나 본문에 code가 없을 때 프론트가 부여하는 코드 */
export const API_ERROR_CODES = {
  NETWORK: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  CANCELED: 'CANCELED',
  UNKNOWN: 'UNKNOWN',
} as const

/**
 * apiClient가 reject하는 유일한 오류 타입.
 * status 0은 응답 자체가 없는 경우(네트워크 단절·타임아웃·취소)다.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: Record<string, string[]> | undefined

  constructor(status: number, body: ApiErrorBody, options?: { cause?: unknown }) {
    super(body.message, options)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.details = body.details
  }

  get isNetworkError(): boolean {
    return this.status === 0
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isForbidden(): boolean {
    return this.status === 403
  }

  /** 4xx: 재시도해도 결과가 바뀌지 않는 요청 오류 */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

function isErrorBody(data: unknown): data is ApiErrorBody {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as Record<string, unknown>).code === 'string' &&
    typeof (data as Record<string, unknown>).message === 'string'
  )
}

/** Axios·네트워크·알 수 없는 오류를 ApiError 하나로 정규화한다. 이미 ApiError면 그대로 돌려준다. */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error
  }

  if (isCancel(error)) {
    return new ApiError(
      0,
      { code: API_ERROR_CODES.CANCELED, message: '요청이 취소되었습니다.' },
      { cause: error },
    )
  }

  if (isAxiosError(error)) {
    const response = error.response
    if (response) {
      const body: ApiErrorBody = isErrorBody(response.data)
        ? response.data
        : {
            code: API_ERROR_CODES.UNKNOWN,
            message: response.statusText || '요청을 처리하지 못했습니다.',
          }
      return new ApiError(response.status, body, { cause: error })
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError(
        0,
        {
          code: API_ERROR_CODES.TIMEOUT,
          message: '서버 응답이 지연되고 있습니다. 다시 시도해 주세요.',
        },
        { cause: error },
      )
    }

    return new ApiError(
      0,
      { code: API_ERROR_CODES.NETWORK, message: '네트워크에 연결할 수 없습니다.' },
      { cause: error },
    )
  }

  const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
  return new ApiError(0, { code: API_ERROR_CODES.UNKNOWN, message }, { cause: error })
}
