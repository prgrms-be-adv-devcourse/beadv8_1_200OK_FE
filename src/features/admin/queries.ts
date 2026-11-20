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
  PayoutAdjustmentCreateResponse,
  PayoutDetail,
  PayoutRunResponse,
  PayoutSummary,
  ProductSummary,
  SellerApplicationAdminDetail,
  SellerApplicationAdminSummary,
  SellerApplicationListParams,
  SellerApplicationRejectRequest,
} from '@/shared/api/types'
import { recentYear } from '@/shared/lib/dateRange'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import {
  analyzeReviewKeywords,
  analyzeReviewSentiment,
  approveSellerApplication,
  createPayoutAdjustment,
  getAdminPayout,
  getAdminPayoutCandidates,
  getAdminPayoutItems,
  getAdminPayouts,
  getBlockedOrders,
  getDepositCheckReviews,
  getProductChoices,
  getResolutionRequests,
  getResolutionRequestsInPeriod,
  getResolutions,
  getSellerApplication,
  getSellerApplications,
  rejectSellerApplication,
  resolveBlockedOrder,
  runPayoutForOrderItem,
  runPayouts,
  runPayoutsSkipWait,
  startSellerApplicationReview,
} from './api'
import {
  canQueryResolutionRequests,
  toBlockedOrderParams,
  toResolutionRequestParams,
} from './blockedOrderFilter'
import { canQueryPayouts, toAdminPayoutParams } from './payoutFilter'
import type {
  BlockedOrder,
  BlockedOrderFilter,
  BlockedOrderParams,
  DepositCheckReview,
  KeywordAnalysis,
  PayoutFilter,
  ResolutionHistoryRows,
  ResolutionRequest,
  ResolutionRequestFilter,
  ResolutionRequestParams,
  ResolutionView,
  ReviewAnalysisRequest,
  SentimentAnalysis,
} from './types'

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
  /** 한 주문의 정산후보 전부 (기간 없이). 'payoutCandidates' 접두어라 정산 실행·조정 뒤 같이 비워진다 */
  orderCandidates: (orderId: number) =>
    [queryKeyPrefix.admin, 'payoutCandidates', 'order', orderId] as const,
  blockedOrders: (params: BlockedOrderParams) =>
    [queryKeyPrefix.admin, 'blockedOrders', params] as const,
  /** 해결 기록 전체 목록 (기간 · 관리자) */
  resolutionRequests: (params: ResolutionRequestParams) =>
    [queryKeyPrefix.admin, 'resolutionRequests', params] as const,
  /** 주문 하나의 해결 기록. 'requests'(요청 묶음) · 'lines'(1줄씩) */
  resolutions: (orderId: number, view?: ResolutionView) =>
    view
      ? ([queryKeyPrefix.admin, 'resolutions', orderId, view] as const)
      : ([queryKeyPrefix.admin, 'resolutions', orderId] as const),
  depositChecks: (page: number) => [queryKeyPrefix.admin, 'depositChecks', page] as const,
  productChoices: [queryKeyPrefix.admin, 'productChoices'] as const,
}

export const APPLICATION_PAGE_SIZE = 20
const PAYOUT_ITEM_PAGE_SIZE = 50
export const DEPOSIT_CHECK_PAGE_SIZE = 20
/** 한 주문의 후보는 몇 줄뿐이라 API 최대 크기로 한 번에 받는다 (넘치면 더 보기) */
const ORDER_CANDIDATE_PAGE_SIZE = 100
const RESOLUTION_PAGE_SIZE = 20
/** 개수는 자주 바뀌지 않아 30초 동안 다시 묻지 않는다 */
const COUNT_STALE_MS = 30_000

const nextPageOf = (last: PageResponse<unknown>) =>
  last.page + 1 < last.totalPages ? last.page + 1 : undefined

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
    getNextPageParam: nextPageOf,
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

/** 한 주문의 정산후보(대기 중 · 정산됨 · 조정). 막힌 주문을 조정할 때 상품별 금액을 본다. orderId가 null이면 부르지 않는다 */
export function useOrderCandidates(orderId: number | null) {
  return useInfiniteQuery({
    queryKey: adminKeys.orderCandidates(orderId ?? -1),
    queryFn: ({ pageParam }) =>
      getAdminPayoutCandidates({
        orderId: orderId as number,
        page: pageParam,
        size: ORDER_CANDIDATE_PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: nextPageOf,
    enabled: orderId !== null,
  })
}

function useAfterPayoutRun() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.admin, 'payouts'] })
    void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.admin, 'payoutCandidates'] })
    void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.admin, 'blockedOrders'] })
    void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.payouts] })
  }
}

/** 전체 실행 · 대기 건너뛰기 실행. 끝나면 정산 목록 · 후보 · 막힌 주문 · 판매자 정산 캐시를 비운다 */
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

