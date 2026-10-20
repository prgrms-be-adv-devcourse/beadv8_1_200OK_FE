import type {
  SellerApplicationHistoryItem,
  SellerApplicationResponse,
  SellerApplyRequest,
} from '@/shared/api/types'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'

// 샘플 데이터. 청송 햇살농원(판매자 7, 김영수)의 신청이다(products·farms fixtures와 같은 농가).
// ✅ POST/GET /sellers/me/applications, GET /sellers/me/applications/{id} 응답 모양

export const APPLICATION_ID = 31

export const applyValues: SellerApplyRequest = {
  storeName: '청송 햇살농원',
  representativeName: '김영수',
  businessNumber: '512-81-04273',
  mailOrderNumber: '제2026-경북청송-0031호',
}

export const rejectReason = '통신판매업 신고번호를 확인할 수 없어요'

const base: SellerApplicationHistoryItem = {
  applicationId: APPLICATION_ID,
  status: SellerApplicationStatus.PENDING,
  appliedAt: '2026-10-13T10:00:00',
  reviewStartedAt: null,
  approvedAt: null,
  rejectedAt: null,
  rejectReason: null,
}

/** 상태별 내역 한 건 */
export const applications: Record<SellerApplicationStatus, SellerApplicationHistoryItem> = {
  [SellerApplicationStatus.PENDING]: base,
  [SellerApplicationStatus.IN_REVIEW]: {
    ...base,
    status: SellerApplicationStatus.IN_REVIEW,
    reviewStartedAt: '2026-10-14T09:30:00',
  },
  [SellerApplicationStatus.APPROVED]: {
    ...base,
    status: SellerApplicationStatus.APPROVED,
    reviewStartedAt: '2026-10-14T09:30:00',
    approvedAt: '2026-10-15T14:00:00',
  },
  [SellerApplicationStatus.REJECTED]: {
    ...base,
    status: SellerApplicationStatus.REJECTED,
    reviewStartedAt: '2026-10-14T09:30:00',
    rejectedAt: '2026-10-15T14:00:00',
    rejectReason,
  },
}

/** 신청 한 건의 정보(GET .../applications/{id}). mailOrderNumber는 서버가 주지 않는다 */
export const applicationDetail: SellerApplicationResponse = {
  applicationId: APPLICATION_ID,
  status: SellerApplicationStatus.PENDING,
  storeName: applyValues.storeName,
  representativeName: applyValues.representativeName,
  businessNumber: applyValues.businessNumber,
  appliedAt: base.appliedAt,
}

/** 반려 뒤 다시 신청해 심사 중인 회원의 내역(최근 신청부터) */
export const applicationHistory: SellerApplicationHistoryItem[] = [
  {
    ...applications[SellerApplicationStatus.IN_REVIEW],
    applicationId: APPLICATION_ID + 1,
    appliedAt: '2026-10-16T09:00:00',
    reviewStartedAt: '2026-10-17T10:00:00',
  },
  {
    ...applications[SellerApplicationStatus.REJECTED],
    appliedAt: '2026-10-08T10:00:00',
    reviewStartedAt: '2026-10-09T09:30:00',
    rejectedAt: '2026-10-10T14:00:00',
  },
]
