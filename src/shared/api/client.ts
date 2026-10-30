import axios from 'axios'
import { apiBaseUrl } from '@/shared/lib/env'
import { type ApiError, toApiError } from './ApiError'
import {
  clearAccessToken,
  getFreshAuthSession,
  getRefreshToken,
  isSessionExpired,
} from './authToken'
import { reissueSession } from './reissue'

// API 요청은 이 인스턴스로만 보낸다 (ADR-0004). 경로는 Bruno 그대로 `/api/v1/...`.
// - 로그인했으면 Authorization: Bearer. access가 이미 만료됐고 refreshToken이 있으면 보내기 전에 재발급한다.
// - 오류는 모두 ApiError로 바꿔 던진다
// - 401: 토큰을 보냈는데 "토큰이 만료되었습니다."면 refreshToken으로 한 번 재발급하고 같은 요청을 다시 보낸다.
//   재발급이 안 되거나(refresh 없음·거절) 만료가 아닌 거절(위조 등)이면 세션을 끝내고 토큰 없이 한 번 더 보낸다
//   (서버는 공개 API도 잘못된 토큰이 붙으면 401을 준다). 그래도 401이면 onUnauthorized 핸들러를 부른다.

declare module 'axios' {
  interface AxiosRequestConfig {
    /** 401이어도 로그인 화면으로 보내지 않는다 (로그인 요청 자체, 화면이 직접 처리할 때) */
    skipAuthRedirect?: boolean
    /** 내부용: 토큰 없이 다시 보낸 요청 */
    retriedWithoutToken?: boolean
    /** 내부용: 재발급 뒤 다시 보낸 요청 (재발급은 요청당 한 번) */
    reissued?: boolean
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

const TOKEN_EXPIRED_DETAIL = '토큰이 만료되었습니다.'

const isTokenExpired = (error: ApiError) =>
  error.detail === TOKEN_EXPIRED_DETAIL || Boolean(error.type?.endsWith('/token-expired'))

apiClient.interceptors.request.use(async (config) => {
  if (config.retriedWithoutToken) return config
  let session = getFreshAuthSession()
  if (session && isSessionExpired(session) && getRefreshToken()) {
    // 만료된 토큰을 보내 401을 받느니 먼저 재발급한다. 실패하면 세션이 끝나 토큰 없이 보낸다
    session = await reissueSession().catch(() => null)
  }
  if (session) config.headers.set('Authorization', `Bearer ${session.accessToken}`)
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (axios.isCancel(error)) return Promise.reject(error)
    const apiError = toApiError(error)
    const config = axios.isAxiosError(error) ? error.config : undefined

    if (apiError.status === 401 && config) {
      const sentToken = config.headers?.has('Authorization') && !config.retriedWithoutToken
      if (sentToken) {
        if (!config.reissued && isTokenExpired(apiError) && getRefreshToken()) {
          try {
            await reissueSession()
            return apiClient.request({ ...config, reissued: true })
          } catch {
            // 재발급 실패: 아래에서 세션을 끝내고 토큰 없이 다시 보낸다
          }
        }
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
