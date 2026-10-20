import { queryOptions } from '@tanstack/react-query'
import { apiClient } from './client'
import { queryKeyPrefix } from './queryKeys'
import type { MemberInfo, MemberInfoUpdateRequest } from './types'

// 내 정보는 me(마이페이지·계정 관리)와 app 레이아웃(판매자 센터·관리자 콘솔 상단 이름)이 함께 써서 shared에 둔다(ADR-0003).

// ✅ GET /api/v1/members/me. 401 로그인 필요, 404 회원이 없거나 탈퇴함
export async function fetchMyInfo(): Promise<MemberInfo> {
  const { data } = await apiClient.get<MemberInfo>('/api/v1/members/me')
  return data
}

// ✅ PUT /api/v1/members/me → 200 수정된 값. 이름·닉네임을 모두 보낸다. 422 검증 실패(errors[].path = name · nickname)
export async function updateMyInfo(body: MemberInfoUpdateRequest): Promise<MemberInfo> {
  const { data } = await apiClient.put<MemberInfo>('/api/v1/members/me', body)
  return data
}

export const myInfoQueryOptions = () =>
  queryOptions({
    queryKey: [queryKeyPrefix.members, 'me'] as const,
    queryFn: fetchMyInfo,
    staleTime: 60_000,
  })
