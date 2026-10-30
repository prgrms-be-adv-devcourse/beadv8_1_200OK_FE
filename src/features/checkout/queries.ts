import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/shared/api/ApiError'
import { queryKeyPrefix } from '@/shared/api/queryKeys'
import type {
  Checkout,
  CreateOrderRequest,
  CreateOrderResponse,
  ShippingFeeQuote,
  ShippingFeeQuoteRequest,
} from '@/shared/api/types'
import { createOrder, fetchCheckout, fetchShippingFeeQuote } from './api'

// 주문서 쿼리 키·훅. 키는 [checkout, ...]로 시작한다. 장바구니 선택에 따라 바뀌므로 늘 새로 받는다(staleTime 0).

export const checkoutKeys = {
  all: [queryKeyPrefix.checkout] as const,
  sheet: () => [queryKeyPrefix.checkout, 'sheet'] as const,
  feeQuote: (postalCode: string, sellers: ShippingFeeQuoteRequest['sellers']) =>
    [queryKeyPrefix.checkout, 'fee-quote', postalCode, sellers] as const,
}

export const checkoutQueryOptions = () =>
  queryOptions({ queryKey: checkoutKeys.sheet(), queryFn: fetchCheckout, staleTime: 0 })

export function useCheckout() {
  return useQuery(checkoutQueryOptions())
}

/** 견적 요청의 판매자별 상품 금액 합계 */
export function sellersOf(checkout: Checkout): ShippingFeeQuoteRequest['sellers'] {
  return checkout.sellerGroups.map((group) => ({
    sellerId: group.sellerId,
    itemAmount: group.items.reduce((sum, item) => sum + item.itemAmount, 0),
  }))
}

export const isPostalCode = (value: string | null | undefined): value is string =>
  /^\d{5}$/.test(value ?? '')

/** 배송비·도착 예정일 견적. 주문서와 우편번호(5자리)가 있을 때만 묻고, 실패해도 재시도하지 않는다(결제는 서버가 다시 계산) */
export function useShippingFeeQuote(checkout: Checkout | undefined, postalCode: string | null) {
  const sellers = checkout ? sellersOf(checkout) : []
  const enabled = Boolean(checkout) && sellers.length > 0 && isPostalCode(postalCode)
  return useQuery<ShippingFeeQuote, ApiError | Error>({
    queryKey: checkoutKeys.feeQuote(postalCode ?? '', sellers),
    queryFn: () => fetchShippingFeeQuote({ postalCode: postalCode ?? '', sellers }),
    enabled,
    staleTime: 60_000,
    retry: false,
  })
}

/** 도서산간 추가 운임 합계 (견적 전이면 0) */
export function regionSurchargeOf(quote: ShippingFeeQuote | undefined): number {
  return quote?.sellers.reduce((sum, seller) => sum + seller.regionSurcharge, 0) ?? 0
}

/** 화면에 보여 주고 주문에 보낼 최종 금액 = 주문서 합계 + 도서산간 추가 운임 */
export function expectedTotalOf(checkout: Checkout, quote: ShippingFeeQuote | undefined): number {
  return checkout.totalAmount + regionSurchargeOf(quote)
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
