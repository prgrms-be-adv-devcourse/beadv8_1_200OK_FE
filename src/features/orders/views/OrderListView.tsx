import { Button, Chip, Group, Skeleton, Stack } from '@mantine/core'
import { ReceiptText } from 'lucide-react'
import { Link } from 'react-router'
import { formatDate } from '@/shared/lib/format'
import { PageHeader, PriceText, QueryState, StatusBadge } from '@/shared/ui'
import { OrderItemRow } from '../components/OrderItemRow'
import { orderFilterLabels } from '../labels'
import { OrderFilter, type OrderSummary } from '../types'
import classes from './OrderListView.module.css'

// B-07 주문 내역. 시안: b2c/Orders, OrdersMobile
// 필터(전체 · 진행 중 · 구매확정 · 취소)는 주문 상품 상태로 고른다. 목록은 ‘더 보기’로 이어 불러온다.
// TODO(api): 📝 GET /orders (필터 파라미터 미정 — 서버가 안 받으면 불러온 목록에서 거른다)

export type OrderListViewProps = {
  status: 'pending' | 'error' | 'success'
  orders: OrderSummary[]
  filter: OrderFilter
  onFilterChange: (filter: OrderFilter) => void
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  onRetry?: () => void
  errorMessage?: string
}

function ListSkeleton() {
  return (
    <Stack gap="md">
      {[1, 2, 3].map((n) => (
        <Skeleton key={n} h={180} radius="md" />
      ))}
    </Stack>
  )
}

export function OrderListView({
  status,
  orders,
  filter,
  onFilterChange,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onRetry,
  errorMessage,
}: OrderListViewProps) {
  return (
    <div className={classes.root}>
      <PageHeader title="주문 내역" backTo="/me" />

      <Chip.Group value={filter} onChange={(value) => onFilterChange(value as OrderFilter)}>
        <Group gap="xs" role="radiogroup" aria-label="주문 상태로 보기">
          {Object.values(OrderFilter).map((value) => (
            <Chip key={value} value={value}>
              {orderFilterLabels[value]}
            </Chip>
          ))}
        </Group>
      </Chip.Group>

      <QueryState
        status={status === 'success' && orders.length === 0 ? 'empty' : status}
        skeleton={<ListSkeleton />}
        loadingLabel="주문 내역을 불러오고 있어요"
        errorMessage={errorMessage}
        onRetry={onRetry}
        empty={{
          icon: <ReceiptText />,
          title:
            filter === OrderFilter.ALL
              ? '아직 주문한 상품이 없어요'
              : `${orderFilterLabels[filter]} 주문이 없어요`,
          description: '산지에서 막 수확한 상품을 둘러보세요.',
          action: { label: '장보러 가기', to: '/products' },
        }}
      >
        <Stack gap="md">
          {orders.map((order) => (
            <article
              key={order.orderId}
              className={classes.card}
              aria-labelledby={`order-${order.orderId}`}
            >
              <div className={classes.head}>
                <div>
                  <h2 id={`order-${order.orderId}`} className={`pd-num ${classes.date}`}>
                    {formatDate(order.orderedAt, 'monthDay')} 주문
                  </h2>
                  <span className={`pd-num ${classes.help}`}>주문번호 {order.orderNumber}</span>
                </div>
                <Button
                  component={Link}
                  to={`/orders/${order.orderId}`}
                  variant="subtle"
                  aria-label={`${order.orderNumber} 주문 상세`}
                >
                  주문 상세
                </Button>
              </div>
              {order.items.map((item) => (
                <OrderItemRow
                  key={item.orderItemId}
                  item={item}
                  meta={
                    <>
                      <StatusBadge status={item.status} />
                      {item.sellerName}
                    </>
                  }
                />
              ))}
              <div className={classes.total}>
                <span>
                  총 결제 금액 <span className={classes.help}>(배송비 포함)</span>
                </span>
                <PriceText amount={order.totalAmount} size="M" />
              </div>
            </article>
          ))}
          {hasMore && onLoadMore && (
            <div className={classes.more}>
              <Button variant="outline" loading={loadingMore} onClick={onLoadMore}>
                주문 더 보기
              </Button>
            </div>
          )}
        </Stack>
      </QueryState>
    </div>
  )
}
