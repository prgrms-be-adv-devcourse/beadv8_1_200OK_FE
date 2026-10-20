import axios from 'axios'
import { apiBaseUrl } from '@/shared/lib/env'
import { ApiError, toApiError } from './ApiError'
import { type AuthSession, clearAccessToken, getRefreshToken, setAccessToken } from './authToken'
import type { TokenReissueRequest, TokenResponse } from './types'

// ✅ POST /api/v1/auth/reissue {refreshToken} → 새 access·refresh. 사용한 refreshToken은 다시 쓸 수 없다.
// apiClient가 아니라 인터셉터 없는 axios로 보낸다(401 처리 재귀 방지). 서버는 이 경로에서 Bearer를 읽지 않는다.
// 동시에 여러 요청이 만료를 만나도 재발급은 한 번만 한다(진행 중인 Promise를 같이 쓴다).
// 실패(401 refresh 만료·이미 사용·탈퇴, 403 정지)하면 세션을 끝내고 ApiError를 던진다 → 호출한 쪽이 로그인으로 보낸다.
// 판매자 승인 뒤 SELLER 권한을 받을 때도 화면에서 직접 부른다(토큰은 발급 시점의 권한만 담는다).

const bare = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15_000,
  headers: { Accept: 'application/json, application/problem+json' },
})

let inflight: Promise<AuthSession> | null = null

export function reissueSession(): Promise<AuthSession> {
  if (inflight) return inflight
  inflight = reissue().finally(() => {
    inflight = null
  })
  return inflight
}

async function reissue(): Promise<AuthSession> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    clearAccessToken('expired')
    throw new ApiError({ status: 401, detail: '로그인이 필요해요' })
  }
  try {
    const body: TokenReissueRequest = { refreshToken }
    const { data } = await bare.post<TokenResponse>('/api/v1/auth/reissue', body)
    return setAccessToken(data.accessToken, data.refreshToken)
  } catch (error) {
    clearAccessToken('expired')
    throw toApiError(error)
  }
}
