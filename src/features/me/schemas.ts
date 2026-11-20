import { z } from 'zod'
import { passwordField } from '@/shared/lib/password'

// 계정 관리 검증. 이름(50자 이하)·닉네임(2~30자) 규칙은 PUT /members/me와 같다.
// 비밀번호 변경은 PATCH /members/me/password(PasswordChangeRequest)와 같다: 현재 비밀번호 20자 이하(형식은 보지 않음),
// 새 비밀번호는 가입과 같은 규칙, 현재와 같으면 서버도 400(same-as-current-password). 공백을 지우지 않는다.

export const infoSchema = z.object({
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
})

export type InfoFormValues = z.infer<typeof infoSchema>

export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, '현재 비밀번호를 입력해 주세요')
      .max(20, '현재 비밀번호는 20자 이하로 입력해 주세요'),
    newPassword: passwordField,
    newPasswordConfirm: z.string().min(1, '새 비밀번호를 한 번 더 입력해 주세요'),
  })
  .refine((v) => v.newPassword === v.newPasswordConfirm, {
    path: ['newPasswordConfirm'],
    message: '비밀번호가 서로 달라요',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: '지금 비밀번호와 다른 비밀번호로 정해 주세요',
  })

export type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>
