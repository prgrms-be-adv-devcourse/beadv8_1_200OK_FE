import { z } from 'zod'
import { passwordField as password } from '@/shared/lib/password'

// 회원·인증 폼 검증. 규칙은 Bruno 필드 제약(bruno_for_front/README.md SignupRequest)을 그대로 쓴다.
// 서버도 같은 규칙으로 422를 돌려주므로, 문구가 다르면 서버 detail이 우선한다(DECISIONS.md A-13).

const email = z
  .string()
  .trim()
  .min(1, '이메일을 입력해 주세요')
  .max(255, '이메일은 255자 이하로 입력해 주세요')
  .pipe(z.email('이메일 형식을 확인해 주세요. 예: farm@example.com'))

export const loginSchema = z.object({
  loginId: z.string().trim().min(1, '아이디를 입력해 주세요'),
  password: z.string().min(1, '비밀번호를 입력해 주세요'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const signupSchema = z
  .object({
    loginId: z
      .string()
      .trim()
      .regex(/^[a-z0-9]{4,20}$/, '영문 소문자·숫자 4~20자로 입력해 주세요'),
    email,
    name: z
      .string()
      .trim()
      .min(1, '이름을 입력해 주세요')
      .max(50, '이름은 50자 이하로 입력해 주세요'),
    nickname: z
      .string()
      .trim()
      .min(2, '닉네임은 2~30자로 입력해 주세요')
      .max(30, '닉네임은 2~30자로 입력해 주세요'),
    password,
    passwordConfirm: z.string().min(1, '비밀번호를 한 번 더 입력해 주세요'),
    termsAgreed: z.boolean().refine((v) => v, '필수 약관에 동의해 주세요'),
    privacyAgreed: z.boolean().refine((v) => v, '필수 약관에 동의해 주세요'),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ['passwordConfirm'],
    message: '비밀번호가 서로 달라요',
  })

export type SignupFormValues = z.infer<typeof signupSchema>

// TODO(api): 아이디·비밀번호 찾기 API가 없다(C-5). 정책(아이디 마스킹, 재설정 링크 30분) 기준
export const findIdSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해 주세요'),
  email,
})

export type FindIdFormValues = z.infer<typeof findIdSchema>

export const findPasswordSchema = z.object({
  loginId: z.string().trim().min(1, '아이디를 입력해 주세요'),
  email,
})

export type FindPasswordFormValues = z.infer<typeof findPasswordSchema>

export const resetPasswordSchema = z
  .object({ password, passwordConfirm: z.string().min(1, '비밀번호를 한 번 더 입력해 주세요') })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ['passwordConfirm'],
    message: '비밀번호가 서로 달라요',
  })

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
