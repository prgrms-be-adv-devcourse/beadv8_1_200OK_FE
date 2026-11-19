import { showToast } from '@/shared/ui'
import { orderErrorMessage, useMyRefunds, useWithdrawRefund } from '../queries'
import { RefundListView } from '../views/RefundListView'

// 취소 요청 내역 라우트 /orders/refunds. ✅ GET /refunds를 ‘더 보기’로 이어 받고, 철회는 ✅ POST /refunds/{id}/withdraw.

export function RefundListPage() {
  const refunds = useMyRefunds()
  const withdraw = useWithdrawRefund()

  return (
    <RefundListView
      status={refunds.isPending ? 'pending' : refunds.isError ? 'error' : 'success'}
      refunds={refunds.data?.pages.flatMap((page) => page.content) ?? []}
      hasMore={refunds.hasNextPage}
      loadingMore={refunds.isFetchingNextPage}
      onLoadMore={() => void refunds.fetchNextPage()}
      onRetry={() => void refunds.refetch()}
      errorMessage={refunds.error ? orderErrorMessage(refunds.error) : undefined}
      onWithdraw={(refundId) =>
        withdraw.mutate(refundId, {
          onSuccess: () => showToast({ message: '취소 요청을 철회했어요' }),
          onError: (error) => showToast({ message: orderErrorMessage(error) }),
        })
      }
      withdrawingRefundId={withdraw.isPending ? withdraw.variables : null}
    />
  )
}
