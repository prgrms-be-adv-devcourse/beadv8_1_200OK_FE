import { Alert, Anchor, Button, Skeleton, Stack } from '@mantine/core'
import { CircleAlert, Info, PackageSearch } from 'lucide-react'
import { Link } from 'react-router'
import {
  type AddressChangeStatus,
  type ShipmentAddress,
  type ShipmentDetail,
  type ShipmentItem,
  ShipmentStatus,
} from '@/shared/api/types'
import { AUTO_CONFIRM_DAYS } from '@/shared/lib/constants'
import { formatAmount, formatDate } from '@/shared/lib/format'
import { carrierLabels } from '@/shared/lib/labels'
import {
  ShipmentState,
  shipmentBadgeStatus,
  shipmentStatusLabels,
} from '@/shared/lib/shipmentState'
import {
  PageHeader,
  PriceText,
  ProgressSteps,
  QueryState,
  StatusBadge,
  showToast,
} from '@/shared/ui'
import { ConfirmItemButton } from '../components/ConfirmItemButton'
import classes from './ShipmentView.module.css'

// 배송 조회 /orders/:orderId/shipments/:shipmentId. ✅ GET /shipments/{shipmentId} (BUYER)
// 상태 5종(준비 중·배송 중·배송 완료·거래 완료·취소) + 도착 지연 · 송장 · 배송지 · 상품별 구매확정 · 최근 배송지 변경 요청.
// 택배사 배송 이력(위치·시각)은 API가 주지 않아 그리지 않는다. 배송지 변경 요청 화면은 아직 없다(POST는 계약이 있다).

export type ShipmentViewProps = {
  status: 'pending' | 'error' | 'notFound' | 'success'
  shipment?: ShipmentDetail
  onRetry?: () => void
  errorMessage?: string
  /** 주문 상품 1건 구매확정. 없으면 버튼을 그리지 않는다 */
  onConfirm?: (orderItemId: number) => void
  /** 구매확정 요청 중인 주문 상품 */
  confirmingItemId?: number | null
}

const STEPS = ['상품 준비 중', '배송 중', '배송 완료', '거래 완료']

const stepOf: Record<ShipmentStatus, number> = {
  [ShipmentStatus.PREPARING]: 0,
  [ShipmentStatus.SHIPPING]: 1,
  [ShipmentStatus.DELIVERED]: 2,
  [ShipmentStatus.COMPLETED]: 3,
  [ShipmentStatus.CANCELLED]: 0,
}

const changeStatusLabels: Record<AddressChangeStatus, string> = {
  PENDING: '판매자가 확인하고 있어요',
  APPROVED: '판매자가 승인했어요',
  REJECTED: '판매자가 거절했어요',
}

const DAY_MS = 24 * 60 * 60 * 1000

function headline(shipment: ShipmentDetail): [string, string] {
  const range = `${formatDate(shipment.estimatedDeliveryStart, 'monthDayWeek')} ~ ${formatDate(shipment.estimatedDeliveryEnd, 'monthDayWeek')} 도착 예정이에요`
  switch (shipment.status) {
    case ShipmentStatus.PREPARING:
      return ['판매자가 상품을 준비하고 있어요', range]
    case ShipmentStatus.SHIPPING:
      return ['상품이 배송 중이에요', range]
    case ShipmentStatus.DELIVERED:
      return [
        '배송이 완료됐어요',
        shipment.deliveredAt ? `${formatDate(shipment.deliveredAt, 'dateTime')}에 도착했어요` : '',
      ]
    case ShipmentStatus.COMPLETED:
      return [
        '거래가 완료됐어요',
        shipment.completedAt ? `${formatDate(shipment.completedAt, 'dateTime')}에 완료됐어요` : '',
      ]
    case ShipmentStatus.CANCELLED:
      return [
        '배송이 취소됐어요',
        shipment.cancelledAt ? `${formatDate(shipment.cancelledAt, 'dateTime')}에 취소됐어요` : '',
      ]
  }
}

/** 배송 완료 시각 + AUTO_CONFIRM_DAYS일. 서버가 정한 규칙을 안내용으로만 계산한다 */
function autoConfirmDate(deliveredAt: string): string {
  return new Date(new Date(deliveredAt).getTime() + AUTO_CONFIRM_DAYS * DAY_MS).toISOString()
}

function ShipmentSkeleton() {
  return (
    <div className={classes.layout}>
      <Stack gap="md">
        <Skeleton h={200} radius="md" />
        <Skeleton h={260} radius="md" />
      </Stack>
      <Skeleton h={320} radius="md" />
    </div>
  )
}

async function copyTracking(value: string) {
  try {
    await navigator.clipboard.writeText(value.replace(/\s/g, ''))
    showToast({ message: '송장번호를 복사했어요' })
  } catch {
    showToast({ message: '복사하지 못했어요. 송장번호를 길게 눌러 복사해 주세요' })
  }
}

