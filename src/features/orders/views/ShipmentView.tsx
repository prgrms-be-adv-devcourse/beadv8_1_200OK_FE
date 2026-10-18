import { Alert, Anchor, Button, Skeleton, Stack, Timeline } from '@mantine/core'
import { CircleAlert, CircleX, Info, PackageSearch } from 'lucide-react'
import { Link } from 'react-router'
import { OrderItemStatus } from '@/shared/api/types'
import { AUTO_CONFIRM_DAYS } from '@/shared/lib/constants'
import { formatDate } from '@/shared/lib/format'
import { ShipmentState } from '@/shared/lib/shipmentState'
import {
  type BadgeStatus,
  FarmAvatar,
  PageHeader,
  ProgressSteps,
  QueryState,
  StatusBadge,
  showToast,
} from '@/shared/ui'
import { OrderItemRow } from '../components/OrderItemRow'
import { ShipmentStage, type ShipmentTracking } from '../types'
import classes from './ShipmentView.module.css'

// 배송 조회 /orders/:orderId/shipments/:shipmentId. 시안: b2c/ShipmentDetail, ShipmentDetailMobile
// 상태: 배송 중 · 배송 완료(자동 구매확정 안내) · 송장 등록 전 · 출고 지연(사유·새 출고 예정일) · 택배사 조회 실패
// TODO(api): 📝 GET /shipments/{shipmentId}. 택배사 이력 연동 방식은 백엔드와 정해야 한다.

export type ShipmentViewProps = {
  status: 'pending' | 'error' | 'notFound' | 'success'
  shipment?: ShipmentTracking
  /** 택배사 조회만 실패 (주문·송장 정보는 있음) */
  trackingFailed?: boolean
  onRetry?: () => void
  errorMessage?: string
}

const STEPS = ['상품 준비 중', '배송 중', '배송 완료']

const stepOf: Record<ShipmentStage, number> = {
  [ShipmentStage.PREPARING]: 0,
  [ShipmentStage.DELAYED]: 0,
  [ShipmentStage.SHIPPING]: 1,
  [ShipmentStage.DELIVERED]: 2,
}

const badgeOf: Record<ShipmentStage, BadgeStatus> = {
  [ShipmentStage.PREPARING]: OrderItemStatus.PREPARING,
  [ShipmentStage.DELAYED]: ShipmentState.DELAYED,
  [ShipmentStage.SHIPPING]: OrderItemStatus.SHIPPING,
  [ShipmentStage.DELIVERED]: OrderItemStatus.DELIVERED,
}

