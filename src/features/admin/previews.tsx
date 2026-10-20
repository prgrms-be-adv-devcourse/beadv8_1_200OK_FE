import type { SellerApplicationAdminDetail } from '@/shared/api/types'
import type { ScreenPreview } from '@/shared/lib/screenPreview'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { UNSUPPORTED_MESSAGE } from './errors'
import {
  ADMIN_MEMBER_ID,
  adminPayoutItems,
  adminPayouts,
  applicationCounts,
  defaultPayoutFilter,
  filterPayouts,
  findPayoutDetail,
  runResults,
  sampleAdjustment,
  sampleAdjustTarget,
  sellerApplicationSummaries,
  sellerApplications,
} from './fixtures'
import { type AdjustLookup, SellerReviewAction } from './types'
import { AdminPayoutsView, type AdminPayoutsViewProps, payeeNameOf } from './views/AdminPayoutsView'
import {
  AdminSellerDetailView,
  type AdminSellerDetailViewProps,
} from './views/AdminSellerDetailView'
import { AdminSellersView, type AdminSellersViewProps } from './views/AdminSellersView'

// /__design 화면 상태 갤러리 (개발 전용, app/dev만 import한다). 관리자 레이아웃 안에서 그린다.

const noop = () => {}
const S = SellerApplicationStatus

// ─── 판매자 심사 목록 ────────────────────────────────────

const sellersView = (tab: SellerApplicationStatus, props: Partial<AdminSellersViewProps> = {}) => (
  <AdminSellersView
    status="success"
    tab={tab}
    onTabChange={noop}
    counts={applicationCounts}
    applications={sellerApplicationSummaries.filter((a) => a.status === tab)}
    {...props}
  />
)

const tabStates = (
  [
    [S.PENDING, '심사 대기'],
    [S.IN_REVIEW, '심사 중'],
    [S.APPROVED, '승인'],
    [S.REJECTED, '반려'],
  ] as const
).map(([tab, label]) => ({
  id: `tab-${tab.toLowerCase()}`,
  label: `탭 · ${label}`,
  render: () => sellersView(tab),
}))

// ─── 판매자 심사 상세 ────────────────────────────────────

const appOf = (status: SellerApplicationStatus) =>
  sellerApplications.find((a) => a.status === status) as SellerApplicationAdminDetail

const detailView = (
  application: SellerApplicationAdminDetail | null,
  props: Partial<AdminSellerDetailViewProps> = {},
) => (
  <AdminSellerDetailView
    status="success"
    application={application}
    onStartReview={noop}
    onApprove={noop}
    onReject={noop}
    {...props}
  />
)

const NOW = '2026-10-18T14:20:00'
const pending = appOf(S.PENDING)
const reviewing = appOf(S.IN_REVIEW)

/** 방금 처리한 결과 (서버가 돌려주는 ‘처리 뒤 상세’ 모양) */
const approvedNow: SellerApplicationAdminDetail = {
  ...reviewing,
  status: S.APPROVED,
  approvedAt: NOW,
  reviewerId: ADMIN_MEMBER_ID,
}
const rejectedNow: SellerApplicationAdminDetail = {
  ...reviewing,
  status: S.REJECTED,
  rejectedAt: NOW,
  rejectReason: '사업자등록번호와 상호가 일치하지 않아요',
  reviewerId: ADMIN_MEMBER_ID,
}
const reviewingNow: SellerApplicationAdminDetail = {
  ...pending,
  status: S.IN_REVIEW,
  reviewStartedAt: NOW,
}

// ─── 정산 관리 ───────────────────────────────────────────

const visible = filterPayouts(adminPayouts, defaultPayoutFilter)
const found: AdjustLookup = { status: 'found', target: sampleAdjustTarget }

const payoutsView = ({
  run,
  single,
  adjustment,
  ...props
}: Partial<AdminPayoutsViewProps> = {}) => (
  <AdminPayoutsView
    run={{
      pendingCandidateCount: 3,
      result: null,
      onRun: noop,
      onRunSkipWait: noop,
      ...run,
    }}
    single={{ result: null, onRun: noop, ...single }}
    adjustment={{
      lookup: { status: 'idle' },
      onOrderItemChange: noop,
      onSubmit: noop,
      result: null,
      logs: [],
      ...adjustment,
    }}
    status="success"
    payouts={visible}
    filter={defaultPayoutFilter}
    onFilterChange={noop}
    totalElements={visible.length}
    detail={null}
    {...props}
  />
)

