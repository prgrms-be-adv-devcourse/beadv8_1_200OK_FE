import { useSearchParams } from 'react-router'
import { OrderItemStatus } from '@/shared/api/types'
import { orderSummaries } from '../fixtures'
import { OrderFilter, type OrderSummary } from '../types'
import { OrderListView } from '../views/OrderListView'

// B-07 주문 내역 라우트 /orders?filter=. 1단계: fixtures를 필터로 거른다.
// TODO(api): 📝 GET /orders (필터·페이지 파라미터 미정)

const inProgress = new Set<OrderItemStatus>([
  OrderItemStatus.PAYMENT_PENDING,
  OrderItemStatus.PREPARING,
  OrderItemStatus.SHIPPING,
  OrderItemStatus.DELIVERED,
  OrderItemStatus.CANCEL_REQUESTED,
])

const matches: Record<OrderFilter, (status: OrderItemStatus) => boolean> = {
  [OrderFilter.ALL]: () => true,
  [OrderFilter.IN_PROGRESS]: (status) => inProgress.has(status),
  [OrderFilter.CONFIRMED]: (status) => status === OrderItemStatus.PURCHASE_CONFIRMED,
  [OrderFilter.CANCELED]: (status) => status === OrderItemStatus.CANCELED,
}

export function filterOrders(orders: OrderSummary[], filter: OrderFilter) {
  return orders.filter((order) => order.items.some((item) => matches[filter](item.status)))
}

export function OrderListPage() {
  const [params, setParams] = useSearchParams()
  const filter =
    Object.values(OrderFilter).find((value) => value === params.get('filter')) ?? OrderFilter.ALL

  return (
    <OrderListView
      status="success"
      orders={filterOrders(orderSummaries, filter)}
      filter={filter}
      onFilterChange={(next) =>
        setParams(next === OrderFilter.ALL ? {} : { filter: next }, { replace: true })
      }
    />
  )
}
