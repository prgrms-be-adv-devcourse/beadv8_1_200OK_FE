import { isApiError } from '@/shared/api/ApiError'

// 주문서·주문 생성·배송비 견적 실패 문구. 서버 detail을 그대로 쓴다(DECISIONS.md A-13).

export type CheckoutAction = 'load' | 'order' | 'quote'

export function checkoutErrorMessage(error: unknown, _action: CheckoutAction): string {
  if (!isApiError(error)) return '요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요'
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
