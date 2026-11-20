import {
  type InfiniteData,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useSyncExternalStore } from 'react'
import { type ApiError, isApiError } from '@/shared/api/ApiError'
import { getAuthSession, subscribeAuth } from '@/shared/api/authToken'
import {
  productReviewKeywordsQueryOptions,
  productReviewsQueryOptions,
} from '@/shared/api/productReviews'
import { queryKeyPrefix } from '@/shared/api/queryKeys'
import {
  type Refund,
  type RefundDecisionRequest,
  type RefundPage,
  RefundStatus,
} from '@/shared/api/refund'
import {
  fetchMyApplication,
  fetchMyApplications,
  myApplicationQueryKey,
  myApplicationsQueryKey,
} from '@/shared/api/sellerApplication'
import {
  type AddressChangeDecision,
  type AddressChangeRequestResult,
  type PageResponse,
  type PayoutSellerCandidate,
  type PayoutSellerDetail,
  type PayoutSummary,
  type ProductCreateRequest,
  type ProductStatus,
  type ProductUpdateRequest,
  type ProductVisibility,
  type ReviewSentimentSummary,
  type SellerApplicationHistoryResponse,
  type SellerApplicationResponse,
  SellerApplicationStatus,
  type SellerBalanceResponse,
  type SellerPayoutCandidateParams,
  type SellerPayoutListParams,
  type SellerProductDetail,
  type SellerProductListParams,
  type SellerProductSummary,
  type SellerProfileRequest,
  type SellerProfileResponse,
  type SellerShipmentPage,
  type ShipmentDetail,
  type ShipmentDispatchRequest,
  type ShipmentDispatchResponse,
} from '@/shared/api/types'
import { PAYOUT_RUN_HOUR } from '@/shared/lib/constants'
import { recentYear, thisMonth, toServerDateTime } from '@/shared/lib/dateRange'
import {
  changeProductStatus,
  changeProductVisibility,
  createMyProfile,
  createProduct,
  decideAddressChange,
  decideRefund,
  deleteProduct,
  dispatchShipment,
  fetchMyProductDetail,
  fetchMyProductReviewSentiments,
  fetchMyProducts,
  fetchMyProfile,
  fetchSellerBalance,
  fetchSellerRefunds,
  fetchSellerShipmentDetail,
  fetchSellerShipments,
  getPayout,
  getPayoutCandidates,
  getPayoutItems,
  getPayouts,
  updateMyProfile,
  updateProduct,
} from './api'
import {
  type ReviewOverviewState,
  type SentimentResult,
  summarizeSellerSentiments,
} from './reviewOverview'
import type { PayoutOutlook } from './types'

// 판매자 센터 쿼리 키 · 훅. 상품을 바꾸면 구매자 화면 캐시도 [products] 접두어로 비운다(ADR-0003).

export const sellerKeys = {
  all: [queryKeyPrefix.seller] as const,
  myProducts: (params: SellerProductListParams) =>
    [queryKeyPrefix.seller, 'myProducts', params] as const,
  allMyProducts: () => [queryKeyPrefix.seller, 'myProducts', 'all'] as const,
  productDetail: (productId: number) =>
    [queryKeyPrefix.seller, 'productDetail', productId] as const,
  reviewSentiments: (productId: number) =>
    [queryKeyPrefix.seller, 'reviewSentiments', productId] as const,
  profile: () => [queryKeyPrefix.seller, 'profile'] as const,
  balance: () => [queryKeyPrefix.seller, 'balance'] as const,
  shipments: () => [queryKeyPrefix.seller, 'shipments'] as const,
  shipmentPage: (page: number) => [queryKeyPrefix.seller, 'shipments', 'page', page] as const,
  shipmentDetail: (shipmentId: number) =>
    [queryKeyPrefix.seller, 'shipments', 'detail', shipmentId] as const,
  refunds: () => [queryKeyPrefix.seller, 'refunds'] as const,
  refundList: (status: RefundStatus | null) =>
    [queryKeyPrefix.seller, 'refunds', 'list', status] as const,
  pendingRefundCount: () => [queryKeyPrefix.seller, 'refunds', 'pendingCount'] as const,
}

export const payoutKeys = {
  all: [queryKeyPrefix.payouts] as const,
  list: (params: SellerPayoutListParams) => [queryKeyPrefix.payouts, 'list', params] as const,
  candidates: (params: SellerPayoutCandidateParams) =>
    [queryKeyPrefix.payouts, 'candidates', params] as const,
  detail: (payoutId: number) => [queryKeyPrefix.payouts, 'detail', payoutId] as const,
  items: (payoutId: number) => [queryKeyPrefix.payouts, 'items', payoutId] as const,
}

