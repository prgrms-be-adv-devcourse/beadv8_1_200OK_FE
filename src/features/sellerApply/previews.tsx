import type { ScreenPreview } from '@/shared/lib/screenPreview'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { applications, applyValues } from './fixtures'
import { SellerApplyView, type SellerApplyViewProps } from './views/SellerApplyView'
import { SellerStatusView } from './views/SellerStatusView'

// /__design 화면 상태 갤러리 (개발 전용, app/dev만 import한다)

const apply = (props: Partial<SellerApplyViewProps> = {}) => (
  <SellerApplyView onSubmit={() => {}} {...props} />
)

const S = SellerApplicationStatus

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
        label: '2단계 · 정산 계좌',
        render: () => apply({ defaultValues: applyValues, defaultStep: 1 }),
      },
      {
        id: 'step3',
        label: '3단계 · 확인',
        render: () => apply({ defaultValues: applyValues, defaultStep: 2 }),
      },
      {
        id: 'duplicate',
        label: '사업자번호 중복',
        render: () =>
          apply({
            defaultValues: applyValues,
            defaultStep: 2,
            serverErrors: { businessNumber: '이미 등록된 사업자등록번호예요' },
          }),
      },
      {
        id: 'reapply',
        label: '반려 후 다시 신청',
        render: () =>
          apply({
            defaultValues: applyValues,
            rejectReason: applications[S.REJECTED].rejectReason,
          }),
      },
      {
        id: 'done',
        label: '신청 완료',
        toast: { message: '판매자 등록을 신청했어요' },
        render: () => apply({ completed: applications[S.APPLIED] }),
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
          [S.APPLIED, '신청 완료'],
          [S.UNDER_REVIEW, '심사 중'],
          [S.APPROVED, '승인'],
          [S.REJECTED, '반려'],
          [S.SUSPENDED, '권한 정지'],
        ] as const
      ).map(([status, label]) => ({
        id: status.toLowerCase(),
        label,
        render: () => <SellerStatusView status="success" application={applications[status]} />,
      })),
      {
        id: 'none',
        label: '신청 전',
        render: () => <SellerStatusView status="notFound" />,
      },
    ],
  },
]
