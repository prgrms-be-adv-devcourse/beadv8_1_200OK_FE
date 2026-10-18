import axios from 'axios'
import { apiBaseUrl } from '@/shared/lib/env'
import { type ApiError, toApiError } from './ApiError'
import { clearAccessToken, getFreshAuthSession } from './authToken'
import { attachMemberHeaders } from './memberHeaders'

// API 요청은 이 인스턴스로만 보낸다 (ADR-0004). 경로는 Bruno 그대로 `/api/v1/...`.
// - 로그인했으면 Authorization: Bearer (+ 임시 헤더가 필요한 API면 X-Member-*)
// - 오류는 모두 ApiError로 바꿔 던진다
// - 401: 토큰을 보냈다면 만료로 보고 토큰을 지운 뒤 토큰 없이 한 번 더 보낸다
//   (서버는 공개 API도 잘못된 토큰이면 401을 준다). 그래도 401이면 onUnauthorized 핸들러를 부른다.

declare module 'axios' {
  interface AxiosRequestConfig {
    /** 401이어도 로그인 화면으로 보내지 않는다 (로그인 요청 자체, 화면이 직접 처리할 때) */
    skipAuthRedirect?: boolean
    /** 내부용: 토큰 없이 다시 보낸 요청 */
    retriedWithoutToken?: boolean
  }
}

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15_000,
  headers: { Accept: 'application/json, application/problem+json' },
})

type UnauthorizedHandler = (error: ApiError) => void
const unauthorizedHandlers = new Set<UnauthorizedHandler>()

/** 세션이 없어 401이 났을 때. features/auth가 캐시 정리 + /login?returnTo= 이동을 등록한다 */
export function onUnauthorized(handler: UnauthorizedHandler): () => void {
  unauthorizedHandlers.add(handler)
  return () => unauthorizedHandlers.delete(handler)
}

apiClient.interceptors.request.use((config) => {
  const session = config.retriedWithoutToken ? null : getFreshAuthSession()
  if (session) config.headers.set('Authorization', `Bearer ${session.accessToken}`)
  attachMemberHeaders(config, session)
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isCancel(error)) return Promise.reject(error)
    const apiError = toApiError(error)
    const config = axios.isAxiosError(error) ? error.config : undefined

    if (apiError.status === 401 && config) {
      const sentToken = config.headers?.has('Authorization') && !config.retriedWithoutToken
      if (sentToken) {
        clearAccessToken('expired')
        config.headers.delete('Authorization')
        return apiClient.request({ ...config, retriedWithoutToken: true })
      }
      if (!config.skipAuthRedirect) {
        for (const handler of unauthorizedHandlers) handler(apiError)
      }
    }
    return Promise.reject(apiError)
  },
)
