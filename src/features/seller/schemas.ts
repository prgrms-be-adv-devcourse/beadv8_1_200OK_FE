import { z } from 'zod'
import { STORE_INTRO_MAX } from '@/shared/lib/constants'

// 상점 프로필 검증. TODO(api): 📝 PATCH /sellers/me 제약이 나오면 맞춘다.

export const profileSchema = z.object({
  storeName: z
    .string()
    .trim()
    .min(1, '상호명을 입력해 주세요')
    .max(50, '상호명은 50자 이하로 입력해 주세요'),
  representativeName: z.string().trim().min(1, '대표자명을 입력해 주세요'),
  customerServicePhone: z
    .string()
    .trim()
    .regex(/^0\d{1,2}-\d{3,4}-\d{4}$/, '연락처를 054-873-2210 형식으로 입력해 주세요'),
  introduction: z
    .string()
    .trim()
    .max(STORE_INTRO_MAX, `소개는 ${STORE_INTRO_MAX}자까지 쓸 수 있어요`),
})

export type ProfileFormValues = z.infer<typeof profileSchema>

// 정산 계좌 변경 요청 (C-6: 관리자에게 요청 → 확인 후 변경). TODO(api): ❌ 계좌 변경 API 없음. 계좌번호 규칙은 판매자 신청과 같게.

export const ACCOUNT_CHANGE_REASON_MAX = 200

export const accountChangeSchema = z.object({
  bankName: z.string().min(1, '은행을 골라 주세요'),
  accountNumber: z
    .string()
    .trim()
    .regex(/^[\d-]{8,20}$/, '계좌번호는 숫자와 -로 8~20자 입력해 주세요'),
  holder: z.string().trim().min(1, '예금주를 입력해 주세요'),
  reason: z
    .string()
    .trim()
    .max(ACCOUNT_CHANGE_REASON_MAX, `사유는 ${ACCOUNT_CHANGE_REASON_MAX}자까지 쓸 수 있어요`),
})

export type AccountChangeValues = z.infer<typeof accountChangeSchema>
