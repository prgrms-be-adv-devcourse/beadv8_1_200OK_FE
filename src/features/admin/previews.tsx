import type { ScreenPreview } from '@/shared/lib/screenPreview'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import {
  adjustmentLogs,
  adjustTargetOf,
  adminPayoutItems,
  adminPayouts,
  defaultPayoutFilter,
  filterPayouts,
  findPayoutDetail,
  lastRun,
  payeeNameOfPayout,
  payees,
  runResults,
  sampleAdjustment,
  sellerApplications,
  singlePayoutErrors,
  withBalances,
} from './fixtures'
import { type AdjustLookup, type AdminSellerApplication, SellerReviewAction } from './types'
import { AdminPayoutsView, type AdminPayoutsViewProps } from './views/AdminPayoutsView'
import {
  AdminSellerDetailView,
  type AdminSellerDetailViewProps,
} from './views/AdminSellerDetailView'
import { AdminSellersView, type AdminSellersViewProps } from './views/AdminSellersView'

// /__design 화면 상태 갤러리 (개발 전용, app/dev만 import한다). 관리자 레이아웃 안에서 그린다.

const noop = () => {}
const S = SellerApplicationStatus

// ─── 판매자 심사 목록 ────────────────────────────────────

const counts = Object.fromEntries(
  Object.values(S).map((s) => [s, sellerApplications.filter((a) => a.status === s).length]),
) as Record<SellerApplicationStatus, number>

const sellersView = (tab: SellerApplicationStatus, props: Partial<AdminSellersViewProps> = {}) => (
  <AdminSellersView
    status="success"
    tab={tab}
    onTabChange={noop}
    counts={counts}
    applications={sellerApplications.filter((a) => a.status === tab)}
    {...props}
  />
)

const tabStates = (
  [
    [S.APPLIED, '심사 대기'],
    [S.UNDER_REVIEW, '심사 중'],
    [S.APPROVED, '승인'],
    [S.REJECTED, '반려'],
    [S.SUSPENDED, '권한 정지'],
  ] as const
).map(([tab, label]) => ({
  id: `tab-${tab.toLowerCase()}`,
  label: `탭 · ${label}`,
  render: () => sellersView(tab),
}))

// ─── 판매자 심사 상세 ────────────────────────────────────

const appOf = (status: SellerApplicationStatus) =>
  sellerApplications.find((a) => a.status === status) as AdminSellerApplication

const detailView = (
  application: AdminSellerApplication | null,
  props: Partial<AdminSellerDetailViewProps> = {},
) => (
  <AdminSellerDetailView
    status="success"
    application={application}
    onStartReview={noop}
    onApprove={noop}
    onReject={noop}
    onSuspend={noop}
    {...props}
  />
)

/** 방금 처리한 결과 (처리 이력 맨 위 + 토스트) */
const done = (
  app: AdminSellerApplication,
  action: SellerReviewAction,
  patch: Partial<AdminSellerApplication>,
  reason: string | null = null,
): AdminSellerApplication => ({
  ...app,
  ...patch,
  history: [...app.history, { action, at: '2026-10-18T14:20:00', adminName: '정민호', reason }],
})

const reviewing = appOf(S.UNDER_REVIEW)
const approved = appOf(S.APPROVED)

// ─── 정산 관리 ───────────────────────────────────────────

const visible = filterPayouts(adminPayouts, defaultPayoutFilter)
const sampleTarget = adjustTargetOf(Number(sampleAdjustment.orderItemId), adjustmentLogs)
const found: AdjustLookup = sampleTarget
  ? { status: 'found', target: sampleTarget }
  : { status: 'idle' }

const payoutsView = ({
  run,
  single,
  adjustment,
  ...props
}: Partial<AdminPayoutsViewProps> = {}) => (
  <AdminPayoutsView
    run={{ lastRun, result: null, onRun: noop, ...run }}
    single={{ result: null, onRun: noop, ...single }}
    adjustment={{
      lookup: { status: 'idle' },
      onOrderItemChange: noop,
      onSubmit: noop,
      result: null,
      logs: adjustmentLogs,
      ...adjustment,
    }}
    status="success"
    payouts={visible}
    payees={payees}
    filter={defaultPayoutFilter}
    onFilterChange={noop}
    totalElements={visible.length}
    detail={null}
    {...props}
  />
)

