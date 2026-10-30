import { z } from 'zod'

// 배송지 검증. 규칙은 Bruno CreateOrderRequest 필드 제약 그대로(DECISIONS.md A-6).
// shared/ui 안에서만 쓴다(AddressModal).

export const addressSchema = z.object({
  recipientName: z
    .string()
    .trim()
    .min(1, '받는 분을 입력해 주세요')
    .max(50, '받는 분은 50자 이하로 입력해 주세요'),
  recipientPhone: z
    .string()
    .trim()
    .regex(/^01\d-\d{3,4}-\d{4}$/, '연락처를 010-1234-5678 형식으로 입력해 주세요'),
  zipCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, '우편번호 찾기로 주소를 골라 주세요'),
  address: z
    .string()
    .trim()
    .min(1, '주소를 입력해 주세요')
    .max(200, '주소는 200자 이하로 입력해 주세요'),
  addressDetail: z.string().trim().max(100, '상세주소는 100자 이하로 입력해 주세요'),
})

export type AddressFormValues = z.infer<typeof addressSchema>
