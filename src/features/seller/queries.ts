import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useSyncExternalStore } from 'react'
import { type ApiError, isApiError } from '@/shared/api/ApiError'
import { getAuthSession, subscribeAuth } from '@/shared/api/authToken'
import { queryKeyPrefix } from '@/shared/api/queryKeys'
import {
  type PageResponse,
  type PayoutSellerCandidate,
  type PayoutSellerDetail,
  type PayoutSummary,
  type ProductCreateRequest,
  ProductStatus,
  type ProductUpdateRequest,
  ProductVisibility,
  type SellerBalanceResponse,
  type SellerPayoutCandidateParams,
  type SellerPayoutListParams,
  type SellerProductListParams,
  type SellerProductSummary,
  type SellerProfileRequest,
  type SellerProfileResponse,
} from '@/shared/api/types'
import { PAYOUT_RUN_HOUR } from '@/shared/lib/constants'
import { recentYear, thisMonth, toServerDateTime } from '@/shared/lib/dateRange'
import {
  changeProductStatus,
  changeProductVisibility,
  createMyProfile,
  createProduct,
  deleteProduct,
  fetchMyProducts,
  fetchMyProfile,
  fetchSellerBalance,
  getPayout,
  getPayoutCandidates,
  getPayoutItems,
  getPayouts,
  getProductDetail,
  updateMyProfile,
  updateProduct,
} from './api'
import {
  type CachedProduct,
  PATCH_VERSION_STEP,
  patchCachedProduct,
  readCachedProducts,
  removeCachedProduct,
  saveCachedProduct,
} from './productCache'
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
}

export const payoutKeys = {
  all: [queryKeyPrefix.payouts] as const,
  list: (params: SellerPayoutListParams) => [queryKeyPrefix.payouts, 'list', params] as const,
  candidates: (params: SellerPayoutCandidateParams) =>
    [queryKeyPrefix.payouts, 'candidates', params] as const,
  detail: (payoutId: number) => [queryKeyPrefix.payouts, 'detail', payoutId] as const,
  items: (payoutId: number) => [queryKeyPrefix.payouts, 'items', payoutId] as const,
}

/** 로그인한 회원 번호 (토큰 payload의 sub). productCache 키와 /farms/:id 링크에 쓴다 */
export function useMemberId(): number | null {
  return useSyncExternalStore(subscribeAuth, getAuthSession, getAuthSession)?.memberId ?? null
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

/** 공개 상품만 200, 숨긴 상품은 404라 404는 오류로 다루지 않는다(재시도 없음) */
export function useSellerProductDetail(productId: number) {
  return useQuery({
    queryKey: sellerKeys.productDetail(productId),
    queryFn: () => getProductDetail(productId),
    enabled: Number.isInteger(productId),
    retry: false,
  })
}

function useAfterProductChange() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.seller, 'myProducts'] })
    void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.products] })
  }
}

const now = () => toServerDateTime(dayjs())

export function useCreateProduct(memberId: number | null) {
  const afterChange = useAfterProductChange()
  return useMutation<{ productId: number }, ApiError, ProductCreateRequest>({
    mutationFn: createProduct,
    onSuccess: ({ productId }, body) => {
      if (memberId !== null) {
        saveCachedProduct(memberId, {
          ...body,
          productId,
          version: 0,
          status: body.status ?? ProductStatus.READY,
          visibility: body.visibility ?? ProductVisibility.HIDDEN,
          updatedAt: now(),
        })
      }
      afterChange()
    },
  })
}

export function useUpdateProduct(memberId: number | null, productId: number) {
  const queryClient = useQueryClient()
  const afterChange = useAfterProductChange()
  return useMutation<
    void,
    ApiError,
    ProductUpdateRequest & Pick<CachedProduct, 'status' | 'visibility'>
  >({
    mutationFn: (body) => updateProduct(productId, body),
    onSuccess: (_, { version, ...body }) => {
      // 옵션 id는 새 옵션이 생기거나 지워지면 달라지므로 다음에 상세 조회로 다시 받는다
      if (memberId !== null) {
        saveCachedProduct(memberId, { ...body, productId, version: version + 1, updatedAt: now() })
      }
      void queryClient.invalidateQueries({ queryKey: sellerKeys.productDetail(productId) })
      afterChange()
    },
  })
}

export function useDeleteProduct(memberId: number | null, productId: number) {
  const queryClient = useQueryClient()
  const afterChange = useAfterProductChange()
  const forget = () => {
    if (memberId !== null) removeCachedProduct(memberId, productId)
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

/** 목록 바로 바꾸기(PATCH) 뒤처리: 캐시에 있으면 값과 version을 맞추고, 404면 캐시에서 뺀다 */
function useAfterQuickChange(memberId: number | null) {
  const afterChange = useAfterProductChange()
  return {
    success: (productId: number, patch: Partial<Pick<CachedProduct, 'status' | 'visibility'>>) => {
      if (memberId !== null) {
        const cached = readCachedProducts(memberId).find((p) => p.productId === productId)
        if (cached) {
          patchCachedProduct(memberId, productId, {
            ...patch,
            version: cached.version + PATCH_VERSION_STEP,
          })
        }
      }
      afterChange()
    },
    error: (productId: number, error: ApiError) => {
      if (error.status === 404) {
        if (memberId !== null) removeCachedProduct(memberId, productId)
        afterChange()
      }
    },
  }
}

export function useChangeProductStatus(memberId: number | null) {
  const after = useAfterQuickChange(memberId)
  return useMutation<void, ApiError, { productId: number; status: ProductStatus }>({
    mutationFn: ({ productId, status }) => changeProductStatus(productId, { status }),
    onSuccess: (_, { productId, status }) => after.success(productId, { status }),
    onError: (error, { productId }) => after.error(productId, error),
  })
}

export function useChangeProductVisibility(memberId: number | null) {
  const after = useAfterQuickChange(memberId)
  return useMutation<void, ApiError, { productId: number; visibility: ProductVisibility }>({
    mutationFn: ({ productId, visibility }) => changeProductVisibility(productId, { visibility }),
    onSuccess: (_, { productId, visibility }) => after.success(productId, { visibility }),
    onError: (error, { productId }) => after.error(productId, error),
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
