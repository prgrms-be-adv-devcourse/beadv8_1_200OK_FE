import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { isApiError } from '@/shared/api/ApiError'
import { orderDetailQueryOptions } from '@/shared/api/orderDetail'
import { queryKeyPrefix } from '@/shared/api/queryKeys'
import type { ShipmentSummary } from '@/shared/api/types'
import { confirmOrderItem, fetchOrders, fetchShipmentDetail, fetchShipments } from './api'

// 주문 쿼리 키·훅. 키는 [orders, ...]로 시작한다. 주문을 만든 쪽(checkout)은 접두어 [orders]로 무효화한다.

export const ORDER_PAGE_SIZE = 10

export const shipmentKeys = {
  all: [queryKeyPrefix.shipments] as const,
  forOrder: (orderId: number) => [queryKeyPrefix.shipments, 'order', orderId] as const,
  detail: (shipmentId: number) => [queryKeyPrefix.shipments, 'detail', shipmentId] as const,
}

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

/** 배송 목록을 넘겨 볼 최대 쪽 수(25건씩). 이보다 오래된 주문의 배송은 찾지 않는다 */
const SHIPMENT_SCAN_PAGES = 8

/**
 * 한 주문의 배송들. 주문 상세에 shipmentId가 없어 내 배송 목록(최신순)에서 orderId로 찾는다.
 * 찾는 번호보다 작은 주문이 나오면(주문 번호는 최신일수록 크다) 더 넘기지 않는다.
 */
export const orderShipmentsQueryOptions = (orderId: number) =>
  queryOptions({
    queryKey: shipmentKeys.forOrder(orderId),
    queryFn: async (): Promise<ShipmentSummary[]> => {
      const found: ShipmentSummary[] = []
      for (let page = 0; page < SHIPMENT_SCAN_PAGES; page += 1) {
        const result = await fetchShipments(page)
        found.push(...result.content.filter((shipment) => shipment.orderId === orderId))
        const reachedOlder = result.content.some((shipment) => shipment.orderId < orderId)
        if (reachedOlder || page + 1 >= result.totalPages) break
      }
      return found
    },
    staleTime: 30_000,
  })

/** 주문의 배송 링크용. 못 받아도 주문 상세는 그대로 그리므로 오류는 화면에 내지 않는다 */
export function useOrderShipments(orderId: number | null) {
  return useQuery({ ...orderShipmentsQueryOptions(orderId ?? 0), enabled: orderId !== null })
}

export const shipmentDetailQueryOptions = (shipmentId: number) =>
  queryOptions({
    queryKey: shipmentKeys.detail(shipmentId),
    queryFn: () => fetchShipmentDetail(shipmentId),
    staleTime: 30_000,
  })

/** 배송 상세. shipmentId가 올바르지 않으면 요청하지 않는다(화면은 404로 그린다) */
export function useShipment(shipmentId: number | null) {
  return useQuery({
    ...shipmentDetailQueryOptions(shipmentId ?? 0),
    enabled: shipmentId !== null,
  })
}

/** 구매확정. 성공하면 주문 상세·목록과 배송 캐시를 다시 받는다(리뷰 쓰기·정산 후보가 생긴다) */
export function useConfirmOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, orderItemId }: { orderId: number; orderItemId: number }) =>
      confirmOrderItem(orderId, orderItemId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.all }),
        queryClient.invalidateQueries({ queryKey: shipmentKeys.all }),
      ]),
  })
}