/** 로그인한 회원 번호 (토큰 payload의 sub). /farms/:id 링크에 쓴다 */
export function useMemberId(): number | null {
  return useSyncExternalStore(subscribeAuth, getAuthSession, getAuthSession)?.memberId ?? null
}

// ─── 출고 ────────────────────────────────────────────────

/** 내 출고 목록 한 쪽(25건 고정). 쪽을 넘겨도 이전 쪽을 들고 있다가 바꾼다 */
export function useSellerShipments(page: number) {
  return useQuery<SellerShipmentPage, ApiError>({
    queryKey: sellerKeys.shipmentPage(page),
    queryFn: () => fetchSellerShipments(page),
    placeholderData: (previous) => previous,
  })
}

/** 출고 상세. 배송지 변경 모달을 열 때만 받는다(shipmentId가 null이면 요청하지 않는다). 처리 직전 값이라 캐시를 오래 쓰지 않는다 */
export function useSellerShipmentDetail(shipmentId: number | null) {
  return useQuery<ShipmentDetail, ApiError>({
    queryKey: sellerKeys.shipmentDetail(shipmentId ?? 0),
    queryFn: () => fetchSellerShipmentDetail(shipmentId ?? 0),
    enabled: shipmentId !== null,
    gcTime: 0,
  })
}

/** 출고·변경 요청 처리 뒤(성공이든 409든): 목록·상세를 다시 받는다 */
function useRefreshShipments() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: sellerKeys.shipments() })
}

export function useDispatchShipment() {
  const refresh = useRefreshShipments()
  return useMutation<
    ShipmentDispatchResponse,
    ApiError,
    { shipmentId: number; body: ShipmentDispatchRequest }
  >({
    mutationFn: ({ shipmentId, body }) => dispatchShipment(shipmentId, body),
    onSettled: refresh,
  })
}

export function useDecideAddressChange() {
  const refresh = useRefreshShipments()
  return useMutation<
    AddressChangeRequestResult,
    ApiError,
    { shipmentId: number; requestId: number; decision: AddressChangeDecision }
  >({
    mutationFn: ({ shipmentId, requestId, decision }) =>
      decideAddressChange(shipmentId, requestId, decision),
    onSettled: refresh,
  })
}

// ─── 취소 요청(환불) ─────────────────────────────────────

/** 상태로 거른 취소 요청(null이면 전체). 25건씩 ‘더 보기’로 이어 받는다 */
export function useSellerRefunds(status: RefundStatus | null) {
  return useInfiniteQuery<
    RefundPage,
    ApiError,
    InfiniteData<RefundPage>,
    ReturnType<typeof sellerKeys.refundList>,
    number
  >({
    queryKey: sellerKeys.refundList(status),
    queryFn: ({ pageParam }) => fetchSellerRefunds(pageParam, status ?? undefined),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  })
}

/** 승인 대기 요청 수. 메뉴 배지·탭 숫자에 쓴다(첫 쪽의 totalElements) */
export function usePendingRefundCount() {
  return useQuery<number, ApiError>({
    queryKey: sellerKeys.pendingRefundCount(),
    queryFn: async () => (await fetchSellerRefunds(0, RefundStatus.REQUESTED)).totalElements,
    staleTime: 30_000,
  })
}

/**
 * 승인·거절. 성공이든 409(이미 처리됨)든 목록·대기 수를 다시 받는다.
 * 승인하면 출고가 취소되고 정산 대상이 바뀌므로 출고 목록과 정산 캐시도 비운다.
 */
export function useDecideRefund() {
  const queryClient = useQueryClient()
  return useMutation<Refund, ApiError, { refundId: number; body: RefundDecisionRequest }>({
    mutationFn: ({ refundId, body }) => decideRefund(refundId, body),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: sellerKeys.refunds() }),
        queryClient.invalidateQueries({ queryKey: sellerKeys.shipments() }),
        queryClient.invalidateQueries({ queryKey: payoutKeys.all }),
      ]),
  })
}

// ─── 상품 ────────────────────────────────────────────────

export const PRODUCT_PAGE_SIZE = 20

