import { isApiError } from '@/shared/api/ApiError'

// 주문서·주문 생성 실패 문구. 서버 detail을 그대로 쓴다(DECISIONS.md A-13).
// TODO(api): 로컬 서버(dev)에 주문 API가 없어 404 "No static resource …"(Spring 내부 문구)가 온다.
//   그대로 보여 주지 않고 해요체 안내로 바꾼다. API가 나오면 지운다

export type CheckoutAction = 'load' | 'order'

const unavailable: Record<CheckoutAction, string> = {
  load: '지금은 주문서를 불러올 수 없어요. 잠시 뒤 다시 시도해 주세요',
  order: '지금은 주문할 수 없어요. 예치금은 그대로예요. 잠시 뒤 다시 시도해 주세요',
}

export function checkoutErrorMessage(error: unknown, action: CheckoutAction): string {
  if (!isApiError(error)) return '요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요'
  if (error.status === 404 && error.detail.startsWith('No static resource'))
    return unavailable[action]
  // 422는 칸별 문구(연락처 형식 등)가 더 구체적이다
  return error.errors[0]?.detail ?? error.detail
}

/**
 * 409 주문 금액 변경(ORDER_AMOUNT_CHANGED). 같은 409에 잔액 부족·재고 부족도 있어 문구로 나눈다(bruno README 1).
 * PROBLEM_BASE_URI를 설정한 서버는 type이 {base}/order-amount-changed라 그것도 본다
 */
export function isAmountChanged(error: unknown): boolean {
  if (!isApiError(error) || error.status !== 409) return false
  return (
    error.type?.endsWith('/order-amount-changed') === true || error.detail.includes('금액이 변경')
  )
}
