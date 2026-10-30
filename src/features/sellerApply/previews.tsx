import type { ScreenPreview } from '@/shared/lib/screenPreview'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import {
  APPLICATION_ID,
  applicationDetail,
  applicationHistory,
  applications,
  applyValues,
  rejectReason,
} from './fixtures'
import { SellerApplyView, type SellerApplyViewProps } from './views/SellerApplyView'
import { SellerStatusView, type SellerStatusViewProps } from './views/SellerStatusView'

// /__design 화면 상태 갤러리 (개발 전용, app/dev만 import한다)

const noop = () => {}

const apply = (props: Partial<SellerApplyViewProps> = {}) => (
  <SellerApplyView onSubmit={noop} {...props} />
)

const S = SellerApplicationStatus

const statusView = (
  status: SellerApplicationStatus,
  props: Partial<SellerStatusViewProps> = {},
) => (
  <SellerStatusView
    status="success"
    application={applications[status]}
    detail={{ ...applicationDetail, status }}
    {...props}
  />
)

export const sellerApplyPreviews: ScreenPreview[] = [
  {
    id: 'seller-apply',
    title: 'S-01 판매자 등록 신청',
    layout: 'public',
    path: '/seller/apply',
    states: [
      { id: 'step1', label: '1단계 · 상점 정보', render: () => apply() },
      {
        id: 'step2',
        label: '2단계 · 확인',
        render: () => apply({ defaultValues: applyValues, defaultStep: 1 }),
      },
      {
        id: 'duplicate',
        label: '사업자번호 중복 (409 → 칸)',
        render: () =>
          apply({
            defaultValues: applyValues,
            defaultStep: 1,
            serverErrors: { businessNumber: '이미 신청된 사업자등록번호입니다.' },
          }),
      },
      {
        id: 'in-progress',
        label: '진행 중인 신청 있음 (409 → 문구)',
        render: () =>
          apply({
            defaultValues: applyValues,
            defaultStep: 1,
            errorMessage: '심사 중인 판매자 신청이 있습니다.',
          }),
      },
      {
        id: 'reapply',
        label: '반려 후 다시 신청',
        render: () =>
          apply({
            defaultValues: { ...applyValues, mailOrderNumber: '' },
            rejectReason,
          }),
      },
      {
        id: 'done',
        label: '신청 완료',
        toast: { message: '판매자 등록을 신청했어요' },
        render: () =>
          apply({
            completed: {
              ...applyValues,
              applicationId: APPLICATION_ID,
              appliedAt: applications[S.PENDING].appliedAt,
            },
          }),
      },
    ],
  },
  {
    id: 'seller-status',
    title: 'S-02 판매자 신청 현황',
    layout: 'public',
    path: '/seller/apply/status',
    states: [
      ...(
        [
          [S.PENDING, '신청 완료'],
          [S.IN_REVIEW, '심사 중'],
          [S.APPROVED, '승인 (권한 받음)'],
          [S.REJECTED, '반려'],
        ] as const
      ).map(([status, label]) => ({
        id: status.toLowerCase(),
        label,
        render: () => statusView(status),
      })),
      {
        id: 'approved-grant',
        label: '승인 · 판매자 권한 받기',
        render: () => statusView(S.APPROVED, { grantSeller: { onGrant: noop, granting: false } }),
      },
      {
        id: 'approved-grant-error',
        label: '승인 · 권한 받기 실패',
        render: () =>
          statusView(S.APPROVED, {
            grantSeller: { onGrant: noop, granting: false, error: '로그인이 필요해요' },
          }),
      },
      {
        id: 'with-history',
        label: '반려 뒤 다시 신청 (이전 신청 이력)',
        render: () => (
          <SellerStatusView
            status="success"
            application={applicationHistory[0]}
            detail={{
              ...applicationDetail,
              applicationId: APPLICATION_ID + 1,
              status: S.IN_REVIEW,
            }}
            history={applicationHistory.slice(1)}
          />
        ),
      },
      {
        id: 'detail-loading',
        label: '신청 정보 불러오는 중',
        render: () => statusView(S.PENDING, { detail: undefined }),
      },
      {
        id: 'none',
        label: '신청 전',
        render: () => <SellerStatusView status="notFound" />,
      },
      {
        id: 'loading',
        label: '로딩',
        render: () => <SellerStatusView status="pending" />,
      },
    ],
  },
]
