import axios from 'axios'
import { apiBaseUrl } from '@/shared/lib/env'
import { ApiError, toApiError } from './ApiError'
import { type AuthSession, clearAccessToken, getRefreshToken, setAccessToken } from './authToken'
import type { LogoutRequest, TokenReissueRequest, TokenResponse } from './types'

// ✅ POST /api/v1/auth/reissue {refreshToken} → 새 access·refresh. 사용한 refreshToken은 다시 쓸 수 없다.
// apiClient가 아니라 인터셉터 없는 axios로 보낸다(401 처리 재귀 방지). 서버는 이 경로에서 Bearer를 읽지 않는다.
// 동시에 여러 요청이 만료를 만나도 재발급은 한 번만 한다(진행 중인 Promise를 같이 쓴다).
// 실패(401 refresh 만료·이미 사용·탈퇴, 403 정지)하면 세션을 끝내고 ApiError를 던진다 → 호출한 쪽이 로그인으로 보낸다.
// 판매자 승인 뒤 SELLER 권한을 받을 때도 화면에서 직접 부른다(토큰은 발급 시점의 권한만 담는다).
// 로그아웃(서버 refresh 세션 폐기)도 진행 중인 재발급을 알아야 해서 여기에 둔다(logoutSession).

const bare = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15_000,
  headers: { Accept: 'application/json, application/problem+json' },
})

let inflight: Promise<AuthSession> | null = null
// 진행 중인 재발급이 받을 새 refreshToken. 실패하면 null. 그 사이 로그아웃하면 이 토큰으로 폐기한다
let inflightRefresh: Promise<string | null> | null = null

const loginRequired = () => new ApiError({ status: 401, detail: '로그인이 필요해요' })

export function reissueSession(): Promise<AuthSession> {
  if (inflight) return inflight
  inflight = reissue().finally(() => {
    inflight = null
    inflightRefresh = null
  })
  return inflight
}

async function reissue(): Promise<AuthSession> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    clearAccessToken('expired')
    throw loginRequired()
  }
  const body: TokenReissueRequest = { refreshToken }
  const request = bare.post<TokenResponse>('/api/v1/auth/reissue', body).then(({ data }) => data)
  inflightRefresh = request.then(
    (data) => data.refreshToken,
    () => null,
  )
  try {
    const data = await request
    // 재발급을 기다리는 사이 로그아웃했으면 새 토큰을 보관하지 않는다(세션을 되살리지 않는다).
    // 새 refreshToken은 logoutSession이 폐기한다
    if (getRefreshToken() !== refreshToken) throw loginRequired()
    return setAccessToken(data.accessToken, data.refreshToken)
  } catch (error) {
    // 그 사이 로그아웃했거나 다시 로그인했으면 지금 세션은 이 재발급과 상관없다
    if (getRefreshToken() === refreshToken) clearAccessToken('expired')
    throw toApiError(error)
  }
}

/**
 * ✅ 로그아웃. 토큰을 바로 지우고(사용자별 캐시는 onSessionEnd 정리 경로가 비운다),
 * 서버의 refresh 세션 폐기(POST /api/v1/auth/logout {refreshToken} → 204)는 뒤에서 보낸다.
 * - 화면은 응답을 기다리지 않아도 된다. 폐기가 실패해도(5xx·연결 실패) 로그아웃은 끝난 것이라 오류를 내지 않는다.
 *   그때 refresh는 만료(14일)까지 서버에 남는다.
 * - 서버는 없는·만료된·이미 폐기한 토큰에도 204를 준다(멱등). Access Token은 검사하지 않아 만료돼도 보낼 수 있다.
 * - 재발급이 진행 중이면 그 응답의 새 refreshToken으로 폐기한다. 옛 토큰은 서버가 이미 바꿔서 세션을 찾지 못한다.
 *   재발급이 실패했으면 갖고 있던 토큰으로 보낸다(백엔드 AuthControllerSpec 안내).
 * TODO(bff-2단계): 쿠키 세션으로 바뀌면 POST /bff/session/logout을 부른다. BFF가 refresh 쿠키로 폐기한다
 */
export function logoutSession(): Promise<void> {
  const refreshToken = getRefreshToken()
  const reissued = inflightRefresh
  clearAccessToken('logout')
  return revoke(refreshToken, reissued)
}

async function revoke(refreshToken: string | null, reissued: Promise<string | null> | null) {
  const token = (reissued && (await reissued)) || refreshToken
  if (!token) return
  try {
    const body: LogoutRequest = { refreshToken: token }
    await bare.post('/api/v1/auth/logout', body)
  } catch {
    // 브라우저의 토큰은 이미 지웠다. 폐기 실패는 사용자가 할 수 있는 일이 없어 알리지 않는다
  }
}
