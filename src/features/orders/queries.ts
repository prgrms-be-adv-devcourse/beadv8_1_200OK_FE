import { infiniteQueryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { isApiError } from '@/shared/api/ApiError'
import { orderDetailQueryOptions } from '@/shared/api/orderDetail'
import { queryKeyPrefix } from '@/shared/api/queryKeys'
import { fetchOrders } from './api'

// 주문 쿼리 키·훅. 키는 [orders, ...]로 시작한다. 주문을 만든 쪽(checkout)은 접두어 [orders]로 무효화한다.

export const ORDER_PAGE_SIZE = 10

export const orderKeys = {
  all: [queryKeyPrefix.orders] as const,
  lists: () => [queryKeyPrefix.orders, 'list'] as const,
  list: (size: number) => [queryKeyPrefix.orders, 'list', { size }] as const,
  // 상세 키·조회는 shared/api/orderDetail.ts (reviews·checkout도 씀)
  detail: (orderId: number) => orderDetailQueryOptions(orderId).queryKey,
}

export const ordersQueryOptions = () =>
  infiniteQueryOptions({
    queryKey: orderKeys.list(ORDER_PAGE_SIZE),
    queryFn: ({ pageParam }) => fetchOrders({ page: pageParam, size: ORDER_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
    staleTime: 30_000,
  })

/** 내 주문 목록. ‘더 보기’로 다음 페이지를 이어 받는다 */
export function useOrders() {
  return useInfiniteQuery(ordersQueryOptions())
}

/** 주문 상세. orderId가 올바르지 않으면 요청하지 않는다(화면은 404로 그린다) */
export function useOrder(orderId: number | null) {
  return useQuery({ ...orderDetailQueryOptions(orderId ?? 0), enabled: orderId !== null })
}

export const isNotFound = (error: unknown): boolean => isApiError(error) && error.status === 404

/** 화면에 보여 줄 오류 문구. 서버 detail을 우선한다 */
export function orderErrorMessage(error: unknown): string {
  return isApiError(error) ? error.detail : '요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요'
}
