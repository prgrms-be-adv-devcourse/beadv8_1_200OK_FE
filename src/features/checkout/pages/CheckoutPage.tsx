import { useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router'
import { getAuthSession, subscribeAuth } from '@/shared/api/authToken'
import type { CreateOrderRequest } from '@/shared/api/types'
import { clearCheckoutDraft, draftAddressOf, useCheckoutDraftStore } from '../draftStore'
import { checkoutErrorMessage, isAmountChanged } from '../errors'
import { BALANCE_ENOUGH } from '../fixtures'
import { useCheckout, useCreateOrder } from '../queries'
import type { CompleteState } from '../types'
import { CheckoutView } from '../views/CheckoutView'

// B-04 주문서 라우트 /checkout. GET /orders/checkout(장바구니에서 고른 상품) → POST /orders(expectedTotalAmount).
// 409 금액 변경이면 주문서를 다시 불러와 이전 금액과 함께 안내하고, 다른 실패는 ‘결제하지 못했어요’에 서버 문구를 보여 준다.
// 성공하면 주문 완료로 가며 결제 직전 주문서를 라우터 state로 넘긴다(주문 생성 응답은 orderId뿐).
// 배송지는 이 탭에서 30분 안에 적어 둔 초안(draftStore, PLAN 결정 7)으로 채운다: 충전(PG)에 다녀와도 다시 입력하지 않게.
// TODO(api): 잔액은 📝 GET /wallets/me, 저장된 배송지는 📝 회원 배송지 API가 없어 fixtures 잔액·초안(없으면 빈 배송지)으로 그린다.
//   농가 이름도 주문서 API에 없다(sellerId만).

const BALANCE = BALANCE_ENOUGH

export function CheckoutPage() {
  const navigate = useNavigate()
  const checkout = useCheckout()
  const order = useCreateOrder()
  const [previousTotal, setPreviousTotal] = useState<number | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const memberId = useSyncExternalStore(subscribeAuth, getAuthSession, getAuthSession)?.memberId
  const draft = useCheckoutDraftStore((state) => state.draft)
  const saveAddress = useCheckoutDraftStore((state) => state.saveAddress)
  // 처음 그릴 때의 초안만 쓴다(CheckoutView가 이후 입력을 들고 있다)
  const [draftAddress] = useState(() => draftAddressOf(draft, memberId))

  const pay = (request: CreateOrderRequest) => {
    setFailure(null)
    order.mutate(request, {
      onSuccess: ({ orderId }) => {
        clearCheckoutDraft()
        const state: CompleteState = {
          checkout: checkout.data,
          balanceAfter: BALANCE - request.expectedTotalAmount,
        }
        navigate(`/checkout/complete?orderId=${orderId}`, { replace: true, state })
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

  return (
    <CheckoutView
      status={checkout.isPending ? 'pending' : checkout.data ? 'success' : 'error'}
      checkout={checkout.data}
      balance={BALANCE}
      defaultAddress={draftAddress}
      onAddressSave={(address) => {
        if (memberId !== undefined) saveAddress(memberId, address)
      }}
      paymentState={order.isPending ? 'processing' : failure ? 'failed' : 'idle'}
      previousTotal={previousTotal}
      errorMessage={failure}
      loadErrorMessage={checkout.error ? checkoutErrorMessage(checkout.error, 'load') : undefined}
      onPay={pay}
      onRetry={() => checkout.refetch()}
    />
  )
}
