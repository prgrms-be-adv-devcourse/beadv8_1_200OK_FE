import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import { queryKeyPrefix } from '@/shared/api/queryKeys'
import type {
  AdminPayoutCandidateParams,
  AdminPayoutListParams,
  PageResponse,
  PayoutAdjustmentCreateRequest,
  PayoutDetail,
  PayoutRunResponse,
  PayoutSummary,
  SellerApplicationAdminDetail,
  SellerApplicationAdminSummary,
  SellerApplicationListParams,
  SellerApplicationRejectRequest,
} from '@/shared/api/types'
import { recentYear } from '@/shared/lib/dateRange'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import {
  approveSellerApplication,
  createPayoutAdjustment,
  getAdminPayout,
  getAdminPayoutCandidates,
  getAdminPayoutItems,
  getAdminPayouts,
  getSellerApplication,
  getSellerApplications,
  rejectSellerApplication,
  runPayoutForOrderItem,
  runPayouts,
  runPayoutsSkipWait,
  startSellerApplicationReview,
} from './api'
import { canQueryPayouts, toAdminPayoutParams } from './payoutFilter'
import type { PayoutFilter } from './types'

// 관리자 콘솔 쿼리 키 · 훅. 심사 처리 뒤에는 상세를 응답으로 바로 바꾸고 목록·개수는 접두어로 비운다.
// 정산 배치를 돌리면 판매자 정산 캐시([payouts])도 접두어로 비운다(ADR-0003).

export const adminKeys = {
  all: [queryKeyPrefix.admin] as const,
  applications: (params: SellerApplicationListParams) =>
    [queryKeyPrefix.admin, 'applications', params] as const,
  /** 탭 개수 · 메뉴 배지 (size=1 조회의 totalElements) */
  applicationCount: (status: SellerApplicationStatus) =>
    [queryKeyPrefix.admin, 'applications', 'count', status] as const,
  application: (applicationId: number) =>
    [queryKeyPrefix.admin, 'application', applicationId] as const,
  payouts: (params: AdminPayoutListParams) => [queryKeyPrefix.admin, 'payouts', params] as const,
  payout: (payoutId: number) => [queryKeyPrefix.admin, 'payout', payoutId] as const,
  payoutItems: (payoutId: number) => [queryKeyPrefix.admin, 'payoutItems', payoutId] as const,
  payoutCandidates: (params: AdminPayoutCandidateParams) =>
    [queryKeyPrefix.admin, 'payoutCandidates', params] as const,
}

export const APPLICATION_PAGE_SIZE = 20
const PAYOUT_ITEM_PAGE_SIZE = 50
/** 개수는 자주 바뀌지 않아 30초 동안 다시 묻지 않는다 */
const COUNT_STALE_MS = 30_000

// ─── 판매자 신청 심사 ────────────────────────────────────

/** page는 0부터. 탭을 바꾸는 동안 이전 목록을 남긴다 */
export function useSellerApplications(status: SellerApplicationStatus, page: number) {
  const params = { status, page, size: APPLICATION_PAGE_SIZE }
  return useQuery<PageResponse<SellerApplicationAdminSummary>, ApiError>({
    queryKey: adminKeys.applications(params),
    queryFn: () => getSellerApplications(params),
    placeholderData: (previous) => previous,
  })
}

const countQuery = (status: SellerApplicationStatus) => ({
  queryKey: adminKeys.applicationCount(status),
  queryFn: () => getSellerApplications({ status, page: 0, size: 1 }),
  select: (data: PageResponse<SellerApplicationAdminSummary>) => data.totalElements,
  staleTime: COUNT_STALE_MS,
})

/** 탭별 개수. 아직 못 받은 탭은 undefined */
export function useSellerApplicationCounts(): Partial<Record<SellerApplicationStatus, number>> {
  const statuses = Object.values(SellerApplicationStatus)
  const results = useQueries({ queries: statuses.map(countQuery) })
  const counts: Partial<Record<SellerApplicationStatus, number>> = {}
  statuses.forEach((status, i) => {
    counts[status] = results[i]?.data
  })
  return counts
}

/** 관리자 메뉴의 ‘판매자 심사’ 대기 개수 배지 (AdminLayout) */
export function usePendingSellerApplicationCount() {
  return useQuery(countQuery(SellerApplicationStatus.PENDING))
}

/** 404(없는 신청)는 다시 묻지 않는다 */
export function useSellerApplication(applicationId: number | null) {
  return useQuery<SellerApplicationAdminDetail, ApiError>({
    queryKey: adminKeys.application(applicationId ?? -1),
    queryFn: () => getSellerApplication(applicationId as number),
    enabled: applicationId !== null,
    retry: false,
  })
}

