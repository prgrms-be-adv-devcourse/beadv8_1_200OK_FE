import { apiClient } from '@/shared/api/client'
import type { PasswordChangeRequest } from '@/shared/api/types'

// ✅ PATCH /api/v1/members/me/password → 204. 성공하면 이 요청에 쓴 토큰까지 모든 Access·Refresh 토큰이 바로 무효가 된다.
// 400 member/invalid-current-password(현재 비밀번호 불일치) · member/same-as-current-password,
// 409 member/password-changed-concurrently(다른 요청이 먼저 바꿈), 422 errors[].path = currentPassword · newPassword
export async function changePassword(body: PasswordChangeRequest): Promise<void> {
  await apiClient.patch('/api/v1/members/me/password', body)
}
