import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import type { PayoutAdjustmentCreateRequest } from '@/shared/api/types'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { showToast } from '@/shared/ui'
import { adminErrorMessage, isConflict } from '../errors'
import { defaultPayoutFilter } from '../payoutFilter'
import {
  useAdminPayout,
  useAdminPayoutItems,
  useAdminPayouts,
  useCreatePayoutAdjustment,
  usePendingCandidateCount,
  useRunPayoutForOrderItem,
  useRunPayouts,
  useSellerApplication,
  useSellerApplicationCounts,
  useSellerApplicationMutations,
  useSellerApplications,
} from '../queries'
import {
  type AdjustmentResult,
  type PayoutFilter,
  type PayoutRunResult,
  SellerReviewAction,
  type SinglePayoutResult,
} from '../types'
import { AdminPayoutsView, payeeNameOf } from '../views/AdminPayoutsView'
import { AdminSellerDetailView } from '../views/AdminSellerDetailView'
import { AdminSellersView } from '../views/AdminSellersView'

// M-01 · M-02 · M-03 라우트 (관리자 콘솔 청크). 모두 Bearer ADMIN.
// 판매자 심사 ✅ GET/POST /admin/seller-applications…, 정산 ✅ GET /admin/payouts…, POST …/run · run/skip-wait.
// 1건 정산 · 수동 조정은 서버가 501이라 안내 문구만 보인다(errors.ts).

const S = SellerApplicationStatus

const isStatus = (value: string | null): value is SellerApplicationStatus =>
  Object.values(S).includes(value as SellerApplicationStatus)

const pageOf = (params: URLSearchParams) => Math.max(1, Number(params.get('page')) || 1)

/** 라우트 파라미터 → 양의 정수. 아니면 null(없는 것으로 다룬다) */
const idOf = (raw: string | undefined) => {
  const id = Number(raw)
  return raw !== undefined && Number.isInteger(id) && id > 0 ? id : null
}

export function AdminSellersPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('status')
  const tab = isStatus(raw) ? raw : S.PENDING
  const page = pageOf(params)
  const list = useSellerApplications(tab, page - 1)
  const counts = useSellerApplicationCounts()

  return (
    <AdminSellersView
      status={list.isError ? 'error' : list.isPending ? 'pending' : 'success'}
      tab={tab}
      onTabChange={(next) => setParams({ status: next })}
      counts={counts}
      applications={list.data?.content ?? []}
      page={page}
      totalPages={list.data?.totalPages ?? 1}
      onPageChange={(next) => setParams({ status: tab, page: String(next) })}
      onRetry={() => void list.refetch()}
    />
  )
}

export function AdminSellerDetailPage() {
  const { applicationId } = useParams()
  const id = idOf(applicationId)
  const query = useSellerApplication(id)
  const { startReview, approve, reject } = useSellerApplicationMutations(id)
  const [rejectError, setRejectError] = useState<string | null>(null)

  const status =
    id === null || query.error?.status === 404
      ? 'notFound'
      : query.isError
        ? 'error'
        : query.isPending
          ? 'pending'
          : 'success'

  const submitting = startReview.isPending
    ? SellerReviewAction.START_REVIEW
    : approve.isPending
      ? SellerReviewAction.APPROVE
      : reject.isPending
        ? SellerReviewAction.REJECT
        : null

  // 409(상태가 바뀜 · 다른 관리자가 먼저 처리)는 서버 detail을 알리고, 훅이 상세를 다시 받아 화면을 맞춘다
  const handle = (error: unknown) => showToast({ message: adminErrorMessage(error) })

  return (
    <AdminSellerDetailView
      status={status}
      application={query.data ?? null}
      submitting={submitting}
      rejectError={rejectError}
      onRetry={() => void query.refetch()}
      onStartReview={() =>
        startReview
          .mutateAsync()
          .then(() => showToast({ message: '심사를 시작했어요' }))
          .catch(handle)
      }
      onApprove={() =>
        approve
          .mutateAsync()
          .then((detail) => showToast({ message: `${detail.storeName} 판매자를 승인했어요` }))
          .catch(handle)
      }
      onReject={async (reason) => {
        setRejectError(null)
        try {
          await reject.mutateAsync({ reason })
          showToast({ message: '신청을 반려했어요' })
        } catch (error) {
          if (isConflict(error)) {
            // 모달은 닫히고, 다시 받은 상세가 바뀐 상태를 보여 준다
            handle(error)
            return
          }
          // 422(사유) 등은 모달을 열어 둔 채 칸에 보여 준다
          setRejectError(adminErrorMessage(error))
          throw error
        }
      }}
    />
  )
}

