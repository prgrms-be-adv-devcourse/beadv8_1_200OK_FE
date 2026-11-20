import { Button, Skeleton, Stack, Text } from '@mantine/core'
import { ChevronRight, CircleCheck, RefreshCw } from 'lucide-react'
import { Link } from 'react-router'
import { formatAmount, formatDate, formatPrice } from '@/shared/lib/format'
import { PageHeader, QueryState, StatusBadge } from '@/shared/ui'
import { type AdminCharge, chargeReviewStateOf, splitChargeTargets } from '../charges'
import classes from './AdminChargesViews.module.css'

// M-05 멈춘 충전 건 /admin/charges
// ✅ GET /api/v1/admin/wallets/charges → 두 종류가 섞여 온다. 요청 시각 순 최대 100건(페이지 없음).
// - 멈춘 처리 중 건: status IN_PROGRESS · heldForReview (결제 취소를 요청한 건 포함)
// - 승인 뒤 실패한 건: status FAILED · approvedAfterFailureAt 있음 · paymentCanceledAt 없음 → 결제 취소 대상

/** 서버가 한 번에 주는 최대 건수 */
export const CHARGE_TARGET_LIMIT = 100

export type AdminChargesViewProps = {
  status: 'pending' | 'error' | 'success'
  errorMessage?: string
  onRetry?: () => void
  charges: AdminCharge[]
  /** 다시 불러오는 중 (목록은 그대로 둔다) */
  refreshing?: boolean
  onRefresh?: () => void
}

export const chargeDetailPath = (chargeNo: string) =>
  `/admin/charges/${encodeURIComponent(chargeNo)}`

function ChargeRow({ charge }: { charge: AdminCharge }) {
  return (
    <li className={classes.row}>
      <div className={classes.rowMain}>
        <div className={classes.rowHead}>
          <StatusBadge status={chargeReviewStateOf(charge)} />
          <span className={`pd-num ${classes.amount}`}>{formatPrice(charge.amount)}</span>
          <span className={`pd-num ${classes.help}`}>회원 {charge.memberId}</span>
        </div>
        <Text size="sm" className={`pd-num ${classes.chargeNo}`}>
          {charge.chargeNo}
        </Text>
        <Text className={`pd-num ${classes.help}`}>
          요청 {formatDate(charge.createdAt, 'dateTime')}
          {charge.approvedAfterFailureAt &&
            ` · 승인 확인 ${formatDate(charge.approvedAfterFailureAt, 'dateTime')}`}
          {charge.paymentCancelRequestedAt &&
            ` · 취소 요청 ${formatDate(charge.paymentCancelRequestedAt, 'dateTime')}`}
        </Text>
      </div>
      <Button
        component={Link}
        to={chargeDetailPath(charge.chargeNo)}
        variant="outline"
        size="sm"
        className={classes.rowAction}
        rightSection={<ChevronRight size={16} aria-hidden="true" />}
        aria-label={`충전 건 ${charge.chargeNo} 처리하기`}
      >
        처리하기
      </Button>
    </li>
  )
}

function Section({
  id,
  title,
  desc,
  emptyText,
  charges,
}: {
  id: string
  title: string
  desc: string
  emptyText: string
  charges: AdminCharge[]
}) {
  return (
    <section className={classes.panel} aria-labelledby={id}>
      <div className={classes.panelHead}>
        <h2 id={id} className={classes.title}>
          {title} <span className="pd-num">{formatAmount(charges.length)}건</span>
        </h2>
        <Text className={classes.desc}>{desc}</Text>
      </div>
      {charges.length === 0 ? (
        <p className={classes.empty}>{emptyText}</p>
      ) : (
        <ul className={classes.list}>
          {charges.map((charge) => (
            <ChargeRow key={charge.chargeNo} charge={charge} />
          ))}
        </ul>
      )}
    </section>
  )
}

export function AdminChargesView({
  status,
  errorMessage,
  onRetry,
  charges,
  refreshing = false,
  onRefresh,
}: AdminChargesViewProps) {
  const { held, awaitingCancel } = splitChargeTargets(charges)

  return (
    <div className={classes.root}>
      <PageHeader title="충전 처리" hideOnMobile />
      <div className={classes.toolbar}>
        <Text className={classes.desc}>
          결제 결과를 몰라 서버가 끝내지 못한 충전 건이에요. 상세에서 토스 결제 상태를 보고 처리해
          주세요.
        </Text>
        {onRefresh && status === 'success' && (
          <Button
            variant="subtle"
            size="sm"
            loading={refreshing}
            leftSection={<RefreshCw size={16} aria-hidden="true" />}
            onClick={onRefresh}
          >
            다시 불러오기
          </Button>
        )}
      </div>

      <QueryState
        status={status === 'success' && charges.length === 0 ? 'empty' : status}
        skeleton={
          <Stack gap="sm">
            <Skeleton h={120} radius="md" />
            <Skeleton h={120} radius="md" />
          </Stack>
        }
        loadingLabel="처리할 충전 건을 불러오고 있어요"
        onRetry={onRetry}
        errorMessage={errorMessage}
        empty={{
          icon: <CircleCheck />,
          title: '처리할 충전 건이 없어요',
          description: '서버가 끝내지 못한 충전 건이 생기면 여기에 보여요.',
        }}
      >
        <Section
          id="held-charges-title"
          title="멈춘 처리 중 건"
          desc="서버가 1분마다 토스에 물었지만 답만으로 정하지 못해 멈춘 건이에요. 잔액 반영·실패 처리·결제 취소 중에서 골라요."
          emptyText="멈춘 처리 중 건이 없어요"
          charges={held}
        />
        <Section
          id="awaiting-cancel-charges-title"
          title="승인 뒤 실패한 건"
          desc="실패로 끝낸 뒤 토스가 승인해 회원 돈만 빠진 건이에요. 결제를 취소해 돌려줘야 해요."
          emptyText="결제를 취소할 건이 없어요"
          charges={awaitingCancel}
        />
        {charges.length >= CHARGE_TARGET_LIMIT && (
          <Text className={classes.help}>
            한 번에 {CHARGE_TARGET_LIMIT}건까지 보여요. 처리하면 다음 건이 이어서 보여요.
          </Text>
        )}
      </QueryState>
    </div>
  )
}
