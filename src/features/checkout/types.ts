/** 결제 진행 상태. processing은 닫을 수 없는 모달, failed는 실패 안내 */
export type PaymentState = 'idle' | 'processing' | 'failed'

/** 배송비 견적 상태. idle = 우편번호가 없어 아직 안 물어봄 */
export type FeeQuoteStatus = 'idle' | 'pending' | 'error' | 'success'

/**
 * 주문 뒤 결제 확인 결과(#76). waiting = 아직 결제 대기(또는 주문 상세를 못 받음), timedOut = 기다린 시간이 지나도 결제 대기.
 * 실패(PAYMENT_FAILED)와 취소(CANCELED)는 둘 다 결제가 안 된 것이라 failed로 묶는다
 */
export type PaymentResult = 'waiting' | 'paid' | 'failed' | 'timedOut'
