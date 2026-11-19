import { Button, Skeleton, Stack } from '@mantine/core'
import { RotateCcw } from 'lucide-react'
import type { Refund } from '@/shared/api/refund'
import { PageHeader, QueryState } from '@/shared/ui'
import { RefundCard } from '../components/RefundCard'
import classes from './RefundListView.module.css'

// 취소 요청 내역 /orders/refunds. ✅ GET /refunds(최신순 25건씩). 승인 전(승인 대기)이면 여기서 철회한다.
// 요청은 주문 상세에서 상품마다 한다.

export type RefundListViewProps = {
  status: 'pending' | 'error' | 'success'
  refunds: Refund[]
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  onRetry?: () => void
  errorMessage?: string
  onWithdraw?: (refundId: number) => void
  withdrawingRefundId?: number | null
}

export function RefundListView({
  status,
  refunds,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onRetry,
  errorMessage,
  onWithdraw,
  withdrawingRefundId = null,
}: RefundListViewProps) {
  return (
    <div className={classes.root}>
      <PageHeader
        title="취소 요청 내역"
        backTo="/orders"
        breadcrumbs={[{ label: '주문 내역', to: '/orders' }, { label: '취소 요청 내역' }]}
      />
      <QueryState
        status={status === 'success' && refunds.length === 0 ? 'empty' : status}
        skeleton={
          <Stack gap="md">
            <Skeleton h={180} radius="md" />
            <Skeleton h={180} radius="md" />
          </Stack>
        }
        loadingLabel="취소 요청 내역을 불러오고 있어요"
        errorMessage={errorMessage}
        onRetry={onRetry}
        empty={{
          icon: <RotateCcw />,
          title: '취소를 요청한 상품이 없어요',
          description: '출고 전 상품은 주문 상세에서 취소를 요청할 수 있어요.',
          action: { label: '주문 내역으로', to: '/orders' },
        }}
      >
        <Stack gap="md">
          {refunds.map((refund) => (
            <RefundCard
              key={refund.refundId}
              refund={refund}
              showOrderLink
              onWithdraw={onWithdraw}
              withdrawing={withdrawingRefundId === refund.refundId}
            />
          ))}
          {hasMore && onLoadMore && (
            <div className={classes.more}>
              <Button variant="outline" loading={loadingMore} onClick={onLoadMore}>
                더 보기
              </Button>
            </div>
          )}
        </Stack>
      </QueryState>
    </div>
  )
}
