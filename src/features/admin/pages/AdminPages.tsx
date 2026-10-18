import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { formatAmount } from '@/shared/lib/format'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { showToast } from '@/shared/ui'
import {
  adjustmentLogs,
  adjustTargetOf,
  adminPayoutItems,
  adminPayouts,
  defaultPayoutFilter,
  filterPayouts,
  findApplication,
  findPayoutDetail,
  isPaidOrderItem,
  lastRun,
  payeeNameOfPayout,
  payees,
  pendingCandidateIds,
  runResults,
  sellerApplications,
  singlePayoutErrors,
  withBalances,
} from '../fixtures'
import {
  type AdjustmentLog,
  type AdjustmentResult,
  type AdminSellerApplication,
  type PayoutRunResult,
  SellerReviewAction,
  type SinglePayoutResult,
} from '../types'
import { AdminPayoutsView } from '../views/AdminPayoutsView'
import { AdminSellerDetailView } from '../views/AdminSellerDetailView'
import { AdminSellersView } from '../views/AdminSellersView'

// M-01 · M-02 · M-03 라우트 (관리자 콘솔 청크). 1단계: fixtures를 화면 안에서만 바꾼다.
// TODO(api): 판매자 심사는 ❌ 목록·상세, 📝 승인·반려·회수. 정산 목록·상세·항목은 ✅(2-6, 임시 헤더 ADMIN),
//   실행·1건·조정은 📝

const S = SellerApplicationStatus
const PAGE_SIZE = 10
const adminShortName = '정민호'
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isStatus = (value: string | null): value is SellerApplicationStatus =>
  Object.values(S).includes(value as SellerApplicationStatus)

export function AdminSellersPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('status')
  const tab = isStatus(raw) ? raw : S.APPLIED
  const counts = Object.fromEntries(
    Object.values(S).map((s) => [s, sellerApplications.filter((a) => a.status === s).length]),
  ) as Record<SellerApplicationStatus, number>

  return (
    <AdminSellersView
      status="success"
      tab={tab}
      onTabChange={(next) => setParams({ status: next })}
      counts={counts}
      applications={sellerApplications.filter((a) => a.status === tab)}
    />
  )
}

export function AdminSellerDetailPage() {
  const { sellerId } = useParams()
  const [application, setApplication] = useState(() => findApplication(Number(sellerId)))
  const [submitting, setSubmitting] = useState<SellerReviewAction | null>(null)

  const act = async (
    action: SellerReviewAction,
    patch: Partial<AdminSellerApplication>,
    message: string,
    reason: string | null = null,
  ) => {
    setSubmitting(action)
    await wait(600)
    setApplication((app) =>
      app
        ? {
            ...app,
            ...patch,
            history: [
              ...app.history,
              { action, at: new Date().toISOString(), adminName: adminShortName, reason },
            ],
          }
        : app,
    )
    setSubmitting(null)
    showToast({ message })
  }

  return (
    <AdminSellerDetailView
      status={application ? 'success' : 'notFound'}
      application={application}
      submitting={submitting}
      onStartReview={() =>
        act(
          SellerReviewAction.START_REVIEW,
          { status: S.UNDER_REVIEW, reviewerName: adminShortName },
          '심사를 시작했어요',
        )
      }
      onApprove={() =>
        act(
          SellerReviewAction.APPROVE,
          { status: S.APPROVED },
          `${application?.storeName} 판매자를 승인했어요`,
        )
      }
      onReject={(reason) =>
        act(SellerReviewAction.REJECT, { status: S.REJECTED, reason }, '신청을 반려했어요', reason)
      }
      onSuspend={(reason) => {
        const count = application?.activeOrderCount ?? 0
        return act(
          SellerReviewAction.SUSPEND,
          { status: S.SUSPENDED, reason, activeOrderCount: 0 },
          count > 0
            ? `판매 권한을 회수했어요. 진행 중인 주문 ${formatAmount(count)}건을 취소했어요`
            : '판매 권한을 회수했어요',
          reason,
        )
      }}
    />
  )
}

/** /admin/payouts 와 /admin/payouts/:payoutId 가 같이 쓴다. 상세는 목록 위 모달 */
export function AdminPayoutsPage() {
  const { payoutId } = useParams()
  const navigate = useNavigate()
  const [filter, setFilter] = useState(defaultPayoutFilter)
  const [page, setPage] = useState(1)

  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<PayoutRunResult | null>(null)
  const [singleRunning, setSingleRunning] = useState(false)
  const [singleResult, setSingleResult] = useState<SinglePayoutResult | null>(null)
  const paidNow = useRef(new Set<number>())

  const [logs, setLogs] = useState<AdjustmentLog[]>(adjustmentLogs)
  const [adjustId, setAdjustId] = useState<number | null>(null)
  const [adjusting, setAdjusting] = useState(false)
  const [adjustResult, setAdjustResult] = useState<AdjustmentResult | null>(null)

  const filtered = useMemo(() => filterPayouts(adminPayouts, filter), [filter])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openId = payoutId === undefined ? null : Number(payoutId)
  const detail = openId === null ? null : findPayoutDetail(openId)
  const target = adjustId === null ? null : adjustTargetOf(adjustId, logs)

  return (
    <AdminPayoutsView
      run={{
        lastRun,
        running,
        result: runResult,
        onRun: async () => {
          setRunning(true)
          await wait(1200)
          setRunning(false)
          setRunResult(runResults.ok)
        },
      }}
      single={{
        running: singleRunning,
        result: singleResult,
        onRun: async (orderItemId) => {
          setSingleRunning(true)
          await wait(600)
          setSingleRunning(false)
          if (isPaidOrderItem(orderItemId) || paidNow.current.has(orderItemId)) {
            setSingleResult({ kind: 'error', message: singlePayoutErrors.alreadyPaid })
          } else if (pendingCandidateIds.includes(orderItemId)) {
            paidNow.current.add(orderItemId)
            setSingleResult({ kind: 'success', orderItemId })
          } else {
            setSingleResult({ kind: 'error', message: singlePayoutErrors.unconfirmed })
          }
        },
      }}
      adjustment={{
        lookup:
          adjustId === null
            ? { status: 'idle' }
            : target
              ? { status: 'found', target }
              : { status: 'notFound' },
        onOrderItemChange: (id) => {
          setAdjustId(id)
          if (id !== null) setAdjustResult(null)
        },
        submitting: adjusting,
        result: adjustResult,
        logs,
        onSubmit: async (input) => {
          if (!target) return
          setAdjusting(true)
          await wait(900)
          const next = withBalances([
            {
              adjustmentId: Date.now(),
              ...input,
              adminName: adminShortName,
              createdAt: new Date().toISOString(),
            },
            ...logs,
          ])
          setLogs(next)
          setAdjusting(false)
          setAdjustResult({
            orderItemId: input.orderItemId,
            amount: input.amount,
            before: target.currentAmount,
            after: target.currentAmount + input.amount,
          })
        },
      }}
      status="success"
      payouts={pageItems}
      payees={payees}
      filter={filter}
      onFilterChange={(next) => {
        setFilter(next)
        setPage(1)
      }}
      totalElements={filtered.length}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      detail={
        openId === null
          ? null
          : {
              onClose: () => navigate('/admin/payouts'),
              status: detail ? 'success' : 'notFound',
              payout: detail,
              items: adminPayoutItems[openId] ?? [],
              payeeName: detail ? payeeNameOfPayout(detail) : undefined,
            }
      }
    />
  )
}
