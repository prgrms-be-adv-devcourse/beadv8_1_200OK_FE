import { Button, Skeleton, Stack } from '@mantine/core'
import { ReceiptText } from 'lucide-react'
import { Link } from 'react-router'
import type { OrderSummary } from '@/shared/api/types'
import { formatAmount, formatDate } from '@/shared/lib/format'
import { OrderStatusBadge, PageHeader, PriceText, QueryState } from '@/shared/ui'
import classes from './OrderListView.module.css'

// B-07 주문 내역. 시안: b2c/Orders, OrdersMobile
// ✅ GET /orders는 최신순 페이지 조회만 있고 상태 필터가 없다. 목록 한 줄은 대표 상품명 + 종류 수 · 주문 상태 · 총 금액이라
// 시안의 상태 필터 칩과 상품별 줄은 뺐다(상품별 상태는 주문 상세에서 본다). 목록은 ‘더 보기’로 이어 불러온다.

export type OrderListViewProps = {
  status: 'pending' | 'error' | 'success'
  orders: OrderSummary[]
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
        <Skeleton key={n} h={150} radius="md" />
      ))}
    </Stack>
  )
}

/** 대표 상품명 + 다른 종류 수: `청송 꿀사과 부사 외 1건` */
export function orderTitle(order: OrderSummary): string {
  return order.itemCount > 1
    ? `${order.representativeProductName} 외 ${formatAmount(order.itemCount - 1)}건`
    : order.representativeProductName
}

export function OrderListView({
  status,
  orders,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onRetry,
  errorMessage,
}: OrderListViewProps) {
  return (
    <div className={classes.root}>
      <PageHeader title="주문 내역" backTo="/me" />

      <QueryState
        status={status === 'success' && orders.length === 0 ? 'empty' : status}
        skeleton={<ListSkeleton />}
        loadingLabel="주문 내역을 불러오고 있어요"
        errorMessage={errorMessage}
        onRetry={onRetry}
        empty={{
          icon: <ReceiptText />,
          title: '아직 주문한 상품이 없어요',
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
                  <span className={`pd-num ${classes.help}`}>주문번호 {order.orderId}</span>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className={classes.body}>
                <Link to={`/orders/${order.orderId}`} className={classes.name}>
                  {orderTitle(order)}
                </Link>
                <span className={`pd-num ${classes.help}`}>
                  상품 {formatAmount(order.itemCount)}종
                </span>
              </div>
              <div className={classes.total}>
                <span>
                  총 결제 금액 <span className={classes.help}>(배송비 포함)</span>
                </span>
                <PriceText amount={order.totalAmount} size="M" />
              </div>
              <div className={classes.foot}>
                <Button
                  component={Link}
                  to={`/orders/${order.orderId}`}
                  variant="outline"
                  size="sm"
                  aria-label={`주문번호 ${order.orderId} 주문 상세`}
                >
                  주문 상세
                </Button>
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
