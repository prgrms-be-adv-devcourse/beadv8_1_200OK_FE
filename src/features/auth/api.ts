import { apiClient } from '@/shared/api/client'
import type { LoginRequest, LoginResponse, SignupRequest, SignupResponse } from '@/shared/api/types'

// ✅ POST /api/v1/members/signup. 토큰은 주지 않는다(memberId만).
// 오류: 409 이미 사용 중인 아이디·이메일(errors 없이 detail로만 구분), 422 검증 실패(errors[].path)
export async function signup(body: SignupRequest): Promise<SignupResponse> {
  const { data } = await apiClient.post<SignupResponse>('/api/v1/members/signup', body)
  return data
}

// ✅ POST /api/v1/auth/login. 401 아이디·비밀번호 불일치, 403 이용 정지 회원 → 서버 detail을 그대로 보여 준다.
// 로그인 실패 401은 세션 만료가 아니므로 로그인 화면으로 보내지 않는다.
export async function login(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/api/v1/auth/login', body, {
    skipAuthRedirect: true,
  })
  return data
}
