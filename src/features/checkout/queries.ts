import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import { queryKeyPrefix } from '@/shared/api/queryKeys'
import type { CreateOrderRequest, CreateOrderResponse } from '@/shared/api/types'
import { createOrder, fetchCheckout } from './api'

// 주문서 쿼리 키·훅. 키는 [checkout, ...]로 시작한다. 장바구니 선택에 따라 바뀌므로 늘 새로 받는다(staleTime 0).

export const checkoutKeys = {
  all: [queryKeyPrefix.checkout] as const,
  sheet: () => [queryKeyPrefix.checkout, 'sheet'] as const,
}

export const checkoutQueryOptions = () =>
  queryOptions({ queryKey: checkoutKeys.sheet(), queryFn: fetchCheckout, staleTime: 0 })

export function useCheckout() {
  return useQuery(checkoutQueryOptions())
}

/**
 * 주문 생성. 성공하면 장바구니(주문한 상품이 빠짐)·주문·예치금 캐시를 무효화한다.
 * 주문서는 다시 받지 않고 지운다(완료 화면으로 가기 전에 ‘주문할 상품이 없어요’가 잠깐 보이지 않게)
 */
export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation<CreateOrderResponse, ApiError | Error, CreateOrderRequest>({
    mutationFn: createOrder,
    onSuccess: () => {
      for (const prefix of [queryKeyPrefix.cart, queryKeyPrefix.orders, queryKeyPrefix.wallet]) {
        void queryClient.invalidateQueries({ queryKey: [prefix] })
      }
      queryClient.removeQueries({ queryKey: checkoutKeys.all })
    },
  })
}
