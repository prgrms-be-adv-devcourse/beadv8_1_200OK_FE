import { Alert, Button, Group, Modal, Skeleton, Stack, Tabs, Text, Textarea } from '@mantine/core'
import { Info, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { REFUND_REASON_MAX_LENGTH, type Refund, RefundStatus } from '@/shared/api/refund'
import { formatAmount, formatDate } from '@/shared/lib/format'
import { PageHeader, QueryState, RefundAmounts, RefundStatusBadge } from '@/shared/ui'
import classes from './SellerClaimsView.module.css'

// S-07 취소 요청 처리 /seller/claims?status=. 시안: seller/SellerCancels, SellerCancelsMobile
// ✅ GET /seller/refunds(상태로 거르기, 25건씩), PATCH /seller/refunds/{id}(승인 · 거절, 거절 사유 필수).
// 승인 전에는 배송비가 정해지지 않아 상품 금액만 확정이다. 승인 결과(처리 중·완료·자동 거절)는 서버 응답으로 안다.

export type RefundFilter = RefundStatus | 'ALL'

export const refundFilters: RefundFilter[] = [
  RefundStatus.REQUESTED,
  RefundStatus.PROCESSING,
  RefundStatus.COMPLETED,
  RefundStatus.REJECTED,
  RefundStatus.WITHDRAWN,
  RefundStatus.FAILED,
  'ALL',
]

const filterLabels: Record<RefundFilter, string> = {
  [RefundStatus.REQUESTED]: '승인 대기',
  [RefundStatus.PROCESSING]: '처리 중',
  [RefundStatus.COMPLETED]: '환불 완료',
  [RefundStatus.REJECTED]: '거절',
  [RefundStatus.WITHDRAWN]: '철회',
  [RefundStatus.FAILED]: '취소 실패',
  ALL: '전체',
}

const emptyTitles: Record<RefundFilter, string> = {
  [RefundStatus.REQUESTED]: '처리할 취소 요청이 없어요',
  [RefundStatus.PROCESSING]: '환불 처리 중인 요청이 없어요',
  [RefundStatus.COMPLETED]: '환불을 마친 요청이 없어요',
  [RefundStatus.REJECTED]: '거절한 요청이 없어요',
  [RefundStatus.WITHDRAWN]: '구매자가 철회한 요청이 없어요',
  [RefundStatus.FAILED]: '처리에 실패한 요청이 없어요',
  ALL: '받은 취소 요청이 없어요',
}

type OpenModal = { type: 'approve' | 'reject'; refundId: number }

/** 처리 결과. 오류 문구를 돌려주면 창을 열어 두고 그 문구를 보여 준다 */
type Outcome = Promise<string | null>

export type SellerClaimsViewProps = {
  status: 'pending' | 'error' | 'success'
  refunds: Refund[]
  filter: RefundFilter
  onFilterChange: (filter: RefundFilter) => void
  /** 승인 대기 수 (탭 숫자) */
  pendingCount?: number
  hasMore?: boolean
  onLoadMore?: () => void
  loadingMore?: boolean
  onApprove: (refundId: number) => Outcome
  onReject: (refundId: number, reason: string) => Outcome
  submitting?: boolean
  defaultModal?: OpenModal | null
  onRetry?: () => void
  errorMessage?: string
}

function itemText(refund: Refund): string {
  return `${refund.productName} · ${refund.optionName} × ${formatAmount(refund.quantity)}`
}

export function SellerClaimsView({
  status,
  refunds,
  filter,
  onFilterChange,
  pendingCount,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  onApprove,
  onReject,
  submitting = false,
  defaultModal = null,
  onRetry,
  errorMessage,
}: SellerClaimsViewProps) {
  const [modal, setModal] = useState<OpenModal | null>(defaultModal)
  const [why, setWhy] = useState('')
  const [whyError, setWhyError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const target = refunds.find((r) => r.refundId === modal?.refundId) ?? null
  const close = () => {
    setModal(null)
    setWhy('')
    setWhyError(null)
    setModalError(null)
  }
  const run = async (task: () => Outcome) => {
    setModalError(null)
    const failure = await task()
    if (failure === null) close()
    else setModalError(failure)
  }

  return (
    <div className={classes.root}>
      <PageHeader title="취소 요청 처리" hideOnMobile />
      <Alert color="info" icon={<Info />}>
        승인하면 주문이 취소되고 구매자 예치금으로 환불돼요. 배송비는 승인할 때 묶음에 남은 상품을
        보고 정해져요. 출고한 뒤에 승인하면 자동으로 거절되니 출고하기 전에 처리해 주세요.
      </Alert>

      <Tabs value={filter} onChange={(v) => onFilterChange((v ?? 'ALL') as RefundFilter)}>
        <Tabs.List aria-label="처리 상태로 보기" className={classes.tabs}>
          {refundFilters.map((value) => (
            <Tabs.Tab key={value} value={value}>
              {filterLabels[value]}
              {value === RefundStatus.REQUESTED && pendingCount !== undefined && (
                <>
                  {' '}
                  <span className="pd-num">{formatAmount(pendingCount)}</span>
                </>
              )}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      <QueryState
        status={status === 'success' && refunds.length === 0 ? 'empty' : status}
        skeleton={
          <Stack gap="md">
            <Skeleton h={180} radius="md" />
            <Skeleton h={180} radius="md" />
          </Stack>
        }
        loadingLabel="취소 요청을 불러오고 있어요"
        onRetry={onRetry}
        errorMessage={errorMessage}
        empty={{
          icon: <RotateCcw />,
          title: emptyTitles[filter],
          description:
            filter === RefundStatus.REQUESTED
              ? '구매자가 출고 전에 취소를 요청하면 이곳에 보여요.'
              : '다른 상태 탭에서 요청을 볼 수 있어요.',
          action: { label: '주문·출고로 가기', to: '/seller/orders' },
        }}
      >
        <Stack gap="md">
          {refunds.map((refund) => (
            <article
              key={refund.refundId}
              className={classes.card}
              aria-labelledby={`refund-${refund.refundId}`}
            >
              <div className={classes.body}>
                <div className={classes.head}>
                  <RefundStatusBadge status={refund.status} />
                  <span id={`refund-${refund.refundId}`} className={`pd-num ${classes.help}`}>
                    {formatDate(refund.requestedAt, 'dateTime')} 요청 · 주문번호 {refund.orderId}
                  </span>
                </div>
                <dl className={classes.kv}>
                  <div>
                    <dt>상품</dt>
                    <dd className="pd-num">{itemText(refund)}</dd>
                  </div>
                  <div>
                    <dt>취소 사유</dt>
                    <dd>{refund.cancelReason ?? '적지 않았어요'}</dd>
                  </div>
                  {refund.rejectReason && (
                    <div>
                      <dt>{refund.status === RefundStatus.FAILED ? '실패 이유' : '거절 사유'}</dt>
                      <dd>{refund.rejectReason}</dd>
                    </div>
                  )}
                  {refund.decidedAt && (
                    <div>
                      <dt>처리 시각</dt>
                      <dd className="pd-num">{formatDate(refund.decidedAt, 'dateTime')}</dd>
                    </div>
                  )}
                </dl>
              </div>
              <div className={classes.side}>
                <RefundAmounts refund={refund} />
                {refund.status === RefundStatus.REQUESTED && (
                  <Group gap="xs" grow>
                    <Button
                      variant="outline"
                      aria-label={`${refund.productName} 취소 요청 거절`}
                      onClick={() => setModal({ type: 'reject', refundId: refund.refundId })}
                    >
                      거절
                    </Button>
                    <Button
                      aria-label={`${refund.productName} 취소 요청 승인`}
                      onClick={() => setModal({ type: 'approve', refundId: refund.refundId })}
                    >
                      승인
                    </Button>
                  </Group>
                )}
              </div>
            </article>
          ))}
          {hasMore && (
            <Button variant="outline" onClick={onLoadMore} loading={loadingMore}>
              더 보기
            </Button>
          )}
        </Stack>
      </QueryState>

      <Modal
        opened={modal?.type === 'approve' && target !== null}
        onClose={close}
        title="취소 요청을 승인할까요?"
      >
        {target && (
          <Stack gap="md">
            <Text className={`pd-num ${classes.help}`}>
              주문번호 {target.orderId} · {itemText(target)}
            </Text>
            <Text>
              주문이 취소되고 구매자 예치금으로 환불돼요. 배송비는 지금 묶음에 남은 상품을 보고
              정해져요. 승인한 뒤에는 되돌릴 수 없어요.
            </Text>
            <Text size="sm" c="dimmed">
              그사이 출고했거나, 남은 상품 배송비가 취소 금액보다 크면 자동으로 거절돼요.
            </Text>
            {modalError && (
              <Text role="alert" c="error" size="sm">
                {modalError}
              </Text>
            )}
            <Group justify="flex-end" gap="xs">
              <Button variant="outline" onClick={close}>
                닫기
              </Button>
              <Button loading={submitting} onClick={() => run(() => onApprove(target.refundId))}>
                승인
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal
        opened={modal?.type === 'reject' && target !== null}
        onClose={close}
        title="취소 요청 거절"
      >
        {target && (
          <Stack gap="md">
            <Text className={`pd-num ${classes.help}`}>
              주문번호 {target.orderId} · {itemText(target)}
            </Text>
            <Textarea
              label="거절 사유"
              description="구매자의 취소 요청 내역에 그대로 보여요"
              placeholder="예: 이미 포장을 마쳐 오늘 출고할 예정이에요"
              autosize
              minRows={3}
              maxLength={REFUND_REASON_MAX_LENGTH}
              value={why}
              onChange={(e) => {
                setWhy(e.currentTarget.value)
                setWhyError(null)
              }}
              error={whyError}
              required
              data-autofocus
            />
            {modalError && (
              <Text role="alert" c="error" size="sm">
                {modalError}
              </Text>
            )}
            <Group justify="flex-end" gap="xs" align="flex-start">
              <Button variant="outline" onClick={close}>
                닫기
              </Button>
              <Button
                loading={submitting}
                onClick={() => {
                  if (!why.trim()) return setWhyError('거절 사유를 입력해 주세요')
                  void run(() => onReject(target.refundId, why.trim()))
                }}
              >
                거절하기
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </div>
  )
}
