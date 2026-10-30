import { z } from 'zod'
import { InquiryType } from './types'

// 고객센터 문의: 유형 4종, 내용 10~1,000자 (시안·정책 C-8). TODO(api): 서버 제약이 나오면 맞춘다.

export const INQUIRY_MIN = 10
export const INQUIRY_MAX = 1000

export const inquirySchema = z.object({
  orderItemId: z.number({ message: '문의할 상품을 골라 주세요' }),
  type: z.enum(InquiryType, { message: '문의 유형을 골라 주세요' }),
  content: z
    .string()
    .trim()
    .min(INQUIRY_MIN, `${INQUIRY_MIN}자 이상 써 주세요`)
    .max(INQUIRY_MAX, `${INQUIRY_MAX.toLocaleString('ko-KR')}자까지 쓸 수 있어요`),
})

export type InquiryFormValues = z.infer<typeof inquirySchema>
