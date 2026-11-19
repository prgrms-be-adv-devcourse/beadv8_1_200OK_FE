import { Button, Modal, SegmentedControl, Skeleton, Stack } from '@mantine/core'
import { History } from 'lucide-react'
import { formatDate, formatPrice } from '@/shared/lib/format'
import { payoutEventTypeLabels } from '@/shared/lib/labels'
import { QueryState } from '@/shared/ui'
import { failureCategoryLabel, failureReasonLabel, resolutionMethodLabel } from '../labels'
import type { Resolution, ResolutionHistoryRows, ResolutionRequest, ResolutionView } from '../types'
import classes from '../views/PayoutReviewViews.module.css'

// 주문 하나의 해결 기록. 해결 요청 1번 = 1줄(requests)과 해결한 실패 기록 1건 = 1줄(lines)을 바꿔 본다.
// 같은 요청에서 나온 줄은 요청 번호가 같다. 메모·상세는 원문이라 React 기본 이스케이프로 그린다.

export type ResolutionHistoryModalProps = {
  /** null이면 닫힘 */
  orderId: number | null
  history: ResolutionHistoryRows
  onViewChange: (view: ResolutionView) => void
  status: 'pending' | 'error' | 'success'
  errorMessage?: string
  onRetry?: () => void
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  onClose: () => void
}

const viewOptions: { value: ResolutionView; label: string }[] = [
  { value: 'requests', label: '요청별' },
  { value: 'lines', label: '실패 기록별' },
]

/** UUID 앞 8자리. 같은 요청인지 맞춰 보는 데 충분하다 */
const shortId = (id: string) => id.slice(0, 8)

function RequestItem({ row }: { row: ResolutionRequest }) {
  return (
    <li className={classes.order}>
      <dl className={classes.meta}>
        <dt>해결 시각</dt>
        <dd className="pd-num">{formatDate(row.resolvedAt, 'dateTime')}</dd>
        <dt>관리자</dt>
        <dd className="pd-num">회원 {row.adminId}</dd>
        <dt>방법</dt>
        <dd>
          {resolutionMethodLabel(row.method)} · 실패 기록 {row.resolvedFailureCount}건
        </dd>
        <dt>요청 번호</dt>
        <dd className="pd-num" title={row.resolutionRequestId}>
          {shortId(row.resolutionRequestId)}
        </dd>
        <dt>메모</dt>
        <dd className={classes.detailText}>{row.memo}</dd>
      </dl>
    </li>
  )
}

function LineItem({ row }: { row: Resolution }) {
  return (
    <li className={classes.order}>
      <dl className={classes.meta}>
        <dt>해결 시각</dt>
        <dd className="pd-num">{formatDate(row.resolvedAt, 'dateTime')}</dd>
        <dt>요청 번호</dt>
        <dd className="pd-num" title={row.resolutionRequestId}>
          {shortId(row.resolutionRequestId)}
        </dd>
        <dt>실패 기록</dt>
        <dd className="pd-num">
          {row.failureId} · {formatDate(row.failedAt, 'dateTime')}
        </dd>
        <dt>정산후보</dt>
        <dd>
          {row.orderItemId === null ? '배송비' : `주문상품 ${row.orderItemId}`} ·{' '}
          {payoutEventTypeLabels[row.eventType] ?? row.eventType} ·{' '}
          <span className="pd-num">{formatPrice(row.amount)}</span> · 판매자 {row.sellerId}
        </dd>
        <dt>사유</dt>
        <dd>
          {failureReasonLabel(row.reason)} ({failureCategoryLabel(row.category)})
        </dd>
        <dt>상세</dt>
        <dd className={classes.detailText}>{row.detail}</dd>
        <dt>관리자</dt>
        <dd className="pd-num">
          회원 {row.adminId} · {resolutionMethodLabel(row.method)}
        </dd>
        <dt>메모</dt>
        <dd className={classes.detailText}>{row.memo}</dd>
      </dl>
    </li>
  )
}

export function ResolutionHistoryModal({
  orderId,
  history,
  onViewChange,
  status,
  errorMessage,
  onRetry,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onClose,
}: ResolutionHistoryModalProps) {
  const empty = status === 'success' && history.rows.length === 0
  return (
    <Modal
      opened={orderId !== null}
      onClose={onClose}
      title={orderId === null ? '' : `주문 ${orderId} 해결 기록`}
      size="lg"
    >
      <Stack gap="md">
        <SegmentedControl
          aria-label="해결 기록 보기"
          value={history.view}
          onChange={(value) => onViewChange(value as ResolutionView)}
          data={viewOptions}
        />
        <QueryState
          status={empty ? 'empty' : status}
          skeleton={
            <Stack gap="xs">
              <Skeleton h={96} radius="md" />
              <Skeleton h={96} radius="md" />
            </Stack>
          }
          loadingLabel="해결 기록을 불러오고 있어요"
          onRetry={onRetry}
          errorMessage={errorMessage}
          empty={{
            icon: <History />,
            title: '해결 기록이 없어요',
            description: '이 주문을 해결하면 여기에 남아요.',
          }}
        >
          <ul className={classes.list} aria-label="해결 기록">
            {history.view === 'requests'
              ? history.rows.map((row) => <RequestItem key={row.resolutionRequestId} row={row} />)
              : history.rows.map((row) => <LineItem key={row.resolutionId} row={row} />)}
          </ul>
          {hasMore && (
            <Button variant="subtle" fullWidth loading={loadingMore} onClick={onLoadMore}>
              더 보기
            </Button>
          )}
        </QueryState>
      </Stack>
    </Modal>
  )
}