/** 내 상품 목록 (서버). 탭을 바꿔도 이전 목록을 들고 있다가 바꾼다 */
export function useMyProducts(params: SellerProductListParams) {
  return useQuery<PageResponse<SellerProductSummary>, ApiError>({
    queryKey: sellerKeys.myProducts(params),
    queryFn: () => fetchMyProducts(params),
    placeholderData: (previous) => previous,
  })
}

/**
 * 수정 화면의 처음 값(version · 옵션 id · 재고). 열 때마다 서버에서 새로 받고(gcTime 0) 재시도하지 않는다.
 * 403(내 상품 아님)·404(없거나 삭제됨)는 화면이 안내로 그린다.
 */
export function useSellerProductDetail(productId: number) {
  return useQuery<SellerProductDetail, ApiError>({
    queryKey: sellerKeys.productDetail(productId),
    queryFn: () => fetchMyProductDetail(productId),
    enabled: Number.isInteger(productId),
    retry: false,
    gcTime: 0,
    // 폼을 연 뒤에 version만 몰래 바뀌면 안 되므로 창 포커스로 다시 받지 않는다. 다시 받는 건 저장·409 때뿐이다
    staleTime: Number.POSITIVE_INFINITY,
  })
}

const ALL_PRODUCTS_PAGE_SIZE = 100

/** 내 상품 전부(숨긴 상품 포함, 최신순). 100개씩 받고 남은 쪽은 한꺼번에 이어 받는다 */
async function fetchAllMyProducts(): Promise<SellerProductSummary[]> {
  const first = await fetchMyProducts({ page: 0, size: ALL_PRODUCTS_PAGE_SIZE })
  const rest = await Promise.all(
    Array.from({ length: Math.max(first.totalPages - 1, 0) }, (_, i) =>
      fetchMyProducts({ page: i + 1, size: ALL_PRODUCTS_PAGE_SIZE }),
    ),
  )
  // 받는 사이에 상품이 생기면 쪽 경계가 밀려 같은 상품이 두 번 올 수 있다
  const seen = new Set<number>()
  return [first, ...rest]
    .flatMap((page) => page.content)
    .filter((product) => !seen.has(product.productId) && seen.add(product.productId))
}

/** 센터 홈 상품 현황 · 리뷰 분석이 같이 쓴다 */
export function useAllMyProducts() {
  return useQuery<SellerProductSummary[], ApiError>({
    queryKey: sellerKeys.allMyProducts(),
    queryFn: fetchAllMyProducts,
  })
}

const reviewSentimentsQueryOptions = (productId: number) =>
  queryOptions<ReviewSentimentSummary, ApiError>({
    queryKey: sellerKeys.reviewSentiments(productId),
    queryFn: () => fetchMyProductReviewSentiments(productId),
  })

/** 상품 하나의 리뷰 감성 집계(S-11). 리뷰 분석 전체 화면과 캐시를 나눠 쓴다 */
export function useMyProductReviewSentiments(productId: number) {
  return useQuery({
    ...reviewSentimentsQueryOptions(productId),
    enabled: Number.isInteger(productId),
  })
}

/**
 * S-10 리뷰 분석: 내 상품 전부의 감성 집계를 동시에 받아 합친다. 상품마다 따로 실패할 수 있다.
 * TODO(api): 판매자 전체 요약 API가 생기면 상품 수만큼 부르지 않고 그 API 하나로 바꾼다.
 */
export function useSellerReviewOverview(): ReviewOverviewState {
  const products = useAllMyProducts()
  const list = products.data ?? []
  const sentiments = useQueries({
    queries: list.map((product) => reviewSentimentsQueryOptions(product.productId)),
  })

  if (products.isError) {
    return {
      status: 'error',
      errorMessage: products.error.detail,
      onRetry: () => void products.refetch(),
    }
  }
  if (products.isPending || sentiments.some((query) => query.isPending)) {
    return { status: 'pending' }
  }

  const results = new Map<number, SentimentResult>()
  list.forEach((product, i) => {
    // 다시 받다 실패해도 이미 받은 값이 있으면 그것을 쓴다
    results.set(product.productId, sentiments[i]?.data ?? 'error')
  })
  const failing = sentiments.filter((query) => query.isError && query.data === undefined)
  return {
    status: 'success',
    overview: summarizeSellerSentiments(list, results),
    onRetryFailed: () => {
      for (const query of failing) void query.refetch()
    },
    retryingFailed: failing.some((query) => query.isFetching),
  }
}