/**
 * 심사 시작 · 승인 · 반려. 성공하면 응답(처리 뒤 상세)으로 캐시를 바꾸고 목록·개수를 비운다.
 * 409(상태가 바뀜 · 다른 관리자가 먼저 처리)면 상세를 다시 받아 화면을 맞춘다.
 */
export function useSellerApplicationMutations(applicationId: number | null) {
  const queryClient = useQueryClient()
  const id = applicationId ?? -1
  const onSuccess = (detail: SellerApplicationAdminDetail) => {
    queryClient.setQueryData(adminKeys.application(id), detail)
    void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.admin, 'applications'] })
  }
  const onError = (error: ApiError) => {
    if (error.status !== 409) return
    void queryClient.invalidateQueries({ queryKey: adminKeys.application(id) })
    void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.admin, 'applications'] })
  }
  const startReview = useMutation<SellerApplicationAdminDetail, ApiError, void>({
    mutationFn: () => startSellerApplicationReview(id),
    onSuccess,
    onError,
  })
  const approve = useMutation<SellerApplicationAdminDetail, ApiError, void>({
    mutationFn: () => approveSellerApplication(id),
    onSuccess,
    onError,
  })
  const reject = useMutation<
    SellerApplicationAdminDetail,
    ApiError,
    SellerApplicationRejectRequest
  >({
    mutationFn: (body) => rejectSellerApplication(id, body),
    onSuccess,
    onError,
  })
  return { startReview, approve, reject }
}

// ─── 정산 ────────────────────────────────────────────────

/** page는 0부터. 기간이 잘못됐거나 판매자 회원 번호가 비었으면 조회하지 않는다 */
export function useAdminPayouts(filter: PayoutFilter, page: number) {
  const params = toAdminPayoutParams(filter, page)
  return useQuery<PageResponse<PayoutSummary>, ApiError>({
    queryKey: adminKeys.payouts(params),
    queryFn: () => getAdminPayouts(params),
    enabled: canQueryPayouts(filter),
    placeholderData: (previous) => previous,
  })
}

export function useAdminPayout(payoutId: number | null) {
  return useQuery<PayoutDetail, ApiError>({
    queryKey: adminKeys.payout(payoutId ?? -1),
    queryFn: () => getAdminPayout(payoutId as number),
    enabled: payoutId !== null,
  })
}

export function useAdminPayoutItems(payoutId: number | null) {
  return useInfiniteQuery({
    queryKey: adminKeys.payoutItems(payoutId ?? -1),
    queryFn: ({ pageParam }) =>
      getAdminPayoutItems(payoutId as number, { page: pageParam, size: PAYOUT_ITEM_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    enabled: payoutId !== null,
  })
}

/** 정산 전인 후보 수 (최근 1년). 실행 카드의 ‘정산 대기 후보 N건’ */
export function usePendingCandidateCount() {
  const params: AdminPayoutCandidateParams = {
    ...recentYear(),
    unsettledOnly: true,
    page: 0,
    size: 1,
  }
  return useQuery({
    queryKey: adminKeys.payoutCandidates(params),
    queryFn: () => getAdminPayoutCandidates(params),
    select: (data) => data.totalElements,
    staleTime: COUNT_STALE_MS,
  })
}

function useAfterPayoutRun() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.admin, 'payouts'] })
    void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.admin, 'payoutCandidates'] })
    void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.payouts] })
  }
}

/** 전체 실행 · 대기 건너뛰기 실행. 끝나면 정산 목록 · 후보 · 판매자 정산 캐시를 비운다 */
export function useRunPayouts(kind: 'run' | 'skipWait') {
  const afterRun = useAfterPayoutRun()
  return useMutation<PayoutRunResponse, ApiError, void>({
    mutationFn: kind === 'run' ? runPayouts : runPayoutsSkipWait,
    onSuccess: afterRun,
  })
}

export function useRunPayoutForOrderItem() {
  const afterRun = useAfterPayoutRun()
  return useMutation<void, ApiError, number>({
    mutationFn: runPayoutForOrderItem,
    onSuccess: afterRun,
  })
}

export function useCreatePayoutAdjustment() {
  const afterRun = useAfterPayoutRun()
  return useMutation<void, ApiError, PayoutAdjustmentCreateRequest>({
    mutationFn: createPayoutAdjustment,
    onSuccess: afterRun,
  })
}
