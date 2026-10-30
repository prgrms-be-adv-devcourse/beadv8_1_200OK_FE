import { useQuery } from '@tanstack/react-query'
import { useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router'
import { getAuthSession, subscribeAuth } from '@/shared/api/authToken'
import { toShippingAddress, useDefaultAddress } from '@/shared/api/defaultAddress'
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
// 처음 배송지 우선순위: ① 충전에 다녀오기 전 적어 둔 초안 ② ✅ 서버 기본 배송지(GET /shipments/addresses/default) ③ 빈 배송지.
//   기본 배송지는 처음 값으로만 쓰므로 받을 때까지 주문서를 ‘불러오는 중’으로 두고, 못 받으면(오류) 빈 배송지로 진행한다.
// TODO(api): 농가 이름은 주문서 API에 없다(sellerId만).

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
  const draftAddress = useState(() => draftAddressOf(draft, memberId))[0]
  const defaultAddress = useDefaultAddress()
  // 초안이 없을 때만 기본 배송지를 기다린다. 한 번 정한 처음 값은 이후 입력과 따로 둔다
  const waitingDefault = draftAddress === null && defaultAddress.enabled && defaultAddress.isPending
  const initialAddress =
    draftAddress ?? (defaultAddress.data ? toShippingAddress(defaultAddress.data) : null)
  const [edited, setEdited] = useState<ShippingAddress | null>(null)
  const address = edited ?? initialAddress
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
      // 기본 배송지를 받은 뒤 처음 값으로 다시 그린다(CheckoutView는 처음 값을 마운트 때만 읽는다)
      key={waitingDefault ? 'waiting-default-address' : 'ready'}
      status={
        checkout.isPending || balance.isPending || waitingDefault
          ? 'pending'
          : checkout.data && balance.data
            ? 'success'
            : 'error'
      }
      checkout={checkout.data}
      balance={balance.data?.balance ?? 0}
      defaultAddress={initialAddress}
      onAddressSave={(next) => {
        setEdited(next)
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