/** S-11 리뷰 목록(최신순, 더 보기). 구매자 상품 상세와 같은 공개 API·캐시 */
export function useSellerProductReviews(productId: number, keyword: string | undefined) {
  return useInfiniteQuery(productReviewsQueryOptions(productId, keyword))
}

/** S-11 리뷰 키워드. 숨긴 상품은 공개 API가 404라 부르지 않는다 */
export function useSellerProductReviewKeywords(productId: number, enabled: boolean) {
  return useQuery({ ...productReviewKeywordsQueryOptions(productId), enabled })
}

/** 상품이 바뀌면 목록 · 상세(서버 version이 오른다) · 구매자 화면 캐시를 모두 다시 받는다 */
function useAfterProductChange() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.seller, 'myProducts'] })
    void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.seller, 'productDetail'] })
    void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.products] })
  }
}

export function useCreateProduct() {
  const afterChange = useAfterProductChange()
  return useMutation<{ productId: number }, ApiError, ProductCreateRequest>({
    mutationFn: createProduct,
    onSuccess: afterChange,
  })
}

export function useUpdateProduct(productId: number) {
  const afterChange = useAfterProductChange()
  return useMutation<void, ApiError, ProductUpdateRequest>({
    mutationFn: (body) => updateProduct(productId, body),
    onSuccess: afterChange,
  })
}

export function useDeleteProduct(productId: number) {
  const queryClient = useQueryClient()
  const afterChange = useAfterProductChange()
  const forget = () => {
    queryClient.removeQueries({ queryKey: sellerKeys.productDetail(productId) })
    afterChange()
  }
  return useMutation<void, ApiError, void>({
    mutationFn: () => deleteProduct(productId),
    onSuccess: forget,
    // 이미 지워진 상품(404)은 목록에서도 뺀다
    onError: (error) => {
      if (error.status === 404) forget()
    },
  })
}

/** 목록 바로 바꾸기(PATCH) 뒤: 서버 version이 오르므로 목록·상세를 다시 받는다. 404면 목록에서도 뺀다 */
export function useChangeProductStatus() {
  const afterChange = useAfterProductChange()
  return useMutation<void, ApiError, { productId: number; status: ProductStatus }>({
    mutationFn: ({ productId, status }) => changeProductStatus(productId, { status }),
    onSuccess: afterChange,
    onError: (error) => {
      if (error.status === 404) afterChange()
    },
  })
}

export function useChangeProductVisibility() {
  const afterChange = useAfterProductChange()
  return useMutation<void, ApiError, { productId: number; visibility: ProductVisibility }>({
    mutationFn: ({ productId, visibility }) => changeProductVisibility(productId, { visibility }),
    onSuccess: afterChange,
    onError: (error) => {
      if (error.status === 404) afterChange()
    },
  })
}

// ─── 상점 프로필 ─────────────────────────────────────────

/** 내 상점 프로필. 404(아직 등록 안 함)는 null로 받아 등록 화면을 그린다 */
export function useMyProfile(enabled = true) {
  return useQuery<SellerProfileResponse | null, ApiError>({
    queryKey: sellerKeys.profile(),
    queryFn: async () => {
      try {
        return await fetchMyProfile()
      } catch (error) {
        if (isApiError(error) && error.status === 404) return null
        throw error
      }
    },
    enabled,
    retry: false,
    staleTime: 60_000,
  })
}

/**
 * 승인된 신청 당시의 출고지 우편번호. 프로필에 출고지 우편번호가 없을 때(미등록·이 칸이 생기기 전 프로필) 폼 기본값으로 쓴다.
 * 내역에서 가장 최근 승인 신청을 골라 상세를 받는다. 못 받거나 없으면 null(빈 칸으로 둔다).
 */
export function useApprovedApplicationPostalCode(enabled: boolean) {
  const history = useQuery<SellerApplicationHistoryResponse, ApiError>({
    queryKey: myApplicationsQueryKey(),
    queryFn: fetchMyApplications,
    enabled,
  })
  const approved = history.data?.applications
    .filter((application) => application.status === SellerApplicationStatus.APPROVED)
    .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))[0]
  const detail = useQuery<SellerApplicationResponse, ApiError>({
    queryKey: myApplicationQueryKey(approved?.applicationId ?? -1),
    queryFn: () => fetchMyApplication(approved?.applicationId ?? -1),
    enabled: enabled && approved !== undefined,
  })
  return {
    pending: enabled && (history.isPending || (approved !== undefined && detail.isPending)),
    postalCode: detail.data?.originPostalCode ?? null,
  }
}

