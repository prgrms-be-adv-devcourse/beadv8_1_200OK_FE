import { z } from 'zod'
import { PayoutEventType } from '@/shared/api/types'

// 관리자 화면 검증. 제약은 Swagger 기준: 반려 사유 500자, 조정 사유 1~255자(공백만 안 됨), 조정 금액 0 불가, 해결 메모 1~255자.

// ─── 반려 사유 ───────────────────────────────────────────

export const REVIEW_REASON_MAX = 500

export const reviewReasonSchema = z
  .string()
  .trim()
  .min(1, '사유를 입력해 주세요')
  .max(REVIEW_REASON_MAX, `사유는 ${REVIEW_REASON_MAX}자까지 쓸 수 있어요`)

// ─── 충전 건 실패 처리 · 결제 취소 사유 ──────────────────

/** 결제 취소 사유는 토스에도 보내서 토스 상한(200자)에 맞춘다 (ChargeAdminReasonRequest) */
export const CHARGE_REASON_MAX = 200

export const chargeReasonSchema = z
  .string()
  .trim()
  .min(1, '사유를 입력해 주세요. 충전 건 기록에 남아요')
  .max(CHARGE_REASON_MAX, `사유는 ${CHARGE_REASON_MAX}자까지 쓸 수 있어요`)

// ─── 정산 조정 ───────────────────────────────────────────

export const ADJUST_REASON_MAX = 255
const AMOUNT_MAX_DIGITS = 9

/** ‘-10,000’ · ‘−10000’ · ‘3,000’ → 숫자. 비었으면 0 */
export function parseSignedAmount(text: string): number {
  const negative = /^\s*[-−]/.test(text)
  const digits = text.replace(/\D/g, '')
  if (!digits) return 0
  return (negative ? -1 : 1) * Number(digits)
}

/** 입력하는 동안 ‘-10,000’ 모양으로 맞춘다 (앞의 - 만 남기고 숫자에 쉼표) */
export function formatSignedInput(raw: string): string {
  const negative = /^\s*[-−]/.test(raw)
  const digits = raw.replace(/\D/g, '').slice(0, AMOUNT_MAX_DIGITS)
  return `${negative ? '-' : ''}${digits ? Number(digits).toLocaleString('ko-KR') : ''}`
}

export const adjustmentSchema = z.object({
  orderItemId: z
    .string()
    .trim()
    .min(1, '주문 상품 번호를 입력해 주세요')
    .regex(/^\d+$/, '주문 상품 번호는 숫자로 입력해 주세요'),
  // 배송비(SALE_SHIPPING_FEE)는 주문 항목 ID가 없어 조정할 수 없다 (서버도 422)
  eventType: z.enum([PayoutEventType.SALE_AMOUNT, PayoutEventType.SALE_FEE]),
  amount: z
    .string()
    .refine(
      (value) => parseSignedAmount(value) !== 0,
      '조정 금액을 입력해 주세요. 0원은 조정할 수 없어요',
    ),
  reason: z
    .string()
    .trim()
    .min(1, '사유를 입력해 주세요. 나중에 정산 기록을 볼 때 근거가 돼요')
    .max(ADJUST_REASON_MAX, `사유는 ${ADJUST_REASON_MAX}자까지 쓸 수 있어요`),
})

export type AdjustmentFormValues = z.infer<typeof adjustmentSchema>

// ─── 막힌 주문 해결 ──────────────────────────────────────

/** 서버 해결 기록 memo 컬럼 길이 */
export const RESOLUTION_MEMO_MAX = 255

export const resolutionMemoSchema = z
  .string()
  .trim()
  .min(1, '무엇을 확인하거나 고쳤는지 메모를 남겨 주세요')
  .max(RESOLUTION_MEMO_MAX, `메모는 ${RESOLUTION_MEMO_MAX}자까지 쓸 수 있어요`)
