import { useMutation } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import { type AuthSession, clearAccessToken, setAccessToken } from '@/shared/api/authToken'
import type { LoginRequest, SignupRequest, SignupResponse } from '@/shared/api/types'
import { login, signup } from './api'

/** 로그인 → accessToken을 메모리에 보관. 성공 값은 토큰에서 읽은 세션(역할 · 회원 번호) */
export function useLogin() {
  return useMutation<AuthSession, ApiError | Error, LoginRequest>({
    mutationFn: async (body) => setAccessToken((await login(body)).accessToken),
  })
}

/** 회원가입. 가입만 하고 로그인은 하지 않는다(API가 토큰을 주지 않음) */
export function useSignup() {
  return useMutation<SignupResponse, ApiError | Error, SignupRequest>({ mutationFn: signup })
}

/** 로그아웃 API가 없어 토큰만 지운다(A-12). 사용자별 캐시는 onSessionEnd 정리 경로가 비운다 */
export function logout() {
  clearAccessToken('logout')
}
