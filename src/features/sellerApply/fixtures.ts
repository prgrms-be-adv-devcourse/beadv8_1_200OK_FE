import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import type { SellerApplication, SellerApplyRequest } from './types'

// 1단계 샘플 데이터. 청송 햇살농원(판매자 7, 김영수)의 신청이다(products·farms fixtures와 같은 농가).

export const applyValues: SellerApplyRequest = {
  storeName: '청송 햇살농원',
  representativeName: '김영수',
  businessNumber: '512-81-04273',
  mailOrderNumber: '제2026-경북청송-0031호',
  bankName: '농협은행',
  accountNumber: '301-0287-5521-91',
  accountHolder: '김영수',
}

const base: SellerApplication = {
  ...applyValues,
  status: SellerApplicationStatus.APPLIED,
  appliedAt: '2026-10-13T10:00:00',
  reviewStartedAt: null,
  decidedAt: null,
  suspendedAt: null,
  rejectReason: null,
}

export const applications: Record<SellerApplicationStatus, SellerApplication> = {
  [SellerApplicationStatus.APPLIED]: base,
  [SellerApplicationStatus.UNDER_REVIEW]: {
    ...base,
    status: SellerApplicationStatus.UNDER_REVIEW,
    reviewStartedAt: '2026-10-14T09:30:00',
  },
  [SellerApplicationStatus.APPROVED]: {
    ...base,
    status: SellerApplicationStatus.APPROVED,
    reviewStartedAt: '2026-10-14T09:30:00',
    decidedAt: '2026-10-15T14:00:00',
  },
  [SellerApplicationStatus.REJECTED]: {
    ...base,
    status: SellerApplicationStatus.REJECTED,
    reviewStartedAt: '2026-10-14T09:30:00',
    decidedAt: '2026-10-15T14:00:00',
    rejectReason: '통신판매업 신고번호를 확인할 수 없어요',
  },
  [SellerApplicationStatus.SUSPENDED]: {
    ...base,
    status: SellerApplicationStatus.SUSPENDED,
    reviewStartedAt: '2026-10-14T09:30:00',
    decidedAt: '2026-10-15T14:00:00',
    suspendedAt: '2026-10-17T11:00:00',
  },
}
