import { useQuery } from '@tanstack/react-query'
import { useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router'
import { getAuthSession, subscribeAuth } from '@/shared/api/authToken'
import type { CreateOrderRequest, ShippingAddress } from '@/shared/api/types'
import { walletBalanceQueryOptions } from '@/shared/api/walletBalance'
import { clearCheckoutDraft, draftAddressOf, useCheckoutDraftStore } from '../draftStore'
import { checkoutErrorMessage, isAmountChanged } from '../errors'
import { useCheckout, useCreateOrder, useShippingFeeQuote } from '../queries'
import { CheckoutView } from '../views/CheckoutView'

// B-04 주문서 라우트 /checkout. ✅ GET /orders/checkout(장바구니에서 고른 상품) + GET /wallets/me/balance → POST /orders(expectedTotalAmount).
// 배송지 우편번호가 정해지면 ✅ POST /shipments/fee-quotes로 도서산간 추가 운임·도착 예정일을 받아 금액에 더한다.
// 409 금액 변경이면 주문서를 다시 불러와 이전 금액과 함께 안내하고, 다른 실패는 ‘결제하지 못했어요’에 서버 문구를 보여 준다.
// 성공하면 주문 완료(/checkout/complete?orderId=)로 간다. 완료 화면은 주문 상세·잔액 API로 그린다.
// 배송지는 이 탭에서 30분 안에 적어 둔 초안(draftStore, PLAN 결정 7)으로 채운다: 충전(PG)에 다녀와도 다시 입력하지 않게.
// TODO(api): ❌ 저장된 회원 배송지 API가 없어 초안(없으면 빈 배송지)으로 그린다. 농가 이름도 주문서 API에 없다(sellerId만).

export function CheckoutPage() {
  const navigate = useNavigate()
  const checkout = useCheckout()
  const balance = useQuery(walletBalanceQueryOptions())
  const order = useCreateOrder()
  const [previousTotal, setPreviousTotal] = useState<number | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const memberId = useSyncExternalStore(subscribeAuth, getAuthSession, getAuthSession)?.memberId
  const draft = useCheckoutDraftStore((state) => state.draft)
  const saveAddress = useCheckoutDraftStore((state) => state.saveAddress)
  // 처음 그릴 때의 초안만 쓴다(CheckoutView가 이후 입력을 들고 있다). 견적은 여기서 우편번호를 알아야 해서 따로 든다
  const [address, setAddress] = useState<ShippingAddress | null>(() =>
    draftAddressOf(draft, memberId),
  )
  const feeQuote = useShippingFeeQuote(checkout.data, address?.zipCode ?? null)

  const pay = (request: CreateOrderRequest) => {
    setFailure(null)
    order.mutate(request, {
      onSuccess: ({ orderId }) => {
        clearCheckoutDraft()
        navigate(`/checkout/complete?orderId=${orderId}`, { replace: true })
      },
      onError: async (error) => {
        if (!isAmountChanged(error)) {
          setFailure(checkoutErrorMessage(error, 'order'))
          return
        }
        setPreviousTotal(request.expectedTotalAmount)
        const reloaded = await checkout.refetch()
        if (reloaded.isError) setFailure(checkoutErrorMessage(reloaded.error, 'load'))
      },
    })
  }

  const loadError = checkout.error ?? balance.error
  return (
    <CheckoutView
      status={
        checkout.isPending || balance.isPending
          ? 'pending'
          : checkout.data && balance.data
            ? 'success'
            : 'error'
      }
      checkout={checkout.data}
      balance={balance.data?.balance ?? 0}
      defaultAddress={address}
      onAddressSave={(next) => {
        setAddress(next)
        if (memberId !== undefined) saveAddress(memberId, next)
      }}
      feeQuote={feeQuote.data}
      feeQuoteStatus={
        feeQuote.isError
          ? 'error'
          : feeQuote.isSuccess
            ? 'success'
            : feeQuote.fetchStatus === 'fetching'
              ? 'pending'
              : 'idle'
      }
      paymentState={order.isPending ? 'processing' : failure ? 'failed' : 'idle'}
      previousTotal={previousTotal}
      errorMessage={failure}
      loadErrorMessage={loadError ? checkoutErrorMessage(loadError, 'load') : undefined}
      onPay={pay}
      onRetry={() => {
        void checkout.refetch()
        void balance.refetch()
      }}
    />
  )
}
