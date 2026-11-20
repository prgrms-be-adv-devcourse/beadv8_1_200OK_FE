import { Alert, Button, Skeleton, Stack, Text } from '@mantine/core'
import {
  ChevronLeft,
  CircleCheck,
  CircleX,
  Info,
  NotebookPen,
  RefreshCw,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Link } from 'react-router'
import { ChargeReviewState } from '@/shared/lib/chargeReviewState'
import { formatDate, formatPrice } from '@/shared/lib/format'
import { chargeStatusLabels } from '@/shared/lib/labels'
import { DisabledReason, PageHeader, QueryState, StatusBadge } from '@/shared/ui'
import {
  type AdminChargeDetail,
  ChargeAction,
  chargeActionLabels,
  chargeActionsOf,
  chargeReviewStateOf,
  failureCodeLabel,
  isAlreadyCanceledOnToss,
  isHandleable,
  TOSS_UNKNOWN_REASON,
  TossLookup,
  tossLookupLabels,
  tossPaymentStatusLabels,
} from '../charges'
import { ChargeReasonModal, type ReasonAction } from '../components/ChargeReasonModal'
import classes from './AdminChargesViews.module.css'

// M-05 멈춘 충전 건 상세 /admin/charges/:chargeNo
// ✅ GET /api/v1/admin/wallets/charges/{chargeNo} → 충전 건 + 토스 결제 상태(부를 때마다 토스에 묻는다)
// ✅ POST …/complete · fail { reason } · cancel-payment { reason }
// 버튼 조건은 charges.ts chargeActionsOf. 토스 답이 UNKNOWN이면 버튼 대신 ‘다시 조회’만 보인다.

type MaybeAsync = unknown

export type AdminChargeDetailViewProps = {
  status: 'pending' | 'error' | 'notFound' | 'success'
  errorMessage?: string
  onRetry?: () => void
  detail: AdminChargeDetail | null
  /** 토스에 다시 묻는 중 */
  refreshing?: boolean
  onRefresh: () => void
  onComplete: () => MaybeAsync
  /** 실패하면 reject(throw)해야 모달이 열려 있는다 */
  onFail: (reason: string) => MaybeAsync
  onCancelPayment: (reason: string) => MaybeAsync
  submitting?: ChargeAction | null
  /** 처리 실패 문구 (409 · 503 등). 처리 카드 위에 보인다 */
  actionError?: string | null
  /** 모달 안의 사유 오류(422) · 그 밖의 오류 */
  reasonError?: string | null
  modalError?: string | null
  /** 미리보기: 처음부터 연 모달 */
  defaultModal?: ReasonAction | null
  defaultModalStep?: 'reason' | 'confirm'
  defaultReason?: string
}

type Row = { label: string; value: ReactNode; num?: boolean }

