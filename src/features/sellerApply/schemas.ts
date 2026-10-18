import { z } from 'zod'

// 판매자 신청 검증. TODO(api): 📝 POST /sellers 제약이 나오면 맞춘다(지금은 시안·일반 형식 기준).

export const applySchema = z.object({
  storeName: z
    .string()
    .trim()
    .min(1, '상호명을 입력해 주세요')
    .max(50, '상호명은 50자 이하로 입력해 주세요'),
  representativeName: z
    .string()
    .trim()
    .min(1, '대표자명을 입력해 주세요')
    .max(50, '대표자명은 50자 이하로 입력해 주세요'),
  businessNumber: z
    .string()
    .trim()
    .regex(/^\d{3}-\d{2}-\d{5}$/, '사업자등록번호 10자리를 000-00-00000 형식으로 입력해 주세요'),
  mailOrderNumber: z.string().trim().min(1, '통신판매업 신고번호를 입력해 주세요'),
  bankName: z.string().min(1, '은행을 골라 주세요'),
  accountNumber: z
    .string()
    .trim()
    .regex(/^[\d-]{8,20}$/, '계좌번호는 숫자와 -로 8~20자 입력해 주세요'),
  accountHolder: z.string().trim().min(1, '예금주를 입력해 주세요'),
})

export type ApplyFormValues = z.infer<typeof applySchema>

/** 단계별 칸 (다음 단계로 갈 때 이 칸만 검사한다) */
export const stepFields: (keyof ApplyFormValues)[][] = [
  ['storeName', 'representativeName', 'businessNumber', 'mailOrderNumber'],
  ['bankName', 'accountNumber', 'accountHolder'],
  [],
]
