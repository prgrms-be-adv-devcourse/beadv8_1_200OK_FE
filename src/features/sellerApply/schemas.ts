import { z } from 'zod'

// 판매자 신청 검증. ✅ SellerApplyRequest(POST /sellers/me/applications) 규칙:
// 상호·대표자 50자, 사업자등록번호 숫자 10자리(하이픈 없이 보내도 000-00-00000으로 저장), 통신판매업 신고번호 50자.

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
    .regex(/^(\d{10}|\d{3}-\d{2}-\d{5})$/, '사업자등록번호 10자리를 입력해 주세요 (000-00-00000)'),
  mailOrderNumber: z
    .string()
    .trim()
    .min(1, '통신판매업 신고번호를 입력해 주세요')
    .max(50, '통신판매업 신고번호는 50자 이하로 입력해 주세요'),
})

export type ApplyFormValues = z.infer<typeof applySchema>

/** 단계별 칸 (다음 단계로 갈 때 이 칸만 검사한다). 정산 계좌 단계는 API에 없어 뺐다(승인 뒤 지갑에서 등록, 준비 중) */
export const stepFields: (keyof ApplyFormValues)[][] = [
  ['storeName', 'representativeName', 'businessNumber', 'mailOrderNumber'],
  [],
]

/** 숫자만 뽑아 000-00-00000 으로 맞춘다(서버가 저장하는 모양과 같게) */
export function formatBusinessNumber(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 10) return value.trim()
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
}
