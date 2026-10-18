import type { Checkout } from '@/shared/api/types'

/** 결제 진행 상태. processing은 닫을 수 없는 모달, failed는 실패 안내 */
export type PaymentState = 'idle' | 'processing' | 'failed'

/** 주문서 → 주문 완료로 넘기는 라우터 state. 새로 고치거나 주소로 바로 오면 없다 */
export type CompleteState = { checkout?: Checkout; balanceAfter?: number }
