import { z } from 'zod'

// 비밀번호 규칙: 영문·숫자·특수문자를 모두 포함해 8~20자 (Bruno SignupRequest). 가입·재설정·비밀번호 변경이 같이 쓴다.

export const passwordMessage = '영문, 숫자, 특수문자를 모두 포함해 8~20자로 입력해 주세요'

/** 규칙 하나하나 (입력 중 체크 표시에 쓴다) */
export const passwordRules = [
  { label: '영문', test: (v: string) => /[A-Za-z]/.test(v) },
  { label: '숫자', test: (v: string) => /\d/.test(v) },
  { label: '특수문자', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
  { label: '8~20자', test: (v: string) => v.length >= 8 && v.length <= 20 },
] as const

export const passwordField = z
  .string()
  .min(1, '비밀번호를 입력해 주세요')
  .refine((v) => passwordRules.every((rule) => rule.test(v)), passwordMessage)
