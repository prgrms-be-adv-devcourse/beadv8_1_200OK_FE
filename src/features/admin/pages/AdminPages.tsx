import { type UseMutationResult, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import type { ApiError } from '@/shared/api/ApiError'
import { productDetailQueryOptions } from '@/shared/api/productDetail'
import type { PayoutAdjustmentCreateRequest } from '@/shared/api/types'
import { PayoutBlockStatus } from '@/shared/lib/payoutBlockState'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { showToast } from '@/shared/ui'
import {
  blockedOrderSearch,
  defaultResolutionRequestFilter,
  needsAdjustment,
  parseBlockedOrderFilter,
} from '../blockedOrderFilter'
import type { AdjustmentPanelProps } from '../components/AdjustmentPanel'
import {
  adjustmentErrorMessage,
  adminErrorMessage,
  isConflict,
  NOTHING_TO_RESOLVE_MESSAGE,
  payoutRunErrorMessage,
} from '../errors'
import { defaultPayoutFilter } from '../payoutFilter'
import {
  useAdminPayout,
  useAdminPayoutItems,
  useAdminPayouts,
  useAnalyzeReviewKeywords,
  useAnalyzeReviewSentiment,
  useBlockedOrders,
  useCreatePayoutAdjustment,
  useDepositCheckReviews,
  useOrderCandidates,
  usePendingCandidateCount,
  useProductChoices,
  useResolutionHistory,
  useResolutionRequestsInPeriod,
  useResolveBlockedOrder,
  useRunPayoutForOrderItem,
  useRunPayouts,
  useSellerApplication,
  useSellerApplicationCounts,
  useSellerApplicationMutations,
  useSellerApplications,
} from '../queries'
import {
  type AdjustmentLog,
  type AdjustmentResult,
  type AnalysisPanel,
  type BlockedOrder,
  type BlockedOrderFilter,
  type BlockedOrdersMode,
  type PayoutFilter,
  type PayoutRunResult,
  PayoutSection,
  type ResolutionRequestFilter,
  type ResolutionView,
  type ReviewAnalysisRequest,
  SellerReviewAction,
  type SinglePayoutResult,
} from '../types'
import { AdminPayoutsView, payeeNameOf } from '../views/AdminPayoutsView'
import { AdminSellerDetailView } from '../views/AdminSellerDetailView'
import { AdminSellersView } from '../views/AdminSellersView'
import { BlockedOrdersView } from '../views/BlockedOrdersView'
import { DepositChecksView } from '../views/DepositChecksView'
import {
  ReviewAnalysisTestView,
  type ReviewAnalysisTestViewProps,
} from '../views/ReviewAnalysisTestView'

// M-01 · M-02 · M-03 · M-04 라우트 (관리자 콘솔 청크). 모두 Bearer ADMIN.
// 판매자 심사 ✅ GET/POST /admin/seller-applications…, 정산 ✅ GET /admin/payouts…, POST …/run · run/skip-wait,
// 수동 조정 ✅ POST …/adjustments, 막힌 주문 ✅ GET …/blocked-orders(?orderId&status) · 주문 정산후보 GET …/candidates?orderId ·
// POST …/orders/{id}/resolution · 해결 기록(주문별 · 기간 전체), 대사 확인 ✅ GET …/deposit-checks.
// 1건 정산만 서버가 501이라 안내 문구가 보인다(errors.ts).

const S = SellerApplicationStatus

const isStatus = (value: string | null): value is SellerApplicationStatus =>
  Object.values(S).includes(value as SellerApplicationStatus)

const pageOf = (params: URLSearchParams) => Math.max(1, Number(params.get('page')) || 1)

const payoutSectionPaths: Record<PayoutSection, string> = {
  [PayoutSection.PAYOUTS]: '/admin/payouts',
  [PayoutSection.BLOCKED_ORDERS]: '/admin/payouts/blocked-orders',
  [PayoutSection.DEPOSIT_CHECKS]: '/admin/payouts/deposit-checks',
}

function usePayoutSectionNavigate() {
  const navigate = useNavigate()
  return (section: PayoutSection) => navigate(payoutSectionPaths[section])
}

/**
 * 정산 조정 패널 연결 (정산 탭 · 막힌 주문 한 건 처리가 같이 쓴다).
 * 201 응답을 결과로 보여 주고 ‘조정 내역’에 쌓는다. 조정 목록 API가 없어 내역은 이 화면을 연 동안만 남는다.
 */
function useAdjustmentPanel(): Omit<AdjustmentPanelProps, 'candidates' | 'preset'> {
  const adjust = useCreatePayoutAdjustment()
  const [result, setResult] = useState<AdjustmentResult | null>(null)
  const [logs, setLogs] = useState<AdjustmentLog[]>([])
  const error = adjust.error
  // 422 칸 오류는 칸에 붙이고, 칸이 없는 422(원래 정산후보 없음 등)·409 등은 패널 위에 보여 준다
  const fieldErrors =
    error?.status === 422 && Object.keys(error.fieldErrors).length > 0
      ? (error.fieldErrors as Partial<Record<keyof PayoutAdjustmentCreateRequest, string>>)
      : undefined
  return {
    submitting: adjust.isPending,
    result,
    logs,
    errorMessage: error && !fieldErrors ? adjustmentErrorMessage(error) : null,
    serverErrors: fieldErrors,
    onSubmit: async (input) => {
      setResult(null)
      const saved = await adjust.mutateAsync(input)
      setResult(saved)
      setLogs((prev) => [saved, ...prev])
    },
  }
}

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
  const onSectionChange = usePayoutSectionNavigate()
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
  const adjustment = useAdjustmentPanel()

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

  const runWith = (mutation: typeof run, kind: 'run' | 'skipWait') => () => {
    setRunResult(null)
    return mutation
      .mutateAsync()
      .then((result) => setRunResult({ kind: 'ok', ...result, skipWait: kind === 'skipWait' }))
      .catch((error) =>
        setRunResult({ kind: 'error', message: payoutRunErrorMessage(error, kind) }),
      )
  }

  return (
    <AdminPayoutsView
      onSectionChange={onSectionChange}
      run={{
        pendingCandidateCount: pendingCandidates.data,
        running: run.isPending || runSkipWait.isPending,
        result: runResult,
        onRun: runWith(run, 'run'),
        onRunSkipWait: runWith(runSkipWait, 'skipWait'),
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
      adjustment={adjustment}
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

/** 금액·수수료 불일치인데 대기 조정이 0원이면 해결 전에 한 번 더 알린다 */
function resolveWarningOf(order: BlockedOrder | undefined): string | null {
  if (!order || order.status === PayoutBlockStatus.RESOLVED || !needsAdjustment(order)) return null
  if (order.pendingSaleAmountAdjustment !== 0 || order.pendingSaleFeeAdjustment !== 0) return null
  return '금액·수수료 불일치인데 대기 조정 합계가 0원이에요. 조정 없이 해결하면 다음 금액 검사에서 다시 막힐 수 있어요. 원인을 확인했다면 그대로 해결해도 돼요.'
}

/**
 * /admin/payouts/blocked-orders?status=&orderId=&page=, 해결 기록 전체 목록은 ?view=resolutions.
 * 주문 번호로 찾으면 그 주문의 정산후보 · 조정을 같이 보여 준다. 해결 · 주문별 해결 기록은 목록 위 모달
 */
export function AdminBlockedOrdersPage() {
  const [params, setParams] = useSearchParams()
  const onSectionChange = usePayoutSectionNavigate()
  const mode: BlockedOrdersMode = params.get('view') === 'resolutions' ? 'resolutions' : 'orders'
  const page = pageOf(params)
  const filter = parseBlockedOrderFilter(params)
  const list = useBlockedOrders(filter, page - 1, mode === 'orders')
  const orders = list.data?.content ?? []

  const candidates = useOrderCandidates(mode === 'orders' ? filter.orderId : null)
  const adjustment = useAdjustmentPanel()

  const [resolutionFilter, setResolutionFilter] = useState<ResolutionRequestFilter>(
    defaultResolutionRequestFilter,
  )
  const resolutions = useResolutionRequestsInPeriod(
    resolutionFilter,
    page - 1,
    mode === 'resolutions',
  )

  const [resolveId, setResolveId] = useState<number | null>(null)
  const resolve = useResolveBlockedOrder()
  const [historyId, setHistoryId] = useState<number | null>(null)
  const [historyView, setHistoryView] = useState<ResolutionView>('requests')
  const { query: history, history: historyRows } = useResolutionHistory(historyId, historyView)

  const setFilter = (next: BlockedOrderFilter) => setParams(blockedOrderSearch(next))
  const setMode = (next: BlockedOrdersMode) =>
    setParams(next === 'resolutions' ? { view: 'resolutions' } : {})
  const setPage = (next: number) => {
    if (mode === 'resolutions') {
      setParams(next === 1 ? { view: 'resolutions' } : { view: 'resolutions', page: String(next) })
      return
    }
    setParams(blockedOrderSearch(filter, next))
  }

  const resolveError = resolve.error
  const closeResolve = () => {
    setResolveId(null)
    resolve.reset()
  }

  return (
    <BlockedOrdersView
      onSectionChange={onSectionChange}
      mode={mode}
      onModeChange={setMode}
      filter={filter}
      onFilterChange={setFilter}
      status={list.isError ? 'error' : list.isPending ? 'pending' : 'success'}
      errorMessage={list.error ? adminErrorMessage(list.error) : undefined}
      onRetry={() => void list.refetch()}
      orders={orders}
      totalElements={list.data?.totalElements ?? 0}
      page={page}
      totalPages={list.data?.totalPages ?? 1}
      onPageChange={setPage}
      onResolve={(order) => {
        resolve.reset()
        setResolveId(order.orderId)
      }}
      onShowHistory={(orderId) => {
        // 해결 기록 전체 목록에서 열면 막혔던 이유가 보이는 실패 기록별로 연다
        setHistoryView(mode === 'resolutions' ? 'lines' : 'requests')
        setHistoryId(orderId)
      }}
      focus={
        filter.orderId === null
          ? null
          : {
              candidates: {
                status: candidates.isError ? 'error' : candidates.isPending ? 'pending' : 'success',
                candidates: candidates.data?.pages.flatMap((p) => p.content) ?? [],
                errorMessage: candidates.error ? adminErrorMessage(candidates.error) : undefined,
                onRetry: () => void candidates.refetch(),
                hasMore: candidates.hasNextPage,
                loadingMore: candidates.isFetchingNextPage,
                onLoadMore: () => void candidates.fetchNextPage(),
              },
              adjustment,
            }
      }
      resolutions={{
        filter: resolutionFilter,
        onFilterChange: (next) => {
          setResolutionFilter(next)
          if (params.has('page')) setParams({ view: 'resolutions' })
        },
        status: resolutions.isError ? 'error' : resolutions.isPending ? 'pending' : 'success',
        errorMessage: resolutions.error ? adminErrorMessage(resolutions.error) : undefined,
        onRetry: () => void resolutions.refetch(),
        rows: resolutions.data?.content ?? [],
        totalElements: resolutions.data?.totalElements ?? 0,
        page,
        totalPages: resolutions.data?.totalPages ?? 1,
        onPageChange: setPage,
      }}
      resolve={{
        orderId: resolveId,
        onClose: closeResolve,
        submitting: resolve.isPending,
        warning: resolveWarningOf(orders.find((o) => o.orderId === resolveId)),
        serverError: resolveError?.status === 422 ? (resolveError.fieldErrors.memo ?? null) : null,
        errorMessage: !resolveError
          ? null
          : resolveError.status === 409
            ? NOTHING_TO_RESOLVE_MESSAGE
            : resolveError.status === 422 && resolveError.fieldErrors.memo
              ? null
              : adminErrorMessage(resolveError),
        onConfirm: (memo) => {
          if (resolveId === null) return
          resolve.mutate(
            { orderId: resolveId, memo },
            {
              onSuccess: (result) => {
                setResolveId(null)
                showToast({
                  message: `주문 ${result.orderId}의 실패 기록 ${result.resolvedFailureCount}건을 해결했어요. 다음 정산 실행에서 다시 검사해요`,
                })
              },
            },
          )
        },
      }}
      history={{
        orderId: historyId,
        history: historyRows,
        onViewChange: setHistoryView,
        status: history.isError ? 'error' : history.isPending ? 'pending' : 'success',
        errorMessage: history.error ? adminErrorMessage(history.error) : undefined,
        onRetry: () => void history.refetch(),
        hasMore: history.hasNextPage,
        loadingMore: history.isFetchingNextPage,
        onLoadMore: () => void history.fetchNextPage(),
        onClose: () => setHistoryId(null),
      }}
    />
  )
}

/** /admin/payouts/deposit-checks?page=. 조회 전용 */
export function AdminDepositChecksPage() {
  const [params, setParams] = useSearchParams()
  const onSectionChange = usePayoutSectionNavigate()
  const page = pageOf(params)
  const list = useDepositCheckReviews(page - 1)

  return (
    <DepositChecksView
      onSectionChange={onSectionChange}
      status={list.isError ? 'error' : list.isPending ? 'pending' : 'success'}
      errorMessage={list.error ? adminErrorMessage(list.error) : undefined}
      onRetry={() => void list.refetch()}
      checks={list.data?.content ?? []}
      totalElements={list.data?.totalElements ?? 0}
      page={page}
      totalPages={list.data?.totalPages ?? 1}
      onPageChange={(next) => setParams(next === 1 ? {} : { page: String(next) })}
    />
  )
}

function panelOf<T>(
  mutation: UseMutationResult<T, ApiError, ReviewAnalysisRequest>,
): AnalysisPanel<T> {
  if (mutation.isPending) return { status: 'pending' }
  if (mutation.isError) return { status: 'error', message: adminErrorMessage(mutation.error) }
  if (mutation.isSuccess) return { status: 'success', data: mutation.data }
  return { status: 'idle' }
}

/** M-04. 키워드 · 감성 분석을 한 번에 같이 부르고, 한쪽이 실패해도 다른 쪽 결과는 그대로 보인다 */
export function AdminReviewAnalysisTestPage() {
  const products = useProductChoices()
  const [selection, setSelection] = useState<{ productId: number | null; optionId: number | null }>(
    { productId: null, optionId: null },
  )
  const [content, setContent] = useState('')
  const { productId } = selection
  const detail = useQuery({
    ...productDetailQueryOptions(productId ?? -1),
    enabled: productId !== null,
  })
  const keywords = useAnalyzeReviewKeywords()
  const sentiment = useAnalyzeReviewSentiment()

  const loadedOptions = detail.data?.options ?? []
  const optionId = loadedOptions.some((o) => o.optionId === selection.optionId)
    ? selection.optionId
    : (loadedOptions[0]?.optionId ?? null)

  const productsProp: ReviewAnalysisTestViewProps['products'] = products.isError
    ? {
        status: 'error',
        message: adminErrorMessage(products.error),
        onRetry: () => void products.refetch(),
      }
    : products.isPending
      ? { status: 'pending' }
      : {
          status: 'success',
          items: products.data.content,
          truncated: products.data.totalElements > products.data.content.length,
        }

  const optionsProp: ReviewAnalysisTestViewProps['options'] =
    productId === null
      ? { status: 'idle' }
      : detail.isError
        ? { status: 'error', message: adminErrorMessage(detail.error) }
        : detail.isPending
          ? { status: 'pending' }
          : { status: 'success', items: detail.data.options }

  return (
    <ReviewAnalysisTestView
      products={productsProp}
      productId={productId}
      onProductChange={(next) => setSelection({ productId: next, optionId: null })}
      options={optionsProp}
      optionId={optionId}
      onOptionChange={(next) => setSelection({ productId, optionId: next })}
      content={content}
      onContentChange={setContent}
      onAnalyze={() => {
        if (productId === null || optionId === null) return
        const body = { productId, optionId, content }
        keywords.mutate(body)
        sentiment.mutate(body)
      }}
      keywords={panelOf(keywords)}
      sentiment={panelOf(sentiment)}
    />
  )
}