/** 등록(POST)과 수정(PUT)을 캐시 값으로 가른다: 아직 없으면(null) 등록 */
export function useSaveMyProfile() {
  const queryClient = useQueryClient()
  return useMutation<SellerProfileResponse, ApiError, SellerProfileRequest>({
    mutationFn: (body) =>
      queryClient.getQueryData(sellerKeys.profile()) === null
        ? createMyProfile(body)
        : updateMyProfile(body),
    onSuccess: (profile) => {
      queryClient.setQueryData(sellerKeys.profile(), profile)
      // 구매자가 보는 내 상점(GET /stores/{sellerId}) 캐시도 비운다
      void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.farms] })
    },
    // 409(이미 등록) · 404(미등록)는 캐시가 어긋난 것이라 다시 받는다
    onError: (error) => {
      if (error.status === 409 || error.status === 404) {
        void queryClient.invalidateQueries({ queryKey: sellerKeys.profile() })
      }
    },
  })
}

// ─── 지갑 ────────────────────────────────────────────────

export function useSellerBalance() {
  return useQuery<SellerBalanceResponse, ApiError>({
    queryKey: sellerKeys.balance(),
    queryFn: fetchSellerBalance,
  })
}

// ─── 정산 ────────────────────────────────────────────────

export const PAYOUT_PAGE_SIZE = 20
const PAYOUT_ITEM_PAGE_SIZE = 50
const CANDIDATE_PAGE_SIZE = 100

/** page는 0부터. 최근 1년(서버 최대 범위) */
export function usePayouts(page: number) {
  const params = { ...recentYear(), page, size: PAYOUT_PAGE_SIZE }
  return useQuery<PageResponse<PayoutSummary>, ApiError>({
    queryKey: payoutKeys.list(params),
    queryFn: () => getPayouts(params),
    placeholderData: (previous) => previous,
  })
}

type MonthSummary = { month: string; amount: number; count: number }

/** 이번 달 정산 완료 합계. 정산은 하루 한 번이라 한 달은 한 페이지(100건)에 들어온다 */
export function useMonthPayouts() {
  const params = { ...thisMonth(), page: 0, size: 100 }
  return useQuery<PageResponse<PayoutSummary>, ApiError, MonthSummary>({
    queryKey: payoutKeys.list(params),
    queryFn: () => getPayouts(params),
    select: (data) => ({
      month: params.from,
      amount: data.content.reduce((sum, p) => sum + p.amount, 0),
      count: data.totalElements,
    }),
  })
}

/** 다음 정산 실행 시각: 오늘 새벽 PAYOUT_RUN_HOUR시가 아직 안 지났으면 오늘, 지났으면 내일 */
export function nextRunAt(from: dayjs.ConfigType = undefined): string {
  const base = dayjs(from)
  const today = base.startOf('day').hour(PAYOUT_RUN_HOUR)
  return toServerDateTime(base.isBefore(today) ? today : today.add(1, 'day'))
}

/** 정산 예정(아직 정산 전인 후보) 합계 + 다음 정산일(정책 상수) */
export function usePayoutOutlook() {
  const params: SellerPayoutCandidateParams = {
    ...recentYear(),
    unsettledOnly: true,
    page: 0,
    size: CANDIDATE_PAGE_SIZE,
  }
  return useQuery<PageResponse<PayoutSellerCandidate>, ApiError, PayoutOutlook>({
    queryKey: payoutKeys.candidates(params),
    queryFn: () => getPayoutCandidates(params),
    select: (data) => ({
      expectedAmount: data.content.reduce((sum, c) => sum + c.amount, 0),
      pendingCount: data.totalElements,
      truncated: data.totalElements > data.content.length,
      nextPayoutDate: nextRunAt(),
    }),
  })
}

export function usePayout(payoutId: number | null) {
  return useQuery<PayoutSellerDetail, ApiError>({
    queryKey: payoutKeys.detail(payoutId ?? -1),
    queryFn: () => getPayout(payoutId as number),
    enabled: payoutId !== null,
  })
}

export function usePayoutItems(payoutId: number | null) {
  return useInfiniteQuery({
    queryKey: payoutKeys.items(payoutId ?? -1),
    queryFn: ({ pageParam }) =>
      getPayoutItems(payoutId as number, { page: pageParam, size: PAYOUT_ITEM_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    enabled: payoutId !== null,
  })
}
