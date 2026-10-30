import { Alert, Badge, Button, Pagination, Skeleton, Stack, Table } from '@mantine/core'
import { Info, MapPinned, ReceiptText } from 'lucide-react'
import { type SellerShipmentSummary, ShipmentStatus } from '@/shared/api/types'
import { formatAmount, formatDate } from '@/shared/lib/format'
import { carrierLabels, regionGroupLabels } from '@/shared/lib/labels'
import { ShipmentState, shipmentBadgeStatus } from '@/shared/lib/shipmentState'
import { PageHeader, QueryState, StatusBadge } from '@/shared/ui'
import classes from './SellerOrdersView.module.css'

// S-06 주문 · 출고 /seller/orders. 시안: seller/SellerOrders, SellerOrdersMobile
// 한 줄 = 배송 1건(한 주문에서 이 농가로 온 상품 묶음). 출고 전(PREPARING)에는 송장 등록 · 배송지 변경 요청 승인·거절.
// ✅ GET /seller/shipments?page(25건 고정, 서버 필터 없음 → 상태 탭 대신 쪽 넘김만), 송장 POST …/dispatch, 배송지 변경 PATCH — 모달은 components/OrderModals.
// TODO(api): ❌ 구매자 닉네임·상품 금액이 목록에 없어 열을 뺐다. ❌ 출고 지연 알리기 · 판매자 취소 API 없음 → 안내만 둔다. 📝 취소 요청(클레임)은 /seller/claims(연결 전).

export type SellerOrdersViewProps = {
  status: 'pending' | 'error' | 'success'
  shipments: SellerShipmentSummary[]
  /** 0부터 */
  page: number
  totalPages: number
  totalElements: number
  onPageChange: (page: number) => void
  onRegisterInvoice: (shipment: SellerShipmentSummary) => void
  onOpenAddressChange: (shipment: SellerShipmentSummary) => void
  onRetry?: () => void
}

const productText = (shipment: SellerShipmentSummary) =>
  `${shipment.representativeProductName}${shipment.otherItemCount > 0 ? ` 외 ${shipment.otherItemCount}건` : ''}`

export function SellerOrdersView({
  status,
  shipments,
  page,
  totalPages,
  totalElements,
  onPageChange,
  onRegisterInvoice,
  onOpenAddressChange,
  onRetry,
}: SellerOrdersViewProps) {
  const preparing = (shipment: SellerShipmentSummary) =>
    shipment.status === ShipmentStatus.PREPARING

  const statusCell = (shipment: SellerShipmentSummary) => (
    <div className={classes.badges}>
      <StatusBadge
        status={
          shipment.delayed && shipment.status !== ShipmentStatus.COMPLETED
            ? ShipmentState.DELAYED
            : shipmentBadgeStatus(shipment.status)
        }
      />
      {shipment.addressChangePending && preparing(shipment) && (
        <Badge
          component="button"
          type="button"
          color="warning"
          leftSection={<MapPinned aria-hidden="true" />}
          className={classes.linkBadge}
          aria-label={`주문 ${shipment.orderId} 배송지 변경 요청 확인`}
          onClick={() => onOpenAddressChange(shipment)}
        >
          배송지 변경 요청
        </Badge>
      )}
    </div>
  )

  const actionCell = (shipment: SellerShipmentSummary) => {
    if (preparing(shipment)) {
      return (
        <div className={classes.actions}>
          <Button
            size="sm"
            aria-label={`주문 ${shipment.orderId} 송장 등록`}
            onClick={() => onRegisterInvoice(shipment)}
          >
            송장 등록
          </Button>
        </div>
      )
    }
    return (
      <div className={classes.actions}>
        {shipment.trackingNumber && (
          <span className="pd-num">
            {shipment.carrier ? carrierLabels[shipment.carrier] : ''} {shipment.trackingNumber}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={classes.root}>
      <PageHeader title="주문·출고 관리" hideOnMobile />

      <Alert color="info" icon={<Info />}>
        한 줄은 한 주문에서 이 농가로 온 상품 묶음이에요. 송장을 등록하면 구매자는 더 이상 취소할 수
        없어요. 출고 지연 알리기와 판매자 취소는 아직 연결되지 않았어요.
      </Alert>

      <QueryState
        status={status === 'success' && shipments.length === 0 ? 'empty' : status}
        skeleton={
          <Stack gap="xs">
            {[1, 2, 3, 4].map((n) => (
              <Skeleton key={n} h={72} />
            ))}
          </Stack>
        }
        loadingLabel="주문을 불러오고 있어요"
        onRetry={onRetry}
        empty={{
          icon: <ReceiptText />,
          title: '출고할 주문이 없어요',
          description: '새 주문이 들어오면 이곳에 보여요.',
        }}
      >
        <div className={classes.tableWrap}>
          <Table aria-label="주문 목록" verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>주문</Table.Th>
                <Table.Th>받는 분</Table.Th>
                <Table.Th>상품</Table.Th>
                <Table.Th>지역</Table.Th>
                <Table.Th>출고 예정</Table.Th>
                <Table.Th>상태</Table.Th>
                <Table.Th>처리</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {shipments.map((shipment) => (
                <Table.Tr key={shipment.shipmentId}>
                  <Table.Td>
                    <strong className="pd-num">{shipment.orderId}</strong>
                    <div className={`pd-num ${classes.help}`}>
                      {formatDate(shipment.createdAt, 'dateTime')}
                    </div>
                  </Table.Td>
                  <Table.Td>{shipment.recipientName}</Table.Td>
                  <Table.Td>{productText(shipment)}</Table.Td>
                  <Table.Td>{regionGroupLabels[shipment.regionGroup]}</Table.Td>
                  <Table.Td className="pd-num">
                    {formatDate(shipment.estimatedShipDate, 'monthDayWeek')}
                  </Table.Td>
                  <Table.Td>{statusCell(shipment)}</Table.Td>
                  <Table.Td>{actionCell(shipment)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>

        <ul className={classes.list} aria-label="주문 목록">
          {shipments.map((shipment) => (
            <li key={shipment.shipmentId} className={classes.item}>
              <div className={classes.itemHead}>
                <strong className="pd-num">주문 {shipment.orderId}</strong>
                <span className={`pd-num ${classes.help}`}>
                  {formatDate(shipment.createdAt, 'dateTime')}
                </span>
              </div>
              {statusCell(shipment)}
              <div className={classes.itemMain}>
                <span>{productText(shipment)}</span>
              </div>
              <span className={classes.help}>
                {shipment.recipientName} · {regionGroupLabels[shipment.regionGroup]} · 출고 예정{' '}
                <span className="pd-num">
                  {formatDate(shipment.estimatedShipDate, 'monthDayWeek')}
                </span>
              </span>
              {actionCell(shipment)}
            </li>
          ))}
        </ul>

        {totalPages > 1 && (
          <nav className={classes.pager} aria-label="주문 목록 쪽 이동">
            <Pagination
              value={page + 1}
              onChange={(next) => onPageChange(next - 1)}
              total={totalPages}
              getControlProps={(control) => ({
                'aria-label': {
                  first: '첫 쪽',
                  previous: '이전 쪽',
                  next: '다음 쪽',
                  last: '마지막 쪽',
                }[control],
              })}
            />
            <span className={`pd-num ${classes.help}`}>전체 {formatAmount(totalElements)}건</span>
          </nav>
        )}
      </QueryState>
    </div>
  )
}