function AddressLines({ address }: { address: ShipmentAddress }) {
  return (
    <>
      <p className="pd-num">
        <strong>{address.recipientName}</strong> · {address.recipientPhone}
      </p>
      <p className="pd-num">
        ({address.postalCode}) {address.address}
        {address.addressDetail ? `, ${address.addressDetail}` : ''}
      </p>
      {address.deliveryNote && <p className={classes.help}>{address.deliveryNote}</p>}
    </>
  )
}

function ItemAction({
  item,
  shipment,
  onConfirm,
  confirming,
}: {
  item: ShipmentItem
  shipment: ShipmentDetail
  onConfirm?: (orderItemId: number) => void
  confirming: boolean
}) {
  if (item.confirmed) return <span className={classes.help}>구매확정했어요</span>
  const fullyCanceled = item.canceledQuantity >= item.quantity
  if (shipment.status !== ShipmentStatus.DELIVERED || fullyCanceled || !onConfirm) return null
  return (
    <ConfirmItemButton
      productName={item.productName}
      loading={confirming}
      onConfirm={() => onConfirm(item.orderItemId)}
    />
  )
}

export function ShipmentView({
  status,
  shipment,
  onRetry,
  errorMessage,
  onConfirm,
  confirmingItemId = null,
}: ShipmentViewProps) {
  const resolvedStatus = status === 'success' && !shipment ? 'notFound' : status

  if (resolvedStatus !== 'success' || !shipment) {
    return (
      <div className={classes.root}>
        <PageHeader title="배송 조회" backTo="/orders" />
        <QueryState
          status={resolvedStatus}
          skeleton={<ShipmentSkeleton />}
          loadingLabel="배송 정보를 불러오고 있어요"
          errorMessage={errorMessage}
          onRetry={onRetry}
          notFound={{
            icon: <PackageSearch />,
            title: '배송 정보를 찾을 수 없어요',
            description: '이미 지워졌거나 내 배송이 아니에요. 주문 내역에서 다시 골라 주세요.',
            action: { label: '주문 내역으로', to: '/orders' },
          }}
        />
      </div>
    )
  }

  const orderPath = `/orders/${shipment.orderId}`
  const [title, sub] = headline(shipment)
  const cancelled = shipment.status === ShipmentStatus.CANCELLED
  const active =
    shipment.status === ShipmentStatus.PREPARING || shipment.status === ShipmentStatus.SHIPPING
  const delayed = shipment.delayed && active
  const change = shipment.latestAddressChange

  return (
    <div className={classes.root}>
      <PageHeader
        title="배송 조회"
        backTo={orderPath}
        breadcrumbs={[
          { label: '주문 내역', to: '/orders' },
          { label: '주문 상세', to: orderPath },
          { label: '배송 조회' },
        ]}
        actions={
          <Button component={Link} to={orderPath} variant="subtle">
            주문 상세로
          </Button>
        }
      />
      <p className={`pd-num ${classes.meta}`}>주문번호 {shipment.orderId}</p>

      <div className={classes.layout}>
        <Stack gap="md">
          <section className={classes.card} aria-labelledby="shipment-headline">
            <div>
              <StatusBadge
                status={delayed ? ShipmentState.DELAYED : shipmentBadgeStatus(shipment.status)}
              />
            </div>
            <h2 id="shipment-headline" className={classes.headline}>
              {title}
            </h2>
            {sub && <p className={`pd-num ${classes.sub}`}>{sub}</p>}

            {!cancelled && (
              <ProgressSteps
                steps={STEPS}
                current={stepOf[shipment.status]}
                completed={shipment.status === ShipmentStatus.COMPLETED}
                label="배송 진행 단계"
              />
            )}

            {delayed && (
              <Alert color="warning" icon={<CircleAlert />} title="도착 예정일이 지났어요">
                <Stack gap="xs">
                  <span>
                    예정보다 늦어지고 있어요. 기다리기 어려우면{' '}
                    <Anchor component={Link} to={orderPath}>
                      주문 상세
                    </Anchor>
                    에서 상태를 확인해 주세요.
                  </span>
                </Stack>
              </Alert>
            )}

            {shipment.status === ShipmentStatus.DELIVERED && (
              <Alert
                color="info"
                icon={<Info />}
                title={
                  shipment.deliveredAt
                    ? `${formatDate(autoConfirmDate(shipment.deliveredAt), 'monthDay')}에 자동으로 구매확정돼요`
                    : '곧 자동으로 구매확정돼요'
                }
              >
                구매확정은 배송 완료 {AUTO_CONFIRM_DAYS}일 뒤 자동으로 돼요. 상품을 잘 받으셨다면
                아래 상품에서 먼저 구매확정할 수 있어요.
              </Alert>
            )}
          </section>

          <section className={classes.card} aria-labelledby="shipment-items">
            <h2 id="shipment-items" className={classes.cardTitle}>
              상품
            </h2>
            <ul className={classes.items}>
              {shipment.items.map((item) => (
                <li key={item.orderItemId} className={classes.item}>
                  <div className={classes.itemBody}>
                    <strong>{item.productName}</strong>
                    <span className={`pd-num ${classes.help}`}>
                      {item.optionName ? `${item.optionName} · ` : ''}
                      {formatAmount(item.quantity)}개
                      {item.canceledQuantity > 0
                        ? ` · ${formatAmount(item.canceledQuantity)}개 취소`
                        : ''}
                    </span>
                    <PriceText amount={item.unitPrice * item.quantity} size="S" />
                  </div>
                  <div className={classes.itemAction}>
                    <ItemAction
                      item={item}
                      shipment={shipment}
                      onConfirm={onConfirm}
                      confirming={confirmingItemId === item.orderItemId}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </Stack>

        <Stack gap="md">
          <section className={classes.card} aria-labelledby="shipment-info">
            <h2 id="shipment-info" className={classes.cardTitle}>
              배송 정보
            </h2>
            <dl className={classes.kv}>
              <div>
                <dt>상태</dt>
                <dd>{shipmentStatusLabels[shipment.status]}</dd>
              </div>
              {shipment.status === ShipmentStatus.PREPARING && (
                <div>
                  <dt>출고 예정</dt>
                  <dd className="pd-num">
                    {formatDate(shipment.estimatedShipDate, 'monthDayWeek')}
                  </dd>
                </div>
              )}
              <div>
                <dt>도착 예정</dt>
                <dd className="pd-num">
                  {formatDate(shipment.estimatedDeliveryStart, 'monthDayWeek')} ~{' '}
                  {formatDate(shipment.estimatedDeliveryEnd, 'monthDayWeek')}
                </dd>
              </div>
              {shipment.trackingNumber ? (
                <>
                  <div>
                    <dt>택배사</dt>
                    <dd>{shipment.carrier ? carrierLabels[shipment.carrier] : '–'}</dd>
                  </div>
                  <div>
                    <dt>송장번호</dt>
                    <dd className={classes.tracking}>
                      <strong className="pd-num">{shipment.trackingNumber}</strong>
                      <Button
                        variant="subtle"
                        size="sm"
                        aria-label="송장번호 복사"
                        onClick={() => copyTracking(shipment.trackingNumber ?? '')}
                      >
                        복사
                      </Button>
                    </dd>
                  </div>
                  {shipment.shippedAt && (
                    <div>
                      <dt>출고</dt>
                      <dd className="pd-num">{formatDate(shipment.shippedAt, 'dateTime')}</dd>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <dt>송장</dt>
                  <dd>아직 등록 전이에요</dd>
                </div>
              )}
              <div>
                <dt>결제한 배송비</dt>
                <dd>
                  <PriceText amount={shipment.chargedShippingFee} size="S" />
                </dd>
              </div>
              {shipment.additionalShippingFee > 0 && (
                <div>
                  <dt>배송지 변경 추가 운임</dt>
                  <dd>
                    <PriceText amount={shipment.additionalShippingFee} size="S" />
                  </dd>
                </div>
              )}
            </dl>
            {shipment.additionalShippingFee > 0 && (
              <p className={classes.help}>
                추가 운임은 앱에서 결제하지 않고, 판매자에게 직접 내는 금액이에요.
              </p>
            )}
          </section>

          <section className={classes.card} aria-labelledby="shipment-address">
            <h2 id="shipment-address" className={classes.cardTitle}>
              배송지
            </h2>
            <AddressLines address={shipment.address} />
            {shipment.status === ShipmentStatus.PREPARING ? null : (
              <p className={classes.help}>송장이 등록돼 배송지를 바꿀 수 없어요</p>
            )}
          </section>

          {change && (
            <section className={classes.card} aria-labelledby="shipment-change">
              <h2 id="shipment-change" className={classes.cardTitle}>
                최근 배송지 변경 요청
              </h2>
              <p>
                <strong>{changeStatusLabels[change.status]}</strong>
                <span className={`pd-num ${classes.help}`}>
                  {' '}
                  · {formatDate(change.requestedAt, 'dateTime')} 요청
                </span>
              </p>
              <AddressLines address={change.requestedAddress} />
              {change.additionalFeeNotice > 0 && (
                <p className={classes.help}>
                  바꾸면 추가 운임 {formatAmount(change.additionalFeeNotice)}원이 늘어요. 판매자에게
                  직접 내는 금액이에요.
                </p>
              )}
              {change.rejectReason && (
                <p className={classes.help}>거절 사유: {change.rejectReason}</p>
              )}
            </section>
          )}
        </Stack>
      </div>
    </div>
  )
}
