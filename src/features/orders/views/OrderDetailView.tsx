import { Anchor, Button, Group, Modal, Skeleton, Stack, Text } from '@mantine/core'
import { CircleAlert, MapPinned, PackageX, Truck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { OrderItemStatus, type ShippingAddress } from '@/shared/api/types'
import { formatDate, formatPrice } from '@/shared/lib/format'
import {
  AddressModal,
  FarmAvatar,
  PageHeader,
  PriceText,
  ProgressSteps,
  QueryState,
  StatusBadge,
} from '@/shared/ui'
import { CancelModal, type CancelModalProps } from '../components/CancelModal'
import { OrderItemRow } from '../components/OrderItemRow'
import type { CancelRequest, OrderDetail, OrderShipment } from '../types'
import classes from './OrderDetailView.module.css'

// B-08 · B-09 주문 상세 · 취소 요청 · 구매확정. 시안: b2c/OrderDetail, OrderDetailMobile
// 농가마다 배송 묶음(shipment)이 하나이고, 취소·구매확정·배송지 변경 요청은 묶음 단위, 리뷰는 상품 단위다.
// TODO(api): 📝 GET /orders/{id}, 구매확정 POST /orders/{id}/items/{itemId}/confirm, 취소 POST /claims/cancel,
//   철회 POST /claims/{id}/withdraw, 배송지 변경 요청(API 미정)

export type OrderModal = { type: 'cancel' | 'confirm' | 'address'; shipmentId: number }

/** 그냥 끝나거나 Promise를 돌려준다 (2단계 mutateAsync) */
type MaybeAsync = unknown

export type OrderDetailViewProps = {
  status: 'pending' | 'error' | 'notFound' | 'success'
  order?: OrderDetail
  /** 핸들러가 Promise를 돌려주면 끝날 때 모달을 닫고, 실패(reject)하면 열어 둔다 */
  onCancelRequest: (request: CancelRequest) => MaybeAsync
  onWithdraw: (claimId: number) => MaybeAsync
  onConfirm: (shipmentId: number) => MaybeAsync
  onAddressChangeRequest: (shipmentId: number, address: ShippingAddress) => MaybeAsync
  submitting?: boolean
  cancelError?: CancelModalProps['error']
  /** 처음부터 열어 둘 모달 (미리보기) */
  defaultModal?: OrderModal | null
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

function ShipmentAction({
  shipment,
  onOpen,
  onWithdraw,
}: {
  shipment: OrderShipment
  onOpen: (type: OrderModal['type']) => void
  onWithdraw: () => void
}) {
  switch (shipment.status) {
    case OrderItemStatus.PREPARING:
      return (
        <Button variant="outline" size="sm" onClick={() => onOpen('cancel')}>
          취소 요청
        </Button>
      )
    case OrderItemStatus.CANCEL_REQUESTED:
      return (
        <>
          <span>판매자가 확인하고 있어요</span>
          <Button variant="subtle" size="sm" onClick={onWithdraw}>
            요청 철회
          </Button>
        </>
      )
    case OrderItemStatus.SHIPPING:
      return <span>배송 중에는 취소할 수 없어요</span>
    case OrderItemStatus.DELIVERED:
      return (
        <>
          {shipment.autoConfirmAt && (
            <span className="pd-num">
              {formatDate(shipment.autoConfirmAt, 'monthDay')}에 자동으로 구매확정돼요
            </span>
          )}
          <Button size="sm" onClick={() => onOpen('confirm')}>
            구매확정
          </Button>
        </>
      )
    case OrderItemStatus.CANCELED:
      return shipment.refundedAmount !== null ? (
        <span className="pd-num">
          예치금 {formatPrice(shipment.refundedAmount)} 환불 완료
          {shipment.refundedAt && ` · ${formatDate(shipment.refundedAt, 'dateTime')}`}
        </span>
      ) : null
    default:
      return null
  }
}

export function OrderDetailView({
  status,
  order,
  onCancelRequest,
  onWithdraw,
  onConfirm,
  onAddressChangeRequest,
  submitting = false,
  cancelError,
  defaultModal = null,
  onRetry,
  errorMessage,
}: OrderDetailViewProps) {
  const [modal, setModal] = useState<OrderModal | null>(defaultModal)
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

  const target = order.shipments.find((s) => s.shipmentId === modal?.shipmentId) ?? null
  const close = () => setModal(null)
  const run = async (task: () => MaybeAsync) => {
    try {
      await task()
      close()
    } catch {
      // 실패하면 모달을 열어 둔다 (오류 문구는 밖에서 넘긴다)
    }
  }
  const refunded = order.shipments.reduce((sum, s) => sum + (s.refundedAmount ?? 0), 0)

  return (
    <div className={classes.root}>
      <PageHeader
        title="주문 상세"
        backTo="/orders"
        breadcrumbs={[{ label: '주문 내역', to: '/orders' }, { label: '주문 상세' }]}
      />
      <p className={`pd-num ${classes.orderMeta}`}>
        주문번호 {order.orderNumber} · {formatDate(order.orderedAt, 'dateTime')}
      </p>

      <div className={classes.layout}>
        <Stack gap="md">
          <section className={classes.card} aria-labelledby="order-address">
            <h2 id="order-address" className={classes.cardTitle}>
              배송지
            </h2>
            <p className="pd-num">
              <strong>{order.recipient.recipientName}</strong> · {order.recipient.recipientPhone}
            </p>
            <p className="pd-num">
              ({order.recipient.zipCode}) {order.recipient.address}
              {order.recipient.addressDetail ? `, ${order.recipient.addressDetail}` : ''}
            </p>
          </section>

          {order.shipments.map((shipment) => {
            const step = stepOf[shipment.status]
            const hasInvoice = Boolean(shipment.trackingNumber)
            return (
              <section
                key={shipment.shipmentId}
                className={classes.card}
                aria-labelledby={`shipment-${shipment.shipmentId}`}
              >
                <div className={classes.groupHead}>
                  <div className={classes.groupTitle}>
                    <FarmAvatar name={shipment.sellerName} size={32} />
                    <h2 id={`shipment-${shipment.shipmentId}`} className={classes.cardTitle}>
                      {shipment.sellerName}
                    </h2>
                    <StatusBadge status={shipment.status} />
                  </div>
                  {shipment.status === OrderItemStatus.PREPARING &&
                    !shipment.addressChangeRequested && (
                      <Button
                        variant="subtle"
                        size="sm"
                        onClick={() =>
                          setModal({ type: 'address', shipmentId: shipment.shipmentId })
                        }
                      >
                        배송지 변경 요청
                      </Button>
                    )}
                </div>

                {shipment.addressChangeRequested &&
                  (shipment.status === OrderItemStatus.PREPARING ||
                    shipment.status === OrderItemStatus.CANCEL_REQUESTED) && (
                    <p className={classes.notice}>
                      <MapPinned size={16} aria-hidden="true" />
                      <span>
                        <strong>배송지 변경 요청 중</strong> · 판매자가 확인하면 바뀌어요
                      </span>
                    </p>
                  )}

                {step !== undefined && (
                  <ProgressSteps
                    steps={STEPS}
                    current={step}
                    completed={shipment.status === OrderItemStatus.PURCHASE_CONFIRMED}
                    label="배송 진행 단계"
                  />
                )}

                {hasInvoice && (
                  <div className={classes.invoice}>
                    <Truck size={16} aria-hidden="true" />
                    <span className="pd-num">
                      송장{' '}
                      <strong>
                        {shipment.carrier} {shipment.trackingNumber}
                      </strong>
                    </span>
                    <Anchor
                      component={Link}
                      to={`/orders/${order.orderId}/shipments/${shipment.shipmentId}`}
                      size="sm"
                    >
                      배송 조회
                    </Anchor>
                  </div>
                )}

                {shipment.items.map((item) => (
                  <OrderItemRow
                    key={item.orderItemId}
                    item={item}
                    actions={
                      shipment.status === OrderItemStatus.PURCHASE_CONFIRMED && (
                        <Button
                          component={Link}
                          to={`/reviews/new?orderItemId=${item.orderItemId}`}
                          variant="outline"
                          size="sm"
                        >
                          리뷰 쓰기
                        </Button>
                      )
                    }
                  />
                ))}

                <div className={classes.groupFoot}>
                  <div className={classes.row}>
                    <span>배송비</span>
                    <PriceText amount={shipment.shippingFee} size="S" />
                  </div>
                  <div className={classes.action}>
                    <ShipmentAction
                      shipment={shipment}
                      onOpen={(type) => setModal({ type, shipmentId: shipment.shipmentId })}
                      onWithdraw={() => shipment.claimId !== null && onWithdraw(shipment.claimId)}
                    />
                  </div>
                </div>

                {shipment.status === OrderItemStatus.DELIVERED && (
                  <p className={classes.support}>
                    <CircleAlert size={16} aria-hidden="true" />
                    상품에 문제가 있나요?
                    <Anchor component={Link} to={`/orders/${order.orderId}/inquiry`}>
                      고객센터에 문의하기
                    </Anchor>
                  </p>
                )}
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
            {refunded > 0 && (
              <div>
                <dt>환불 금액</dt>
                <dd>
                  <PriceText amount={refunded} size="S" />
                </dd>
              </div>
            )}
          </dl>
        </aside>
      </div>

      <CancelModal
        shipment={modal?.type === 'cancel' ? target : null}
        onClose={close}
        submitting={submitting}
        error={cancelError}
        onSubmit={(request) => run(() => onCancelRequest(request))}
      />

      <Modal opened={modal?.type === 'confirm'} onClose={close} title="구매확정할까요?">
        <Text>구매확정 후에는 취소·환불을 할 수 없어요. 상품을 잘 받으셨나요?</Text>
        <Group justify="flex-end" gap="xs" mt="lg">
          <Button variant="outline" onClick={close}>
            닫기
          </Button>
          <Button
            loading={submitting}
            onClick={() => target && run(() => onConfirm(target.shipmentId))}
          >
            구매확정
          </Button>
        </Group>
      </Modal>

      <AddressModal
        opened={modal?.type === 'address'}
        initial={order.recipient}
        title="배송지 변경 요청"
        description={
          target ? `${target.sellerName} · 송장 등록 전까지만 요청할 수 있어요` : undefined
        }
        help="판매자가 확인하면 배송지가 바뀌어요. 거절되면 원래 배송지로 보내요."
        submitLabel="변경 요청하기"
        submitting={submitting}
        onClose={close}
        onSave={(address) =>
          target && run(() => onAddressChangeRequest(target.shipmentId, address))
        }
      />
    </div>
  )
}
