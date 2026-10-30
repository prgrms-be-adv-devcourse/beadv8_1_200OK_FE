import { orderErrorMessage, useOrders } from '../queries'
import { OrderListView } from '../views/OrderListView'

// B-07 주문 내역 라우트 /orders. ✅ GET /orders를 ‘더 보기’로 이어 받는다(필터 파라미터 없음).

export function OrderListPage() {
  const orders = useOrders()

  return (
    <OrderListView
      status={orders.isPending ? 'pending' : orders.isError ? 'error' : 'success'}
      orders={orders.data?.pages.flatMap((page) => page.content) ?? []}
      hasMore={orders.hasNextPage}
      loadingMore={orders.isFetchingNextPage}
      onLoadMore={() => void orders.fetchNextPage()}
      onRetry={() => void orders.refetch()}
      errorMessage={orders.error ? orderErrorMessage(orders.error) : undefined}
    />
  )
}
