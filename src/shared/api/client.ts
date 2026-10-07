import axios, { isAxiosError } from 'axios'
import { env } from '@/shared/lib/env'
import { getAuthAdapter } from './auth-adapter'
import { toApiError } from './error'
import { emitUnauthorized } from './unauthorized'

declare module 'axios' {
  interface AxiosRequestConfig {
    /** 401이어도 어댑터 재시도를 건너뛴다. 재시도된 요청과 refresh 요청에 client·어댑터가 설정한다. */
    skipAuthRetry?: boolean
    /**
     * 401이어도 onUnauthorized 핸들러(캐시 정리·로그인 이동)를 호출하지 않는다.
     * 로그인 실패처럼 401이 정상 흐름인 요청에 사용한다.
     */
    skipUnauthorizedHandler?: boolean
  }
}

/**
 * 모든 feature가 쓰는 단일 Axios 인스턴스(ADR-0004).
 * - withCredentials: HttpOnly 쿠키 세션 기준안
 * - 요청 인터셉터: 인증 어댑터 attach
 * - 응답 인터셉터: 오류를 ApiError로 정규화, 401은 어댑터 → 실패 시 onUnauthorized
 */
export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  timeout: 10_000,
  headers: {
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use((config) => getAuthAdapter().attach(config))

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const apiError = toApiError(error)
    const axiosError = isAxiosError(error) ? error : undefined
    const config = axiosError?.config

    if (!apiError.isUnauthorized || !axiosError || !config || config.skipUnauthorizedHandler) {
      throw apiError
    }

    // 재시도 패스(skipAuthRetry)의 401은 바깥 catch가 한 번만 알리도록 조용히 던진다.
    if (config.skipAuthRetry) {
      throw apiError
    }

    try {
      return await getAuthAdapter().handleUnauthorized(axiosError, () =>
        apiClient.request({ ...config, skipAuthRetry: true }),
      )
    } catch (finalError) {
      const finalApiError = toApiError(finalError)
      if (finalApiError.isUnauthorized) {
        emitUnauthorized(finalApiError)
      }
      throw finalApiError
    }
  },
)
