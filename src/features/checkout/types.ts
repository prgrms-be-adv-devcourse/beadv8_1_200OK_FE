/** 결제 진행 상태. processing은 닫을 수 없는 모달, failed는 실패 안내 */
export type PaymentState = 'idle' | 'processing' | 'failed'

/** 배송비 견적 상태. idle = 우편번호가 없어 아직 안 물어봄 */
export type FeeQuoteStatus = 'idle' | 'pending' | 'error' | 'success'