function headline(shipment: ShipmentTracking, failed: boolean): [string, string] {
  const tracking = `${shipment.carrier ?? ''} ${shipment.trackingNumber ?? ''}`.trim()
  if (failed) return ['배송 상태를 확인할 수 없어요', `송장은 등록돼 있어요 · ${tracking}`]
  switch (shipment.stage) {
    case ShipmentStage.SHIPPING:
      return [
        '상품이 배송 중이에요',
        shipment.estimatedArrival
          ? `${formatDate(shipment.estimatedArrival, 'monthDayWeek')} 도착 예정이에요`
          : '택배사가 도착 예정일을 알려 주면 보여 드려요',
      ]
    case ShipmentStage.DELIVERED:
      return [
        '배송이 완료됐어요',
        shipment.deliveredAt ? `${formatDate(shipment.deliveredAt, 'dateTime')}에 도착했어요` : '',
      ]
    case ShipmentStage.DELAYED:
      return [
        '출고가 늦어지고 있어요',
        shipment.delay
          ? `${formatDate(shipment.delay.newShipDate, 'monthDayWeek')} 출고 예정이에요 · 출고되면 도착 예정일을 알려 드려요`
          : '',
      ]
    case ShipmentStage.PREPARING:
      return ['판매자가 상품을 준비하고 있어요', '송장이 등록되면 도착 예정일을 알려 드려요']
  }
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

export function ShipmentView({
  status,
  shipment,
  trackingFailed = false,
  onRetry,
  errorMessage,
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
            action: { label: '주문 내역으로', to: '/orders' },
          }}
        />
      </div>
    )
  }

  const orderPath = `/orders/${shipment.orderId}`
  const [title, sub] = headline(shipment, trackingFailed)
  const hasInvoice = Boolean(shipment.trackingNumber)
  const delivered = shipment.stage === ShipmentStage.DELIVERED

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
      <p className={`pd-num ${classes.meta}`}>
        주문번호 {shipment.orderNumber} · {shipment.sellerName}
      </p>

      <div className={classes.layout}>
        <Stack gap="md">
          <section className={classes.card} aria-labelledby="shipment-headline">
            <div>
              <StatusBadge
                status={trackingFailed ? ShipmentState.TRACKING_FAILED : badgeOf[shipment.stage]}
              />
            </div>
            <h2 id="shipment-headline" className={classes.headline}>
              {title}
            </h2>
            {sub && <p className={`pd-num ${classes.sub}`}>{sub}</p>}

            {!trackingFailed && (
              <ProgressSteps
                steps={STEPS}
                current={stepOf[shipment.stage]}
                completed={delivered}
                label="배송 진행 단계"
              />
            )}

            {shipment.stage === ShipmentStage.DELAYED && shipment.delay && (
              <Alert color="warning" icon={<CircleAlert />} title="판매자가 출고 지연을 알렸어요">
                <Stack gap="xs">
                  <span className="pd-num">
                    {shipment.sellerName} · {formatDate(shipment.delay.notifiedAt, 'dateTime')} 알림
                  </span>
                  <dl className={classes.delay}>
                    <div>
                      <dt>지연 사유</dt>
                      <dd>{shipment.delay.reason}</dd>
                    </div>
                    <div>
                      <dt>새 출고 예정일</dt>
                      <dd className="pd-num">
                        <strong>{formatDate(shipment.delay.newShipDate, 'monthDayWeek')}</strong>
                      </dd>
                    </div>
                  </dl>
                  <span>
                    기다리기 어려우면 송장 등록 전까지{' '}
                    <Anchor component={Link} to={orderPath}>
                      주문 상세에서 취소를 요청
                    </Anchor>
                    할 수 있어요.
                  </span>
                </Stack>
              </Alert>
            )}

            {delivered && !trackingFailed && (
              <>
                <Alert
                  color="info"
                  icon={<Info />}
                  title={
                    shipment.autoConfirmAt
                      ? `${formatDate(shipment.autoConfirmAt, 'monthDay')}에 자동으로 구매확정돼요`
                      : '곧 자동으로 구매확정돼요'
                  }
                >
                  구매확정은 배송 완료 {AUTO_CONFIRM_DAYS}일 뒤 자동으로 돼요. 상품을 잘 받으셨다면{' '}
                  <Anchor component={Link} to={orderPath}>
                    주문 상세에서 먼저 구매확정
                  </Anchor>
                  할 수 있어요.
                </Alert>
                <p className={classes.support}>
                  상품에 문제가 있나요?{' '}
                  <Anchor component={Link} to={`${orderPath}/inquiry`}>
                    고객센터에 문의하기
                  </Anchor>
                </p>
              </>
            )}

            {trackingFailed && (
              <Alert
                color="error"
                icon={<CircleX />}
                title="배송 정보를 불러오지 못했어요"
                role="alert"
              >
                <Stack gap="sm" align="flex-start">
                  택배사 조회가 잠시 안 되고 있어요. 잠시 뒤 다시 시도하거나, 송장번호로 택배사에서
                  직접 조회해 주세요.
                  {onRetry && (
                    <Button variant="outline" size="sm" onClick={onRetry}>
                      다시 시도
                    </Button>
                  )}
                </Stack>
              </Alert>
            )}
          </section>

          {!trackingFailed && (
            <section className={classes.card} aria-labelledby="shipment-events">
              <div className={classes.cardHead}>
                <h2 id="shipment-events" className={classes.cardTitle}>
                  배송 이력
                </h2>
                <span className={classes.help}>택배사에서 받은 이력이에요 · 최신 순</span>
              </div>
              {shipment.events.length > 0 ? (
                <Timeline active={0} bulletSize={14} lineWidth={2} aria-label="배송 이력, 최신 순">
                  {shipment.events.map((event) => (
                    <Timeline.Item
                      key={`${event.at}-${event.status}`}
                      title={
                        <span className={classes.eventTitle}>
                          {event.status}
                          <span className={`pd-num ${classes.help}`}>
                            {formatDate(event.at, 'dateTime')}
                          </span>
                        </span>
                      }
                    >
                      <p className={classes.eventPlace}>{event.location}</p>
                      {event.description && <p className={classes.help}>{event.description}</p>}
                    </Timeline.Item>
                  ))}
                </Timeline>
              ) : (
                <div className={classes.noEvents}>
                  <strong>아직 배송 이력이 없어요</strong>
                  <span className={classes.help}>
                    판매자가 송장을 등록하면 택배사 이력이 이곳에 보여요.
                  </span>
                </div>
              )}
            </section>
          )}
        </Stack>

        <Stack gap="md">
          <section className={classes.card} aria-labelledby="shipment-info">
            <h2 id="shipment-info" className={classes.cardTitle}>
              배송 정보
            </h2>
            <div className={classes.seller}>
              <FarmAvatar name={shipment.sellerName} size={32} />
              <span className="pd-serif">{shipment.sellerName}</span>
            </div>
            {shipment.items.map((item) => (
              <OrderItemRow key={item.orderItemId} item={item} priceBelow />
            ))}
            <dl className={classes.kv}>
              <div>
                <dt>주문번호</dt>
                <dd className="pd-num">{shipment.orderNumber}</dd>
              </div>
              <div>
                <dt>주문일</dt>
                <dd className="pd-num">{formatDate(shipment.orderedAt, 'dateTime')}</dd>
              </div>
              {hasInvoice ? (
                <>
                  <div>
                    <dt>택배사</dt>
                    <dd>{shipment.carrier}</dd>
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
                </>
              ) : (
                <div>
                  <dt>송장</dt>
                  <dd>아직 등록 전이에요</dd>
                </div>
              )}
            </dl>
          </section>

          <section className={classes.card} aria-labelledby="shipment-address">
            <h2 id="shipment-address" className={classes.cardTitle}>
              배송지
            </h2>
            <dl className={classes.kv}>
              <div>
                <dt>받는 분</dt>
                <dd>{shipment.recipient.recipientName}</dd>
              </div>
              <div>
                <dt>주소</dt>
                <dd>{shipment.recipient.address}</dd>
              </div>
            </dl>
            <p className={classes.help}>
              {hasInvoice
                ? '송장이 등록돼 배송지를 바꿀 수 없어요'
                : '송장 등록 전까지 주문 상세에서 배송지 변경을 요청할 수 있어요'}
            </p>
          </section>
        </Stack>
      </div>
    </div>
  )
}
