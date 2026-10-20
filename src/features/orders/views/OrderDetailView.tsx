import { Button, Skeleton, Stack } from '@mantine/core'
import { PackageX } from 'lucide-react'
import { Link } from 'react-router'
import {
  type OrderDetail,
  type OrderDetailItem,
  type OrderDetailSellerGroup,
  OrderItemStatus,
} from '@/shared/api/types'
import { formatDate } from '@/shared/lib/format'
import {
  DisabledReason,
  FarmAvatar,
  OrderStatusBadge,
  PageHeader,
  PriceText,
  ProgressSteps,
  QueryState,
  StatusBadge,
} from '@/shared/ui'
import { OrderItemRow } from '../components/OrderItemRow'
import classes from './OrderDetailView.module.css'

// B-08 주문 상세. 시안: b2c/OrderDetail, OrderDetailMobile
// ✅ GET /orders/{orderId}: 판매자별 묶음(sellerGroups) · 상품별 상태 · 배송지 · 결제 금액. 리뷰 쓰기는 구매확정한 상품 단위.
// 시안에 있던 동작 중 API가 없는 것은 비활성 버튼 + 이유 문구로 남기거나 뺐다:
// TODO(api): ❌ 취소 요청 API 없음 → ‘취소 요청’ 비활성 + 이유
// TODO(api): ❌ 구매확정 API 없음 → ‘구매확정’ 비활성 + 이유. 자동 구매확정 예정일(autoConfirmAt)도 없어 안내를 뺐다
// TODO(api): POST /shipments/{shipmentId}/address-change-requests는 있으나 주문 상세에 shipmentId가 없음 → 배송지 변경 요청 숨김
// TODO(api): ❌ 배송 조회(carrier·trackingNumber 없음) → 송장·배송 조회 링크 숨김
// TODO(api): ❌ 문의 API 없음 → 고객센터 문의 링크 숨김(SupportPage는 fixtures 전용)
// TODO(api): 판매자 이름 없음(sellerId만) → ‘판매자 {sellerId}’

export type OrderDetailViewProps = {
  status: 'pending' | 'error' | 'notFound' | 'success'
  order?: OrderDetail
  onRetry?: () => void
  errorMessage?: string
}

const STEPS = ['결제 완료', '상품 준비 중', '배송 중', '배송 완료', '구매확정']

const stepOf: Partial<Record<OrderItemStatus, number>> = {
  [OrderItemStatus.PREPARING]: 1,
  [OrderItemStatus.CANCEL_REQUESTED]: 1,
  [OrderItemStatus.SHIPPING]: 2,
  [OrderItemStatus.DELIVERED]: 3,
  [OrderItemStatus.PURCHASE_CONFIRMED]: 4,
}

/** 묶음 안 상품 상태가 모두 같을 때만 그 상태 (다르면 묶음 단계·동작을 그리지 않는다) */
function sharedStatus(group: OrderDetailSellerGroup): OrderItemStatus | null {
  const [first, ...rest] = group.items
  if (!first) return null
  return rest.every((item) => item.status === first.status) ? first.status : null
}

function DetailSkeleton() {
  return (
    <div className={classes.layout}>
      <Stack gap="md">
        <Skeleton h={110} radius="md" />
        <Skeleton h={260} radius="md" />
      </Stack>
      <Skeleton h={220} radius="md" />
    </div>
  )
}

function GroupAction({ status }: { status: OrderItemStatus | null }) {
  switch (status) {
    case OrderItemStatus.PREPARING:
      return (
        <DisabledReason reason="취소 요청은 아직 준비 중이에요">
          <Button variant="outline" size="sm" disabled>
            취소 요청
          </Button>
        </DisabledReason>
      )
    case OrderItemStatus.CANCEL_REQUESTED:
      return <span>판매자가 확인하고 있어요</span>
    case OrderItemStatus.SHIPPING:
      return <span>배송 중에는 취소할 수 없어요</span>
    case OrderItemStatus.DELIVERED:
      return (
        <DisabledReason reason="구매확정은 아직 준비 중이에요">
          <Button size="sm" disabled>
            구매확정
          </Button>
        </DisabledReason>
      )
    default:
      return null
  }
}

function ReviewLink({ orderId, item }: { orderId: number; item: OrderDetailItem }) {
  if (item.status !== OrderItemStatus.PURCHASE_CONFIRMED) return null
  return (
    <Button
      component={Link}
      to={`/reviews/new?orderId=${orderId}&orderItemId=${item.orderItemId}`}
      variant="outline"
      size="sm"
    >
      리뷰 쓰기
    </Button>
  )
}