const adjustWith = (
  values: Partial<typeof sampleAdjustment>,
  lookup: AdjustLookup = { status: 'idle' },
) =>
  payoutsView({
    adjustment: {
      lookup,
      onOrderItemChange: noop,
      onSubmit: noop,
      result: null,
      logs: [],
      defaultValues: { ...sampleAdjustment, ...values },
      defaultShowErrors: true,
    },
  })

const detailOf = (payoutId: number): AdminPayoutsViewProps['detail'] => {
  const detail = findPayoutDetail(payoutId)
  return {
    onClose: noop,
    status: detail ? 'success' : 'notFound',
    payout: detail,
    items: adminPayoutItems[payoutId] ?? [],
    payeeName: detail ? payeeNameOf(detail) : undefined,
  }
}

export const adminPreviews: ScreenPreview[] = [
  {
    id: 'admin-sellers',
    title: 'M-01 판매자 심사 목록',
    pageTitle: '판매자 심사',
    layout: 'admin',
    path: '/admin/sellers',
    states: [
      ...tabStates,
      {
        id: 'counts-loading',
        label: '개수 불러오는 중',
        render: () => sellersView(S.PENDING, { counts: {} }),
      },
      {
        id: 'empty',
        label: '빈 탭',
        render: () => sellersView(S.IN_REVIEW, { applications: [] }),
      },
      { id: 'loading', label: '로딩', render: () => sellersView(S.PENDING, { status: 'pending' }) },
      {
        id: 'error',
        label: '불러오기 실패',
        render: () => sellersView(S.PENDING, { status: 'error', onRetry: noop }),
      },
    ],
  },
  {
    id: 'admin-seller-detail',
    title: 'M-02 판매자 심사 상세',
    pageTitle: '판매자 심사 상세',
    layout: 'admin',
    path: '/admin/sellers/16',
    states: [
      { id: 'applied', label: '심사 대기 · 심사 시작/반려', render: () => detailView(pending) },
      {
        id: 'review-starting',
        label: '심사 시작 처리 중',
        render: () => detailView(pending, { submitting: SellerReviewAction.START_REVIEW }),
      },
      {
        id: 'reviewing-now',
        label: '심사 시작 완료',
        toast: { message: '심사를 시작했어요' },
        render: () => detailView(reviewingNow),
      },
      { id: 'reviewing', label: '심사 중 · 승인/반려', render: () => detailView(reviewing) },
      {
        id: 'approving',
        label: '승인 처리 중',
        render: () => detailView(reviewing, { submitting: SellerReviewAction.APPROVE }),
      },
      {
        id: 'approved-now',
        label: '승인 완료',
        toast: { message: `${reviewing.storeName} 판매자를 승인했어요` },
        render: () => detailView(approvedNow),
      },
      {
        id: 'reject-modal',
        label: '반려 사유',
        render: () => detailView(reviewing, { defaultModal: 'reject' }),
      },
      {
        id: 'reject-server-error',
        label: '반려 사유 · 서버 422',
        render: () =>
          detailView(reviewing, {
            defaultModal: 'reject',
            rejectError: '거절 사유는 500자 이하여야 합니다.',
          }),
      },
      {
        id: 'rejected-now',
        label: '반려 완료',
        toast: { message: '신청을 반려했어요' },
        render: () => detailView(rejectedNow),
      },
      {
        id: 'approved',
        label: '승인됨 · 권한 회수 미지원',
        render: () => detailView(appOf(S.APPROVED)),
      },
      { id: 'rejected', label: '반려됨', render: () => detailView(appOf(S.REJECTED)) },
      {
        id: 'not-found',
        label: '없는 신청 (404)',
        render: () => detailView(null, { status: 'notFound' }),
      },
      { id: 'loading', label: '로딩', render: () => detailView(null, { status: 'pending' }) },
      {
        id: 'error',
        label: '불러오기 실패',
        render: () => detailView(null, { status: 'error', onRetry: noop }),
      },
    ],
  },
  {
    id: 'admin-payouts',
    title: 'M-03 정산 관리',
    pageTitle: '정산 관리',
    layout: 'admin',
    path: '/admin/payouts',
    states: [
      { id: 'default', label: '기본', render: () => payoutsView() },
      {
        id: 'run-confirm',
        label: '실행 확인',
        render: () =>
          payoutsView({
            run: { result: null, onRun: noop, onRunSkipWait: noop, defaultConfirm: 'run' },
          }),
      },
      {
        id: 'run-skip-wait-confirm',
        label: '대기 건너뛰기 확인',
        render: () =>
          payoutsView({
            run: { result: null, onRun: noop, onRunSkipWait: noop, defaultConfirm: 'skipWait' },
          }),
      },
      {
        id: 'running',
        label: '실행 중',
        render: () =>
          payoutsView({ run: { result: null, onRun: noop, onRunSkipWait: noop, running: true } }),
      },
      {
        id: 'run-ok',
        label: '실행 · 정상',
        render: () =>
          payoutsView({ run: { result: runResults.ok, onRun: noop, onRunSkipWait: noop } }),
      },
      {
        id: 'run-skip-wait',
        label: '실행 · 대기 건너뛰기',
        render: () =>
          payoutsView({ run: { result: runResults.skipWait, onRun: noop, onRunSkipWait: noop } }),
      },
      {
        id: 'run-error',
        label: '실행 · 배치 실패 (500)',
        render: () =>
          payoutsView({ run: { result: runResults.error, onRun: noop, onRunSkipWait: noop } }),
      },
      {
        id: 'single-unsupported',
        label: '1건 정산 · 미지원 (501)',
        render: () =>
          payoutsView({
            single: {
              defaultOrderItemId: '1301',
              result: { kind: 'error', message: UNSUPPORTED_MESSAGE },
              onRun: noop,
            },
          }),
      },
      {
        id: 'adjust-filled',
        label: '조정 · 입력 완료',
        render: () =>
          payoutsView({
            adjustment: {
              lookup: { status: 'idle' },
              onOrderItemChange: noop,
              onSubmit: noop,
              result: null,
              logs: [],
              defaultValues: sampleAdjustment,
            },
          }),
      },
      {
        id: 'adjust-preview',
        label: '조정 · 미리보기 (금액 조회 API 생기면)',
        render: () =>
          payoutsView({
            adjustment: {
              lookup: found,
              onOrderItemChange: noop,
              onSubmit: noop,
              result: null,
              logs: [],
              defaultValues: sampleAdjustment,
            },
          }),
      },
      {
        id: 'adjust-unsupported',
        label: '조정 · 미지원 (501)',
        render: () =>
          payoutsView({
            adjustment: {
              lookup: { status: 'idle' },
              onOrderItemChange: noop,
              onSubmit: noop,
              result: null,
              logs: [],
              errorMessage: UNSUPPORTED_MESSAGE,
              defaultValues: sampleAdjustment,
            },
          }),
      },
      {
        id: 'adjust-no-reason',
        label: '조정 · 사유 없음',
        render: () => adjustWith({ reason: '' }),
      },
      {
        id: 'adjust-negative',
        label: '조정 · 0원 미만 (금액 조회 API 생기면)',
        render: () => adjustWith({ amount: '-30,000' }, found),
      },
      {
        id: 'detail',
        label: '정산 상세 · 판매자 (배송비 묶음 포함)',
        render: () => payoutsView({ detail: detailOf(1021) }),
      },
      {
        id: 'detail-system',
        label: '정산 상세 · 플랫폼 수수료',
        render: () => payoutsView({ detail: detailOf(1024) }),
      },
      {
        id: 'filter-seller',
        label: '판매자 지정 필터',
        render: () => {
          const filter = { ...defaultPayoutFilter, payee: 'seller' as const, payeeId: '7' }
          const list = filterPayouts(adminPayouts, filter)
          return payoutsView({ filter, payouts: list, totalElements: list.length })
        },
      },
      {
        id: 'filter-seller-empty-id',
        label: '판매자 지정 · 회원 번호 입력 전',
        render: () =>
          payoutsView({
            filter: { ...defaultPayoutFilter, payee: 'seller', payeeId: '' },
            status: 'pending',
          }),
      },
      {
        id: 'empty',
        label: '조건에 맞는 정산 없음',
        render: () =>
          payoutsView({
            filter: { ...defaultPayoutFilter, from: '2026-10-01', to: '2026-10-05' },
            payouts: [],
            totalElements: 0,
          }),
      },
      {
        id: 'range-error',
        label: '기간 오류',
        render: () =>
          payoutsView({ filter: { ...defaultPayoutFilter, from: '2026-10-19', to: '2026-10-17' } }),
      },
      { id: 'loading', label: '목록 로딩', render: () => payoutsView({ status: 'pending' }) },
      {
        id: 'error',
        label: '목록 불러오기 실패',
        render: () =>
          payoutsView({
            status: 'error',
            onRetry: noop,
            errorMessage: '기간은 최대 1년까지 조회할 수 있습니다.',
          }),
      },
    ],
  },
]
