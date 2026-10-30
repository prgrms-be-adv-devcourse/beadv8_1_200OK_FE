import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import type { ApiError } from '@/shared/api/ApiError'
import { getAuthSession, subscribeAuth } from '@/shared/api/authToken'
import { queryKeyPrefix } from '@/shared/api/queryKeys'
import {
  MemberRole,
  type SellerApplicationHistoryItem,
  type SellerApplicationHistoryResponse,
  type SellerApplicationResponse,
  type SellerApplyRequest,
  type SellerApplyResponse,
} from '@/shared/api/types'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { applySeller, fetchMyApplication, fetchMyApplications } from './api'

// 판매자 신청 쿼리 키 · 훅. 승인 뒤 권한은 shared/api/reissue의 reissueSession()으로 다시 받는다(화면에서 호출).

export const sellerApplyKeys = {
  all: [queryKeyPrefix.sellerApply] as const,
  history: () => [queryKeyPrefix.sellerApply, 'history'] as const,
  detail: (applicationId: number) => [queryKeyPrefix.sellerApply, 'detail', applicationId] as const,
}

const byNewest = (a: SellerApplicationHistoryItem, b: SellerApplicationHistoryItem) =>
  b.appliedAt.localeCompare(a.appliedAt)

/** 내 신청 내역(최근 신청부터). 서버도 최신순이지만 한 번 더 맞춘다 */
export function useMyApplications(enabled = true) {
  return useQuery<SellerApplicationHistoryResponse, ApiError, SellerApplicationHistoryItem[]>({
    queryKey: sellerApplyKeys.history(),
    queryFn: fetchMyApplications,
    enabled,
    select: (data) => [...data.applications].sort(byNewest),
  })
}

export function useMyApplication(applicationId: number | null) {
  return useQuery<SellerApplicationResponse, ApiError>({
    queryKey: sellerApplyKeys.detail(applicationId ?? -1),
    queryFn: () => fetchMyApplication(applicationId as number),
    enabled: applicationId !== null,
  })
}

export function useApplySeller() {
  const queryClient = useQueryClient()
  return useMutation<SellerApplyResponse, ApiError, SellerApplyRequest>({
    mutationFn: applySeller,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: sellerApplyKeys.all }),
  })
}

/** 마이페이지 판매자 메뉴 문구를 정하는 상태 (app/layouts/MyPageLayout의 SellerMenuStatus와 같다) */
export type SellerMenuStatus = 'none' | 'applying' | 'approved'

const IN_PROGRESS = new Set<SellerApplicationStatus>([
  SellerApplicationStatus.PENDING,
  SellerApplicationStatus.IN_REVIEW,
  SellerApplicationStatus.APPROVED,
])

/**
 * 판매자 메뉴 상태. SELLER 토큰이면 'approved', 일반 회원은 신청 내역을 보고
 * 최근 신청이 심사 대기·심사 중·승인(권한 아직 안 받음)이면 'applying', 그 밖(없음·반려·로딩·오류)은 'none'.
 * 로그인 상태는 토큰에서 읽는다(features는 app/session을 import할 수 없다).
 */
export function useSellerMenuStatus(): SellerMenuStatus {
  const session = useSyncExternalStore(subscribeAuth, getAuthSession, getAuthSession)
  const role = session?.role ?? null
  const history = useMyApplications(role === MemberRole.BUYER)
  if (role === MemberRole.SELLER) return 'approved'
  if (role !== MemberRole.BUYER) return 'none'
  const latest = history.data?.[0]
  return latest && IN_PROGRESS.has(latest.status) ? 'applying' : 'none'
}