export function OrderDetailView({ status, order, onRetry, errorMessage }: OrderDetailViewProps) {
  const resolvedStatus = status === 'success' && !order ? 'notFound' : status

  if (resolvedStatus !== 'success' || !order) {
    return (
      <div className={classes.root}>
        <PageHeader title="주문 상세" backTo="/orders" />
        <QueryState
          status={resolvedStatus}
          skeleton={<DetailSkeleton />}
          loadingLabel="주문 정보를 불러오고 있어요"
          errorMessage={errorMessage}
          onRetry={onRetry}
          notFound={{
            icon: <PackageX />,
            title: '주문을 찾을 수 없어요',
            description: '주문번호를 확인하거나 주문 내역에서 다시 골라 주세요.',
            action: { label: '주문 내역으로', to: '/orders' },
          }}
        />
      </div>
    )
  }

  return (
    <div className={classes.root}>
      <PageHeader
        title="주문 상세"
        backTo="/orders"
        breadcrumbs={[{ label: '주문 내역', to: '/orders' }, { label: '주문 상세' }]}
      />
      <div className={classes.orderMeta}>
        <span className="pd-num">
          주문번호 {order.orderId} · {formatDate(order.orderedAt, 'dateTime')}
        </span>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className={classes.layout}>
        <Stack gap="md">
          <section className={classes.card} aria-labelledby="order-address">
            <h2 id="order-address" className={classes.cardTitle}>
              배송지
            </h2>
            <p className="pd-num">
              <strong>{order.recipientName}</strong> · {order.recipientPhone}
            </p>
            <p className="pd-num">
              ({order.zipCode}) {order.address}
              {order.addressDetail ? `, ${order.addressDetail}` : ''}
            </p>
          </section>

          {order.sellerGroups.map((group) => {
            const groupStatus = sharedStatus(group)
            const step = groupStatus === null ? undefined : stepOf[groupStatus]
            return (
              <section
                key={group.sellerId}
                className={classes.card}
                aria-labelledby={`seller-group-${group.sellerId}`}
              >
                <div className={classes.groupHead}>
                  <div className={classes.groupTitle}>
                    <FarmAvatar name="판매자" size={32} />
                    <h2 id={`seller-group-${group.sellerId}`} className={classes.cardTitle}>
                      <span className="pd-num">판매자 {group.sellerId}</span>
                    </h2>
                    {groupStatus !== null && <StatusBadge status={groupStatus} />}
                  </div>
                </div>

                {step !== undefined && (
                  <ProgressSteps
                    steps={STEPS}
                    current={step}
                    completed={groupStatus === OrderItemStatus.PURCHASE_CONFIRMED}
                    label="배송 진행 단계"
                  />
                )}

                {group.items.map((item) => (
                  <OrderItemRow
                    key={item.orderItemId}
                    item={item}
                    meta={groupStatus === null ? <StatusBadge status={item.status} /> : undefined}
                    actions={<ReviewLink orderId={order.orderId} item={item} />}
                  />
                ))}

                <div className={classes.groupFoot}>
                  <div className={classes.fees}>
                    <div className={classes.row}>
                      <span>배송비</span>
                      <PriceText amount={group.shippingFee} size="S" />
                    </div>
                    {group.remoteAreaFee > 0 && (
                      <div className={classes.row}>
                        <span>도서산간 추가 운임</span>
                        <PriceText amount={group.remoteAreaFee} size="S" />
                      </div>
                    )}
                  </div>
                  <div className={classes.action}>
                    <GroupAction status={groupStatus} />
                  </div>
                </div>
              </section>
            )
          })}
        </Stack>

        <aside aria-labelledby="order-pay" className={classes.card}>
          <h2 id="order-pay" className={classes.cardTitle}>
            결제 정보
          </h2>
          <dl className={classes.rows}>
            <div>
              <dt>상품 금액</dt>
              <dd>
                <PriceText amount={order.totalProductAmount} size="S" />
              </dd>
            </div>
            <div>
              <dt>배송비</dt>
              <dd>
                <PriceText amount={order.totalShippingFee} size="S" />
              </dd>
            </div>
            {order.totalRemoteAreaFee > 0 && (
              <div>
                <dt>도서산간 추가 운임</dt>
                <dd>
                  <PriceText amount={order.totalRemoteAreaFee} size="S" />
                </dd>
              </div>
            )}
            <div className={classes.totalRow}>
              <dt>총 결제 금액</dt>
              <dd>
                <PriceText amount={order.totalAmount} size="M" />
              </dd>
            </div>
            <div>
              <dt>결제 수단</dt>
              <dd>예치금</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  )
}
