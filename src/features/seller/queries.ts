import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useSyncExternalStore } from 'react'
import { type ApiError, isApiError } from '@/shared/api/ApiError'
import { getAuthSession, subscribeAuth } from '@/shared/api/authToken'
import { queryKeyPrefix } from '@/shared/api/queryKeys'
import type {
  AddressChangeDecision,
  AddressChangeRequestResult,
  PageResponse,
  PayoutSellerCandidate,
  PayoutSellerDetail,
  PayoutSummary,
  ProductCreateRequest,
  ProductStatus,
  ProductUpdateRequest,
  ProductVisibility,
  SellerBalanceResponse,
  SellerPayoutCandidateParams,
  SellerPayoutListParams,
  SellerProductDetail,
  SellerProductListParams,
  SellerProductSummary,
  SellerProfileRequest,
  SellerProfileResponse,
  SellerShipmentPage,
  ShipmentDetail,
  ShipmentDispatchRequest,
  ShipmentDispatchResponse,
} from '@/shared/api/types'
import { PAYOUT_RUN_HOUR } from '@/shared/lib/constants'
import { recentYear, thisMonth, toServerDateTime } from '@/shared/lib/dateRange'
import {
  changeProductStatus,
  changeProductVisibility,
  createMyProfile,
  createProduct,
  decideAddressChange,
  deleteProduct,
  dispatchShipment,
  fetchMyProductDetail,
  fetchMyProducts,
  fetchMyProfile,
  fetchSellerBalance,
  fetchSellerShipmentDetail,
  fetchSellerShipments,
  getPayout,
  getPayoutCandidates,
  getPayoutItems,
  getPayouts,
  updateMyProfile,
  updateProduct,
} from './api'
import type { PayoutOutlook } from './types'

// 판매자 센터 쿼리 키 · 훅. 상품을 바꾸면 구매자 화면 캐시도 [products] 접두어로 비운다(ADR-0003).

export const sellerKeys = {
  all: [queryKeyPrefix.seller] as const,
  myProducts: (params: SellerProductListParams) =>
    [queryKeyPrefix.seller, 'myProducts', params] as const,
  productDetail: (productId: number) =>
    [queryKeyPrefix.seller, 'productDetail', productId] as const,
  profile: () => [queryKeyPrefix.seller, 'profile'] as const,
  balance: () => [queryKeyPrefix.seller, 'balance'] as const,
  shipments: () => [queryKeyPrefix.seller, 'shipments'] as const,
  shipmentPage: (page: number) => [queryKeyPrefix.seller, 'shipments', 'page', page] as const,
  shipmentDetail: (shipmentId: number) =>
    [queryKeyPrefix.seller, 'shipments', 'detail', shipmentId] as const,
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

/** 등록(POST)과 수정(PUT)을 캐시 값으로 가른다: 아직 없으면(null) 등록 */
export function useSaveMyProfile() {
  const queryClient = useQueryClient()
  return useMutation<SellerProfileResponse, ApiError, SellerProfileRequest>({
    mutationFn: (body) =>
      queryClient.getQueryData(sellerKeys.profile()) === null
        ? createMyProfile(body)
        : updateMyProfile(body),
    onSuccess: (profile) => queryClient.setQueryData(sellerKeys.profile(), profile),
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
