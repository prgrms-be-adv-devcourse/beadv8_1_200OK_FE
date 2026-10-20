// 토스페이먼츠 결제창(SDK v2, 결제창형). 충전 요청으로 받은 chargeNo를 orderId로 넘기고,
// 결제가 끝나면 successUrl(?paymentType&amount&orderId&paymentKey) · failUrl(?code&message&orderId)로 돌아온다.
// SDK는 여기서만 import한다(테스트는 이 모듈을 vi.mock으로 바꾼다). 결제창을 닫으면 { code: 'USER_CANCEL' }로 reject된다.

export type TossCardPaymentParams = {
  clientKey: string
  customerKey: string
  amount: number
  /** 충전 번호(chargeNo) */
  orderId: string
  orderName: string
  successUrl: string
  failUrl: string
}

export type TossError = { code?: string; message?: string }

export async function openTossCardPayment(params: TossCardPaymentParams): Promise<void> {
  const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk')
  const toss = await loadTossPayments(params.clientKey)
  const payment = toss.payment({ customerKey: params.customerKey })
  await payment.requestPayment({
    method: 'CARD',
    amount: { currency: 'KRW', value: params.amount },
    orderId: params.orderId,
    orderName: params.orderName,
    successUrl: params.successUrl,
    failUrl: params.failUrl,
  })
}

/** 토스 customerKey. 유추하기 어려운 값이어야 해서 서버 발급 키로 바꾸는 게 맞다. TODO(api): 서버 발급 customerKey */
export const tossCustomerKey = (memberId: number) => `paldo-member-${memberId}`

export function tossErrorOf(error: unknown): { code: string; message: string } {
  const value = (typeof error === 'object' && error !== null ? error : {}) as TossError
  return { code: value.code ?? 'UNKNOWN', message: value.message ?? '' }
}
