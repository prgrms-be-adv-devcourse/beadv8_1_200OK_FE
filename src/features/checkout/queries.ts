import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { ApiError } from '@/shared/api/ApiError'
import { orderDetailQueryOptions } from '@/shared/api/orderDetail'
import { queryKeyPrefix } from '@/shared/api/queryKeys'
import {
  type Checkout,
  type CreateOrderRequest,
  type CreateOrderResponse,
  OrderStatus,
  type ShippingFeeQuote,
  type ShippingFeeQuoteRequest,
} from '@/shared/api/types'
import { createOrder, fetchCheckout, fetchShippingFeeQuote } from './api'
import type { PaymentResult } from './types'

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

export type CreateOrderVariables = { request: CreateOrderRequest; idempotencyKey: string }

/**
 * 주문 생성. 서버는 주문을 결제 대기(PAYMENT_PENDING)로 저장하고 바로 응답하며 지갑 결제는 뒤에서 따로 끝난다.
 * 그래서 캐시는 여기서 건드리지 않고, 결제 완료(PAID)를 확인한 뒤 useSettlePaidOrder로 정리한다(#76)
 */
export function useCreateOrder() {
  return useMutation<CreateOrderResponse, ApiError | Error, CreateOrderVariables>({
    mutationFn: ({ request, idempotencyKey }) => createOrder(request, idempotencyKey),
  })
}

/**
 * 결제 완료 뒤 캐시 정리. 장바구니(PAID 때 서버가 비움)·주문·예치금을 무효화한다.
 * 주문서는 다시 받지 않고 지운다(완료 화면으로 가기 전에 ‘주문할 상품이 없어요’가 잠깐 보이지 않게)
 */
export function useSettlePaidOrder() {
  const queryClient = useQueryClient()
  return () => {
    for (const prefix of [queryKeyPrefix.cart, queryKeyPrefix.orders, queryKeyPrefix.wallet]) {
      void queryClient.invalidateQueries({ queryKey: [prefix] })
    }
    queryClient.removeQueries({ queryKey: checkoutKeys.all })
  }
}

/** 결제 결과를 다시 묻는 간격 */
export const PAYMENT_POLL_MS = 1_000
/** 주문서에서 결제 결과를 기다리는 시간. 넘으면 완료 화면으로 넘기고 완료 화면이 이어서 확인한다 */
export const CHECKOUT_PAYMENT_WAIT_MS = 10_000
/** 완료 화면에서 결제 결과를 기다리는 시간. 넘으면 주문 내역에서 확인하라고 안내한다 */
export const COMPLETE_PAYMENT_WAIT_MS = 30_000

function paymentResultOf(status: OrderStatus | undefined, timedOut: boolean): PaymentResult {
  if (status === OrderStatus.PAID) return 'paid'
  if (status === OrderStatus.PAYMENT_FAILED || status === OrderStatus.CANCELED) return 'failed'
  return timedOut ? 'timedOut' : 'waiting'
}

/**
 * 주문 상세(GET /orders/{orderId})를 1초마다 다시 받아 결제 결과를 기다린다. 결제 대기가 아니게 되거나
 * waitMs가 지나면 멈춘다. 주문 상세 캐시를 나눠 써서 완료 화면이 받은 결과를 바로 그린다
 */
export function useOrderPayment(orderId: number | null, waitMs: number) {
  // 시간이 지난 주문 번호. 주문 번호가 바뀌면(다시 결제) 자연히 false가 된다
  const [expiredOrderId, setExpiredOrderId] = useState<number | null>(null)
  const timedOut = orderId !== null && expiredOrderId === orderId

  useEffect(() => {
    if (orderId === null) return
    const timer = setTimeout(() => setExpiredOrderId(orderId), waitMs)
    return () => clearTimeout(timer)
  }, [orderId, waitMs])

  const order = useQuery({
    ...orderDetailQueryOptions(orderId ?? 0),
    enabled: orderId !== null,
    staleTime: 0,
    retry: false,
    refetchInterval: (query) =>
      !timedOut && paymentResultOf(query.state.data?.status, false) === 'waiting'
        ? PAYMENT_POLL_MS
        : false,
    refetchIntervalInBackground: true,
  })

  return { order, result: paymentResultOf(order.data?.status, timedOut) }
}
