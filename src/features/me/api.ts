import { apiClient } from '@/shared/api/client'
import type { PasswordChangeRequest, ProductSummary } from '@/shared/api/types'

// ✅ PATCH /api/v1/members/me/password → 204. 성공하면 이 요청에 쓴 토큰까지 모든 Access·Refresh 토큰이 바로 무효가 된다.
// 400 member/invalid-current-password(현재 비밀번호 불일치) · member/same-as-current-password,
// 409 member/password-changed-concurrently(다른 요청이 먼저 바꿈), 422 errors[].path = currentPassword · newPassword
export async function changePassword(body: PasswordChangeRequest): Promise<void> {
  await apiClient.patch('/api/v1/members/me/password', body)
}

// ✅ GET /api/v1/products/summaries?ids=1,2,3 → 상품 목록과 같은 카드. 로그인 없이 부른다. ID 1~100개.
// 요청한 순서로 오고 중복은 한 번만 온다. 숨김·삭제·없는 상품은 오류 없이 빠진다(찜 목록보다 적을 수 있다)
export async function fetchProductSummaries(ids: number[]): Promise<ProductSummary[]> {
  const { data } = await apiClient.get<ProductSummary[]>('/api/v1/products/summaries', {
    params: { ids: ids.join(',') },
  })
  return data
}
