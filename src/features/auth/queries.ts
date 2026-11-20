import { useMutation } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import { type AuthSession, setAccessToken } from '@/shared/api/authToken'
import { logoutSession } from '@/shared/api/reissue'
import type { LoginRequest, SignupRequest, SignupResponse } from '@/shared/api/types'
import { login, signup } from './api'

/** 로그인 → access·refreshToken을 보관. 성공 값은 토큰에서 읽은 세션(역할 · 회원 번호) */
export function useLogin() {
  return useMutation<AuthSession, ApiError | Error, LoginRequest>({
    mutationFn: async (body) => {
      const data = await login(body)
      return setAccessToken(data.accessToken, data.refreshToken)
    },
  })
}

/** 회원가입. 가입만 하고 로그인은 하지 않는다(API가 토큰을 주지 않음) */
export function useSignup() {
  return useMutation<SignupResponse, ApiError | Error, SignupRequest>({ mutationFn: signup })
}

/**
 * 로그아웃. 토큰(access·refresh)을 바로 지우고 서버의 refresh 세션 폐기를 뒤에서 보낸다(shared/api/reissue.ts).
 * 반환한 Promise는 폐기 요청이 끝나면 풀리고 실패해도 거절되지 않는다. 화면은 기다리지 않아도 된다.
 * 사용자별 캐시는 onSessionEnd 정리 경로가 비운다
 */
export function logout(): Promise<void> {
  return logoutSession()
}
