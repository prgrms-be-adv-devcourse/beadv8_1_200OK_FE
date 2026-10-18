import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useSyncExternalStore } from 'react'
import type { ApiError } from '@/shared/api/ApiError'
import { getAuthSession, subscribeAuth } from '@/shared/api/authToken'
import { queryKeyPrefix } from '@/shared/api/queryKeys'
import {
  type PayoutDetail,
  type PayoutPage,
  type PayoutSummary,
  type ProductCreateRequest,
  ProductStatus,
  type ProductUpdateRequest,
  ProductVisibility,
} from '@/shared/api/types'
import {
  createProduct,
  deleteProduct,
  getPayout,
  getPayoutItems,
  getPayouts,
  getProductDetail,
  updateProduct,
} from './api'
import {
  type CachedProduct,
  readCachedProducts,
  removeCachedProduct,
  saveCachedProduct,
} from './productCache'

// 판매자 센터 쿼리 키 · 훅. 상품을 바꾸면 구매자 화면 캐시도 [products] 접두어로 비운다(ADR-0003).

export const sellerKeys = {
  all: [queryKeyPrefix.seller] as const,
  /** TODO(api): 본인 상품 목록 API가 없어 productCache(localStorage)를 읽는다 */
  myProducts: (memberId: number | null) => [queryKeyPrefix.seller, 'myProducts', memberId] as const,
  productDetail: (productId: number) =>
    [queryKeyPrefix.seller, 'productDetail', productId] as const,
}

export const payoutKeys = {
  all: [queryKeyPrefix.payouts] as const,
  list: (params: {
    payeeId: number | null
    from: string
    to: string
    page: number
    size: number
  }) => [queryKeyPrefix.payouts, 'list', params] as const,
  detail: (payoutId: number) => [queryKeyPrefix.payouts, 'detail', payoutId] as const,
  items: (payoutId: number) => [queryKeyPrefix.payouts, 'items', payoutId] as const,
}

/** 로그인한 회원 번호 (토큰 payload의 sub). 임시 헤더와 정산 payeeId에 쓴다 */
export function useMemberId(): number | null {
  return useSyncExternalStore(subscribeAuth, getAuthSession, getAuthSession)?.memberId ?? null
}

// ─── 상품 ────────────────────────────────────────────────

export function useMyProducts(memberId: number | null) {
  return useQuery({
    queryKey: sellerKeys.myProducts(memberId),
    queryFn: () => (memberId === null ? [] : readCachedProducts(memberId)),
    staleTime: Number.POSITIVE_INFINITY,
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

function useAfterProductChange(memberId: number | null) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: sellerKeys.myProducts(memberId) })
    void queryClient.invalidateQueries({ queryKey: [queryKeyPrefix.products] })
  }
}

const now = () => dayjs().format('YYYY-MM-DD[T]HH:mm:ss')

export function useCreateProduct(memberId: number | null) {
  const afterChange = useAfterProductChange(memberId)
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
  const afterChange = useAfterProductChange(memberId)
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
  const afterChange = useAfterProductChange(memberId)
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

// ─── 정산 ────────────────────────────────────────────────

export const PAYOUT_PAGE_SIZE = 20
const PAYOUT_ITEM_PAGE_SIZE = 50
const dateTime = (value: dayjs.Dayjs) => value.format('YYYY-MM-DD[T]HH:mm:ss')

/** 최근 1년: 내일 0시(미포함)부터 1년 전까지. 서버 최대 범위가 정확히 1년 */
export function recentYear() {
  const to = dayjs().add(1, 'day').startOf('day')
  return { from: dateTime(to.subtract(1, 'year')), to: dateTime(to) }
}

/** 이번 달 1일 0시 ~ 다음 달 1일 0시 */
function thisMonth() {
  const from = dayjs().startOf('month')
  return { from: dateTime(from), to: dateTime(from.add(1, 'month')) }
}

/** page는 0부터 */
export function usePayouts(memberId: number | null, page: number) {
  const params = { payeeId: memberId, ...recentYear(), page, size: PAYOUT_PAGE_SIZE }
  return useQuery<PayoutPage<PayoutSummary>, ApiError>({
    queryKey: payoutKeys.list(params),
    queryFn: () => getPayouts({ ...params, payeeId: memberId ?? undefined }),
    enabled: memberId !== null,
    placeholderData: (previous) => previous,
  })
}

type MonthSummary = { month: string; amount: number; count: number }

/** 이번 달 정산 완료 합계. 정산은 하루 한 번이라 한 달은 한 페이지(100건)에 들어온다 */
export function useMonthPayouts(memberId: number | null) {
  const params = { payeeId: memberId, ...thisMonth(), page: 0, size: 100 }
  return useQuery<PayoutPage<PayoutSummary>, ApiError, MonthSummary>({
    queryKey: payoutKeys.list(params),
    queryFn: () => getPayouts({ ...params, payeeId: memberId ?? undefined }),
    enabled: memberId !== null,
    select: (data) => ({
      month: params.from,
      amount: data.content.reduce((sum, p) => sum + p.amount, 0),
      count: data.totalElements,
    }),
  })
}

export function usePayout(payoutId: number | null) {
  return useQuery<PayoutDetail, ApiError>({
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