/** 수동 조정. 성공하면 후보 · 막힌 주문(대기 조정 합계) · 정산 캐시를 비운다 */
export function useCreatePayoutAdjustment() {
  const afterRun = useAfterPayoutRun()
  return useMutation<PayoutAdjustmentCreateResponse, ApiError, PayoutAdjustmentCreateRequest>({
    mutationFn: createPayoutAdjustment,
    onSuccess: afterRun,
  })
}

// ─── 막힌 주문 · 대사 확인 ───────────────────────────────

/** page는 0부터. 다른 보기(해결 기록)면 부르지 않는다 */
export function useBlockedOrders(filter: BlockedOrderFilter, page: number, active = true) {
  const params = toBlockedOrderParams(filter, page)
  return useQuery<PageResponse<BlockedOrder>, ApiError>({
    queryKey: adminKeys.blockedOrders(params),
    queryFn: () => getBlockedOrders(params),
    enabled: active,
    placeholderData: (previous) => previous,
  })
}

/** 해결 기록 전체 목록. page는 0부터. 기간이 잘못됐거나 관리자 번호가 숫자가 아니면 부르지 않는다 */
export function useResolutionRequestsInPeriod(
  filter: ResolutionRequestFilter,
  page: number,
  active = true,
) {
  const params = toResolutionRequestParams(filter, page)
  return useQuery<PageResponse<ResolutionRequest>, ApiError>({
    queryKey: adminKeys.resolutionRequests(params),
    queryFn: () => getResolutionRequestsInPeriod(params),
    enabled: active && canQueryResolutionRequests(filter),
    placeholderData: (previous) => previous,
  })
}

/** 해결 기록 모달. 지금 보는 보기만 부른다 (orderId가 null이면 닫힘) */
export function useResolutionHistory(orderId: number | null, view: ResolutionView) {
  const id = orderId ?? -1
  const requests = useInfiniteQuery({
    queryKey: adminKeys.resolutions(id, 'requests'),
    queryFn: ({ pageParam }) =>
      getResolutionRequests(id, { page: pageParam, size: RESOLUTION_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: nextPageOf,
    enabled: orderId !== null && view === 'requests',
  })
  const lines = useInfiniteQuery({
    queryKey: adminKeys.resolutions(id, 'lines'),
    queryFn: ({ pageParam }) => getResolutions(id, { page: pageParam, size: RESOLUTION_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: nextPageOf,
    enabled: orderId !== null && view === 'lines',
  })
  const history: ResolutionHistoryRows =
    view === 'requests'
      ? { view, rows: requests.data?.pages.flatMap((p) => p.content) ?? [] }
      : { view, rows: lines.data?.pages.flatMap((p) => p.content) ?? [] }
  return { query: view === 'requests' ? requests : lines, history }
}

/**
 * 막힌 주문 해결. 성공하면 막힌 주문 목록 · 그 주문의 해결 기록 · 해결 기록 전체 목록을 비운다.
 * 409(해결할 것 없음)는 목록이 낡은 것이라 목록을 다시 받는다.
 */
export function useResolveBlockedOrder() {
  const queryClient = useQueryClient()
  const refreshList = () =>
    void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.admin, 'blockedOrders'] })
  return useMutation<ResolutionRequest, ApiError, { orderId: number; memo: string }>({
    mutationFn: ({ orderId, memo }) => resolveBlockedOrder(orderId, { memo }),
    onSuccess: (_, { orderId }) => {
      refreshList()
      void queryClient.invalidateQueries({ queryKey: adminKeys.resolutions(orderId) })
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.admin, 'resolutionRequests'] })
    },
    onError: (error) => {
      if (error.status === 409) refreshList()
    },
  })
}

/** page는 0부터 */
export function useDepositCheckReviews(page: number) {
  return useQuery<PageResponse<DepositCheckReview>, ApiError>({
    queryKey: adminKeys.depositChecks(page),
    queryFn: () => getDepositCheckReviews({ page, size: DEPOSIT_CHECK_PAGE_SIZE }),
    placeholderData: (previous) => previous,
  })
}

// ─── 리뷰 분석 테스트 ────────────────────────────────────

export function useProductChoices() {
  return useQuery<PageResponse<ProductSummary>, ApiError>({
    queryKey: adminKeys.productChoices,
    queryFn: getProductChoices,
  })
}

// 결과를 저장하지 않는 일회성 분석이라 캐시하지 않고 mutation으로 부른다
export function useAnalyzeReviewKeywords() {
  return useMutation<KeywordAnalysis, ApiError, ReviewAnalysisRequest>({
    mutationFn: analyzeReviewKeywords,
  })
}

export function useAnalyzeReviewSentiment() {
  return useMutation<SentimentAnalysis, ApiError, ReviewAnalysisRequest>({
    mutationFn: analyzeReviewSentiment,
  })
}