function Ledger({
  id,
  title,
  rows,
  action,
}: {
  id: string
  title: string
  rows: Row[]
  action?: ReactNode
}) {
  return (
    <section className={classes.ledger} aria-labelledby={id}>
      <div className={classes.ledgerHead}>
        <h2 id={id} className={classes.ledgerTitle}>
          <NotebookPen size={16} aria-hidden="true" />
          {title}
        </h2>
        {action}
      </div>
      <dl className={classes.ledgerList}>
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd className={row.num ? 'pd-num' : undefined}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

const dateTimeOrNone = (value: string | null) => (value ? formatDate(value, 'dateTime') : '없음')

function chargeRows({ charge }: AdminChargeDetail): Row[] {
  const rows: Row[] = [
    {
      label: '충전 번호',
      value: <span className={classes.chargeNo}>{charge.chargeNo}</span>,
      num: true,
    },
    { label: '회원 번호', value: String(charge.memberId), num: true },
    { label: '충전 금액', value: formatPrice(charge.amount), num: true },
    {
      label: '서버 상태',
      value: `${chargeStatusLabels[charge.status]}${charge.heldForReview ? ' · 자동 확인 멈춤' : ''}`,
    },
    { label: '요청 시각', value: formatDate(charge.createdAt, 'dateTime'), num: true },
  ]
  if (charge.failureCode !== null || charge.failureMessage !== null) {
    rows.push({
      label: '실패 사유',
      value: [charge.failureCode && failureCodeLabel(charge.failureCode), charge.failureMessage]
        .filter(Boolean)
        .join(' · '),
    })
  }
  if (charge.approvedAfterFailureAt !== null) {
    rows.push({
      label: '실패 뒤 승인 확인',
      value: formatDate(charge.approvedAfterFailureAt, 'dateTime'),
      num: true,
    })
  }
  rows.push(
    { label: '결제 취소 요청', value: dateTimeOrNone(charge.paymentCancelRequestedAt), num: true },
    { label: '결제 취소', value: dateTimeOrNone(charge.paymentCanceledAt), num: true },
  )
  return rows
}

function tossRows(detail: AdminChargeDetail): Row[] {
  const { tossLookup, tossStatus, tossTotalAmount, charge } = detail
  const mismatch = tossTotalAmount !== null && tossTotalAmount !== charge.amount
  return [
    { label: '조회 결과', value: tossLookupLabels[tossLookup] },
    {
      label: '결제 상태',
      value: tossStatus ? `${tossPaymentStatusLabels[tossStatus]} (${tossStatus})` : '–',
    },
    {
      label: '결제 금액',
      value:
        tossTotalAmount === null
          ? '–'
          : `${formatPrice(tossTotalAmount)}${mismatch ? ' · 충전 금액과 달라요' : ''}`,
      num: true,
    },
  ]
}

/** 처리할 수 없는 건(처리를 마쳤거나 자동 확인 중)의 결과 안내 */
function ResultNotice({ detail }: { detail: AdminChargeDetail }) {
  const { charge } = detail
  switch (chargeReviewStateOf(charge)) {
    case ChargeReviewState.COMPLETED:
      return (
        <Alert color="success" icon={<CircleCheck />} title="잔액에 반영됐어요">
          처리할 게 없어 목록에서 빠졌어요.
        </Alert>
      )
    case ChargeReviewState.PAYMENT_CANCELED:
      return (
        <Alert color="neutral" icon={<RotateCcw />} title="결제를 취소했어요">
          <span className="pd-num">
            {charge.paymentCanceledAt && `${formatDate(charge.paymentCanceledAt, 'dateTime')} · `}
            토스 결제를 전액 취소해 회원에게 돌려줬어요.
          </span>
        </Alert>
      )
    case ChargeReviewState.FAILED:
      return (
        <Alert color="neutral" icon={<CircleX />} title="실패로 끝난 충전 건이에요">
          잔액은 늘지 않았어요. 처리할 게 없어 목록에서 빠졌어요.
        </Alert>
      )
    case ChargeReviewState.CHECKING:
      return (
        <Alert color="info" icon={<Info />} title="서버가 자동으로 확인하고 있어요">
          1분마다 토스에 물어 끝내요. 토스 답만으로 정하지 못하면 멈추고 여기서 처리할 수 있어요.
        </Alert>
      )
    default:
      return (
        <Alert color="neutral" icon={<Info />} title="처리할 게 없는 충전 건이에요">
          결제창을 열기 전 충전 건이에요.
        </Alert>
      )
  }
}

function ActionCard({
  detail,
  submitting,
  actionError,
  refreshing,
  onRefresh,
  onComplete,
  onOpen,
}: {
  detail: AdminChargeDetail
  submitting: ChargeAction | null
  actionError: string | null
  refreshing: boolean
  onRefresh: () => void
  onComplete: () => MaybeAsync
  onOpen: (action: ReasonAction) => void
}) {
  const state = chargeReviewStateOf(detail.charge)
  const actions = chargeActionsOf(detail)
  const busy = submitting !== null
  const alreadyCanceled = isAlreadyCanceledOnToss(detail)

  let body: ReactNode
  if (!isHandleable(detail.charge)) {
    body = <ResultNotice detail={detail} />
  } else if (detail.tossLookup === TossLookup.UNKNOWN) {
    body = (
      <>
        <Alert color="warning" icon={<TriangleAlert />} title="토스 결제 상태를 모르고 있어요">
          {TOSS_UNKNOWN_REASON}. 답을 받기 전에는 처리할 수 없어요.
        </Alert>
        <Button
          loading={refreshing}
          leftSection={<RefreshCw size={16} aria-hidden="true" />}
          onClick={onRefresh}
        >
          다시 조회
        </Button>
      </>
    )
  } else {
    body = (
      <>
        <Text className={classes.desc}>
          {state === ChargeReviewState.AWAITING_CANCEL
            ? '실패로 끝낸 뒤 토스가 승인해 회원 돈만 빠졌어요. 결제를 취소해 돌려주세요.'
            : '토스 결제 상태를 보고 처리를 골라 주세요. 서버도 처리 직전에 토스에 다시 물어 막아요.'}
        </Text>
        {state === ChargeReviewState.CANCEL_UNCONFIRMED && (
          <Alert color="warning" icon={<TriangleAlert />} title="결제 취소 결과를 모르고 있어요">
            결제 취소를 다시 해 주세요. 다시 눌러도 두 번 취소되지 않아요.
          </Alert>
        )}
        <div className={classes.actions}>
          <DisabledReason reason={actions[ChargeAction.COMPLETE]} fullWidth>
            <Button
              fullWidth
              loading={submitting === ChargeAction.COMPLETE}
              disabled={
                actions[ChargeAction.COMPLETE] !== null ||
                (busy && submitting !== ChargeAction.COMPLETE)
              }
              onClick={() => onComplete()}
            >
              {chargeActionLabels[ChargeAction.COMPLETE]}
            </Button>
          </DisabledReason>
          <DisabledReason reason={actions[ChargeAction.FAIL]} fullWidth>
            <Button
              fullWidth
              variant="outline"
              disabled={actions[ChargeAction.FAIL] !== null || busy}
              onClick={() => onOpen(ChargeAction.FAIL)}
            >
              {chargeActionLabels[ChargeAction.FAIL]}
            </Button>
          </DisabledReason>
          <DisabledReason reason={actions[ChargeAction.CANCEL_PAYMENT]} fullWidth>
            <Button
              fullWidth
              variant="outline"
              color="red"
              disabled={actions[ChargeAction.CANCEL_PAYMENT] !== null || busy}
              onClick={() => onOpen(ChargeAction.CANCEL_PAYMENT)}
            >
              {alreadyCanceled ? '결제 취소 기록' : chargeActionLabels[ChargeAction.CANCEL_PAYMENT]}
            </Button>
          </DisabledReason>
          {alreadyCanceled && actions[ChargeAction.CANCEL_PAYMENT] === null && (
            <Text className={classes.help}>
              토스에서 이미 취소된 결제예요. 다시 취소하지 않고 기록만 해요.
            </Text>
          )}
        </div>
      </>
    )
  }

  return (
    <section className={classes.card} aria-labelledby="charge-action-title">
      <h2 id="charge-action-title" className={classes.cardTitle}>
        처리
      </h2>
      {actionError && (
        <Alert color="error" icon={<CircleX />} title="처리하지 못했어요" role="alert">
          {actionError}
        </Alert>
      )}
      {body}
    </section>
  )
}

export function AdminChargeDetailView({
  status,
  errorMessage,
  onRetry,
  detail,
  refreshing = false,
  onRefresh,
  onComplete,
  onFail,
  onCancelPayment,
  submitting = null,
  actionError = null,
  reasonError = null,
  modalError = null,
  defaultModal = null,
  defaultModalStep,
  defaultReason,
}: AdminChargeDetailViewProps) {
  const [modal, setModal] = useState<ReasonAction | null>(defaultModal)
  const confirm = async (reason: string) => {
    if (modal === null) return
    try {
      await (modal === ChargeAction.FAIL ? onFail(reason) : onCancelPayment(reason))
      setModal(null)
    } catch {
      // 422 · 503 등은 모달을 열어 둔 채 reasonError · modalError로 보여 준다
    }
  }

  return (
    <div className={classes.root}>
      <Button
        component={Link}
        to="/admin/charges"
        variant="subtle"
        size="sm"
        leftSection={<ChevronLeft size={16} aria-hidden="true" />}
        className={classes.back}
      >
        충전 처리 목록
      </Button>

      <QueryState
        status={status === 'success' && !detail ? 'notFound' : status}
        skeleton={
          <Stack gap="md">
            <Skeleton h={38} w="40%" />
            <Skeleton h={260} radius="md" />
            <Skeleton h={160} radius="md" />
          </Stack>
        }
        loadingLabel="충전 건과 토스 결제 상태를 불러오고 있어요"
        onRetry={onRetry}
        errorMessage={errorMessage}
        notFound={{
          title: '충전 건을 찾을 수 없어요',
          description: '충전 번호를 확인하거나 충전 처리 목록에서 다시 골라 주세요.',
          action: { label: '충전 처리 목록 보기', to: '/admin/charges' },
        }}
      >
        {detail && (
          <>
            <PageHeader title="충전 건 처리" hideOnMobile />
            <div className={classes.summary}>
              <StatusBadge status={chargeReviewStateOf(detail.charge)} />
              <span className={`pd-num ${classes.help}`}>
                {formatPrice(detail.charge.amount)} · 회원 {detail.charge.memberId} · 요청{' '}
                {formatDate(detail.charge.createdAt, 'dateTime')}
              </span>
            </div>

            <div className={classes.columns}>
              <div className={classes.main}>
                <Ledger id="charge-info" title="충전 건" rows={chargeRows(detail)} />
                <Ledger
                  id="toss-info"
                  title="토스 결제"
                  rows={tossRows(detail)}
                  action={
                    <Button
                      variant="subtle"
                      size="sm"
                      loading={refreshing}
                      leftSection={<RefreshCw size={16} aria-hidden="true" />}
                      onClick={onRefresh}
                      aria-label="토스 결제 상태 다시 조회"
                    >
                      다시 조회
                    </Button>
                  }
                />
              </div>
              <div className={classes.side}>
                <ActionCard
                  detail={detail}
                  submitting={submitting}
                  actionError={actionError}
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  onComplete={onComplete}
                  onOpen={setModal}
                />
              </div>
            </div>

            <ChargeReasonModal
              action={modal}
              charge={detail.charge}
              alreadyCanceled={isAlreadyCanceledOnToss(detail)}
              onClose={() => setModal(null)}
              onConfirm={confirm}
              submitting={
                submitting === ChargeAction.FAIL || submitting === ChargeAction.CANCEL_PAYMENT
              }
              serverError={reasonError}
              errorMessage={modalError}
              defaultReason={defaultReason}
              defaultStep={defaultModalStep}
            />
          </>
        )}
      </QueryState>
    </div>
  )
}