const adjustWith = (values: Partial<typeof sampleAdjustment>, lookup: AdjustLookup = found) =>
  payoutsView({
    adjustment: {
      lookup,
      onOrderItemChange: noop,
      onSubmit: noop,
      result: null,
      logs: adjustmentLogs,
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
    payeeName: detail ? payeeNameOfPayout(detail) : undefined,
  }
}

const adjustedLogs = withBalances([
  {
    adjustmentId: 4,
    orderItemId: 1210,
    amount: -10000,
    reason: sampleAdjustment.reason,
    adminName: '정민호',
    createdAt: '2026-10-18T14:20:00',
  },
  ...adjustmentLogs,
])

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
        id: 'empty',
        label: '빈 탭',
        render: () => sellersView(S.UNDER_REVIEW, { applications: [] }),
      },
      { id: 'loading', label: '로딩', render: () => sellersView(S.APPLIED, { status: 'pending' }) },
      {
        id: 'error',
        label: '불러오기 실패',
        render: () => sellersView(S.APPLIED, { status: 'error', onRetry: noop }),
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
      { id: 'applied', label: '심사 대기 · 심사 시작', render: () => detailView(appOf(S.APPLIED)) },
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
        render: () =>
          detailView(done(reviewing, SellerReviewAction.APPROVE, { status: S.APPROVED })),
      },
      {
        id: 'reject-modal',
        label: '반려 사유',
        render: () => detailView(reviewing, { defaultModal: 'reject' }),
      },
      {
        id: 'rejected-now',
        label: '반려 완료',
        toast: { message: '신청을 반려했어요' },
        render: () =>
          detailView(
            done(
              reviewing,
              SellerReviewAction.REJECT,
              { status: S.REJECTED, reason: '사업자등록번호와 상호가 일치하지 않아요' },
              '사업자등록번호와 상호가 일치하지 않아요',
            ),
          ),
      },
      { id: 'approved', label: '승인됨 · 권한 회수', render: () => detailView(approved) },
      {
        id: 'suspend-modal',
        label: '권한 회수 (주문 일괄 취소 경고)',
        render: () => detailView(approved, { defaultModal: 'suspend' }),
      },
      {
        id: 'suspended-now',
        label: '회수 완료',
        toast: {
          message: `판매 권한을 회수했어요. 진행 중인 주문 ${approved.activeOrderCount}건을 취소했어요`,
        },
        render: () =>
          detailView(
            done(
              approved,
              SellerReviewAction.SUSPEND,
              { status: S.SUSPENDED, reason: '출고 지연이 반복돼요', activeOrderCount: 0 },
              '출고 지연이 반복돼요',
            ),
          ),
      },
      { id: 'rejected', label: '반려됨', render: () => detailView(appOf(S.REJECTED)) },
      { id: 'suspended', label: '권한 정지', render: () => detailView(appOf(S.SUSPENDED)) },
      {
        id: 'not-found',
        label: '없는 신청 (404)',
        render: () => detailView(null, { status: 'notFound' }),
      },
      { id: 'loading', label: '로딩', render: () => detailView(null, { status: 'pending' }) },
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
          payoutsView({ run: { lastRun, result: null, onRun: noop, defaultConfirmOpen: true } }),
      },
      {
        id: 'running',
        label: '실행 중',
        render: () => payoutsView({ run: { lastRun, result: null, onRun: noop, running: true } }),
      },
      {
        id: 'run-ok',
        label: '실행 · 정상',
        render: () => payoutsView({ run: { lastRun, result: runResults.ok, onRun: noop } }),
      },
      {
        id: 'run-none',
        label: '실행 · 후보 없음',
        render: () => payoutsView({ run: { lastRun, result: runResults.none, onRun: noop } }),
      },
      {
        id: 'run-busy',
        label: '실행 · 새벽 정산 중 (409)',
        render: () => payoutsView({ run: { lastRun, result: runResults.busy, onRun: noop } }),
      },
      {
        id: 'single-ok',
        label: '1건 정산 · 성공',
        render: () =>
          payoutsView({
            single: {
              defaultOrderItemId: '1301',
              result: { kind: 'success', orderItemId: 1301 },
              onRun: noop,
            },
          }),
      },
      {
        id: 'single-unconfirmed',
        label: '1건 정산 · 구매확정 전',
        render: () =>
          payoutsView({
            single: {
              defaultOrderItemId: '1340',
              result: { kind: 'error', message: singlePayoutErrors.unconfirmed },
              onRun: noop,
            },
          }),
      },
      {
        id: 'single-paid',
        label: '1건 정산 · 이미 정산됨',
        render: () =>
          payoutsView({
            single: {
              defaultOrderItemId: '1210',
              result: { kind: 'error', message: singlePayoutErrors.alreadyPaid },
              onRun: noop,
            },
          }),
      },
      {
        id: 'adjust-preview',
        label: '조정 · 미리보기',
        render: () =>
          payoutsView({
            adjustment: {
              lookup: found,
              onOrderItemChange: noop,
              onSubmit: noop,
              result: null,
              logs: adjustmentLogs,
              defaultValues: sampleAdjustment,
            },
          }),
      },
      {
        id: 'adjust-ok',
        label: '조정 · 성공',
        render: () =>
          payoutsView({
            adjustment: {
              lookup: { status: 'idle' },
              onOrderItemChange: noop,
              onSubmit: noop,
              result: sampleTarget
                ? {
                    orderItemId: sampleTarget.orderItemId,
                    amount: -10000,
                    before: sampleTarget.currentAmount,
                    after: sampleTarget.currentAmount - 10000,
                  }
                : null,
              logs: adjustedLogs,
            },
          }),
      },
      {
        id: 'adjust-not-found',
        label: '조정 · 없는 주문 상품',
        render: () => adjustWith({ orderItemId: '9999' }, { status: 'notFound' }),
      },
      {
        id: 'adjust-no-reason',
        label: '조정 · 사유 없음',
        render: () => adjustWith({ reason: '' }),
      },
      {
        id: 'adjust-negative',
        label: '조정 · 0원 미만',
        render: () => adjustWith({ amount: '-30,000' }),
      },
      {
        id: 'detail',
        label: '정산 상세 · 판매자',
        render: () => payoutsView({ detail: detailOf(1021) }),
      },
      {
        id: 'detail-system',
        label: '정산 상세 · 플랫폼 수수료',
        render: () => payoutsView({ detail: detailOf(1024) }),
      },
      {
        id: 'filter-seller',
        label: '받는 사람 필터',
        render: () => {
          const filter = { ...defaultPayoutFilter, payee: 7 }
          const list = filterPayouts(adminPayouts, filter)
          return payoutsView({ filter, payouts: list, totalElements: list.length })
        },
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
        render: () => payoutsView({ status: 'error', onRetry: noop }),
      },
    ],
  },
]
