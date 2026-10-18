import { useMutation } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import { type AuthSession, setAccessToken } from '@/shared/api/authToken'
import type { LoginRequest } from '@/shared/api/types'
import { login } from './api'

/** 로그인 → accessToken을 메모리에 보관. 성공 값은 토큰에서 읽은 세션(역할 · 회원 번호) */
export function useLogin() {
  return useMutation<AuthSession, ApiError | Error, LoginRequest>({
    mutationFn: async (body) => setAccessToken((await login(body)).accessToken),
  })
}