/** /admin/payouts?page= 와 /admin/payouts/:payoutId 가 같이 쓴다. 상세는 목록 위 모달 */
export function AdminPayoutsPage() {
  const { payoutId } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<PayoutFilter>(defaultPayoutFilter)
  const page = pageOf(params)
  const search = params.toString()

  const list = useAdminPayouts(filter, page - 1)
  const pendingCandidates = usePendingCandidateCount()

  const run = useRunPayouts('run')
  const runSkipWait = useRunPayouts('skipWait')
  const [runResult, setRunResult] = useState<PayoutRunResult | null>(null)
  const single = useRunPayoutForOrderItem()
  const [singleResult, setSingleResult] = useState<SinglePayoutResult | null>(null)
  const adjust = useCreatePayoutAdjustment()
  const [adjustResult, setAdjustResult] = useState<AdjustmentResult | null>(null)

  const openId = idOf(payoutId)
  const detail = useAdminPayout(openId)
  const items = useAdminPayoutItems(openId)

  // 403·404는 같은 ‘찾을 수 없어요’로
  const detailStatus =
    openId === null || detail.error?.status === 403 || detail.error?.status === 404
      ? 'notFound'
      : detail.isError || items.isError
        ? 'error'
        : detail.isPending || items.isPending
          ? 'pending'
          : 'success'

  const runWith = (mutation: typeof run, skipWait: boolean) => () => {
    setRunResult(null)
    return mutation
      .mutateAsync()
      .then((result) => setRunResult({ kind: 'ok', ...result, skipWait }))
      .catch((error) => setRunResult({ kind: 'error', message: adminErrorMessage(error) }))
  }

  const adjustFieldErrors =
    adjust.error?.status === 422
      ? (adjust.error.fieldErrors as Partial<Record<keyof PayoutAdjustmentCreateRequest, string>>)
      : undefined

  return (
    <AdminPayoutsView
      run={{
        pendingCandidateCount: pendingCandidates.data,
        running: run.isPending || runSkipWait.isPending,
        result: runResult,
        onRun: runWith(run, false),
        onRunSkipWait: runWith(runSkipWait, true),
      }}
      single={{
        running: single.isPending,
        result: singleResult,
        onRun: (orderItemId) => {
          setSingleResult(null)
          return single
            .mutateAsync(orderItemId)
            .then(() => setSingleResult({ kind: 'success', orderItemId }))
            .catch((error) => setSingleResult({ kind: 'error', message: adminErrorMessage(error) }))
        },
      }}
      adjustment={{
        // TODO(api): ❌ 주문 상품별 정산 금액 조회 · 조정 내역 목록 API 없음 → 미리보기 없이, 내역은 빈 목록
        lookup: { status: 'idle' },
        onOrderItemChange: () => {},
        submitting: adjust.isPending,
        result: adjustResult,
        logs: [],
        errorMessage:
          adjust.error && adjust.error.status !== 422 ? adminErrorMessage(adjust.error) : null,
        serverErrors: adjustFieldErrors,
        onSubmit: async (input) => {
          setAdjustResult(null)
          await adjust.mutateAsync(input)
          setAdjustResult(input)
        },
      }}
      status={list.isError ? 'error' : list.isPending ? 'pending' : 'success'}
      errorMessage={list.error?.detail}
      payouts={list.data?.content ?? []}
      filter={filter}
      onFilterChange={(next) => {
        setFilter(next)
        if (params.has('page')) setParams({})
      }}
      totalElements={list.data?.totalElements ?? 0}
      page={page}
      totalPages={list.data?.totalPages ?? 1}
      onPageChange={(next) => setParams(next === 1 ? {} : { page: String(next) })}
      onRetry={() => void list.refetch()}
      detail={
        openId === null && payoutId === undefined
          ? null
          : {
              onClose: () => navigate({ pathname: '/admin/payouts', search }),
              status: detailStatus,
              payout: detail.data ?? null,
              items: items.data?.pages.flatMap((p) => p.content) ?? [],
              hasMoreItems: items.hasNextPage,
              loadingMoreItems: items.isFetchingNextPage,
              onLoadMoreItems: () => void items.fetchNextPage(),
              onRetry: () => {
                void detail.refetch()
                void items.refetch()
              },
              payeeName: detail.data ? payeeNameOf(detail.data) : undefined,
            }
      }
    />
  )
}
