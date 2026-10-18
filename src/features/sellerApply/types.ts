import type { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'

// TODO(api): 📝 POST /sellers (판매자 신청), 신청 현황 조회는 API 없음(❌). 필드는 시안 기준 임시.

export type SellerApplyRequest = {
  storeName: string
  representativeName: string
  businessNumber: string // 000-00-00000
  mailOrderNumber: string // 통신판매업 신고번호
  bankName: string
  accountNumber: string
  accountHolder: string
}

export type SellerApplication = SellerApplyRequest & {
  status: SellerApplicationStatus
  appliedAt: string
  reviewStartedAt: string | null
  decidedAt: string | null
  suspendedAt: string | null
  rejectReason: string | null
}
