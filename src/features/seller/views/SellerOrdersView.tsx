import { ActionIcon, Alert, Badge, Button, Menu, Skeleton, Stack, Table, Tabs } from '@mantine/core'
import { Info, MapPinned, MoreHorizontal, ReceiptText, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { OrderItemStatus } from '@/shared/api/types'
import { formatAmount, formatDate } from '@/shared/lib/format'
import { carrierLabels } from '@/shared/lib/labels'
import { NotConnected, PageHeader, PriceText, QueryState, StatusBadge } from '@/shared/ui'
import {
  AddressRequestModal,
  type DelayInput,
  DelayModal,
  type InvoiceInput,
  InvoiceModal,
  type SellerCancelInput,
  SellerCancelModal,
} from '../components/OrderModals'
import { sellerOrderTabLabels } from '../labels'
import { type SellerOrderRow, SellerOrderTab } from '../types'
import classes from './SellerOrdersView.module.css'

// S-06 주문 · 출고 (출고 지연 포함) /seller/orders. 시안: seller/SellerOrders, SellerOrdersMobile
// 한 줄 = 한 주문에서 이 농가로 온 배송 묶음. 출고 대기에서 송장 등록 · 출고 지연 알리기 · 판매자 취소 · 배송지 변경 요청 승인.
// 처리 안 한 취소 요청이 있으면 송장 등록·지연을 막는다(C-10).
// ✅ 출고(송장) POST /seller/shipments/{id}/dispatch · 배송지 변경 승인·거절 PATCH — 모달 쪽(components/OrderModals) 참고.
// TODO(api): 📝 판매자 주문 목록 API가 없어 shipmentId를 받을 곳이 없다. 지연·판매자 취소도 ❌
//   → 라우트(/seller/orders)는 SellerOrdersNotConnectedView(연결 전)를 그리고, SellerOrdersView는 /__design 미리보기에서만 쓴다.

type MaybeAsync = unknown
type ModalType = 'invoice' | 'delay' | 'cancel' | 'address'

export type SellerOrdersViewProps = {
  status: 'pending' | 'error' | 'success'
  orders: SellerOrderRow[]
  tab: SellerOrderTab
  onTabChange: (tab: SellerOrderTab) => void
  counts: Record<SellerOrderTab, number>
  onRegisterInvoice: (shipmentId: number, input: InvoiceInput) => MaybeAsync
  onNotifyDelay: (shipmentId: number, input: DelayInput) => MaybeAsync
  onSellerCancel: (shipmentId: number, input: SellerCancelInput) => MaybeAsync
  onAnswerAddressChange: (shipmentId: number, approve: boolean) => MaybeAsync
  submitting?: boolean
  /** 출고 지연 날짜 검사 기준 (기본 지금) */
  today?: Date
  /** 처음부터 열어 둘 모달 (미리보기) */
  defaultModal?: { type: ModalType; shipmentId: number } | null
  onRetry?: () => void
}

const BLOCKED = '취소 요청을 먼저 처리해 주세요'

/** 라우트가 지금 그리는 모양. 제목 줄은 두고 본문만 연결 전으로 바꾼다 */
export function SellerOrdersNotConnectedView() {
  return (
    <div className={classes.root}>
      <PageHeader title="주문·출고 관리" hideOnMobile />
      <NotConnected api="📝 판매자 주문 목록 (출고 POST /seller/shipments/{shipmentId}/dispatch는 있으나 shipmentId를 받을 곳이 없음)" />
    </div>
  )
}

export function SellerOrdersView({
  status,
  orders,
  tab,
  onTabChange,
  counts,
  onRegisterInvoice,
  onNotifyDelay,
  onSellerCancel,
  onAnswerAddressChange,
  submitting = false,
  today = new Date(),
  defaultModal = null,
  onRetry,
}: SellerOrdersViewProps) {
  const [modal, setModal] = useState(defaultModal)
  const target = orders.find((o) => o.shipmentId === modal?.shipmentId) ?? null
  const close = () => setModal(null)
  const run = async (task: () => MaybeAsync) => {
    try {
      await task()
      close()
    } catch {
      // 실패하면 모달을 열어 둔다
    }
  }
  const open = (type: ModalType, order: SellerOrderRow) =>
    setModal({ type, shipmentId: order.shipmentId })

  const statusCell = (order: SellerOrderRow) => (
    <div className={classes.badges}>
      <StatusBadge status={order.status} />
      {order.cancelRequested && (
        <Badge
          component={Link}
          to="/seller/claims"
          color="warning"
          leftSection={<TriangleAlert aria-hidden="true" />}
          className={classes.linkBadge}
        >
          취소 요청
        </Badge>
      )}
      {order.addressChange && order.status === OrderItemStatus.PREPARING && (
        <Badge
          component="button"
          type="button"
          color="warning"
          leftSection={<MapPinned aria-hidden="true" />}
          className={classes.linkBadge}
          onClick={() => open('address', order)}
        >
          배송지 변경 요청
        </Badge>
      )}
      {order.delay && order.status === OrderItemStatus.PREPARING && (
        <Badge color="warning" variant="light" className={`pd-num ${classes.wrapBadge}`}>
          출고 지연 · {formatDate(order.delay.newShipDate, 'short')} 출고 예정
        </Badge>
      )}
    </div>
  )

  const actionCell = (order: SellerOrderRow) => {
    if (order.status === OrderItemStatus.PREPARING) {
      const blocked = order.cancelRequested
      return (
        <div className={classes.actions}>
          <div className={classes.actionRow}>
            <Button
              size="sm"
              disabled={blocked}
              aria-describedby={blocked ? `blocked-${order.shipmentId}` : undefined}
              onClick={() => open('invoice', order)}
            >
              송장 등록
            </Button>
            <Menu position="bottom-end">
              <Menu.Target>
                <ActionIcon aria-label={`${order.orderNumber} 다른 처리`}>
                  <MoreHorizontal size={20} aria-hidden="true" />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={() => open('cancel', order)}>판매자 취소</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>
          <Button
            variant="subtle"
            size="sm"
            disabled={blocked}
            onClick={() => open('delay', order)}
          >
            출고 지연 알리기
          </Button>
          {blocked && (
            <span id={`blocked-${order.shipmentId}`} className={classes.help}>
              {BLOCKED}
            </span>
          )}
        </div>
      )
    }
    return (
      <div className={classes.actions}>
        {order.trackingNumber && (
          <span className="pd-num">
            {order.carrier ? carrierLabels[order.carrier] : ''} {order.trackingNumber}
          </span>
        )}
        {order.note && <span className={`pd-num ${classes.help}`}>{order.note}</span>}
      </div>
    )
  }

  return (
    <div className={classes.root}>
      <PageHeader title="주문·출고 관리" hideOnMobile />

      <Tabs
        value={tab}
        onChange={(v) => onTabChange((v ?? SellerOrderTab.WAITING) as SellerOrderTab)}
      >
        <Tabs.List aria-label="배송 상태로 보기" className={classes.tabs}>
          {Object.values(SellerOrderTab).map((value) => (
            <Tabs.Tab key={value} value={value}>
              {sellerOrderTabLabels[value]}{' '}
              <span className="pd-num">{formatAmount(counts[value] ?? 0)}</span>
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      {tab === SellerOrderTab.WAITING && (
        <Alert color="info" icon={<Info />}>
          한 줄은 한 주문에서 이 농가로 온 상품 묶음이에요. 송장을 등록하면 구매자는 더 이상 취소할
          수 없어요.
        </Alert>
      )}

      <QueryState
        status={status === 'success' && orders.length === 0 ? 'empty' : status}
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
          title: `${sellerOrderTabLabels[tab]} 주문이 없어요`,
          description: '새 주문이 들어오면 이곳에 보여요.',
        }}
      >
        <div className={classes.tableWrap}>
          <Table aria-label="주문 목록" verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>주문</Table.Th>
                <Table.Th>구매자</Table.Th>
                <Table.Th>상품·옵션·수량</Table.Th>
                <Table.Th>배송지</Table.Th>
                <Table.Th className={classes.right}>상품 금액</Table.Th>
                <Table.Th>상태</Table.Th>
                <Table.Th>처리</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {orders.map((order) => (
                <Table.Tr key={order.shipmentId}>
                  <Table.Td>
                    <strong className="pd-num">{order.orderNumber}</strong>
                    <div className={`pd-num ${classes.help}`}>
                      {formatDate(order.orderedAt, 'dateTime')}
                    </div>
                  </Table.Td>
                  <Table.Td>{order.buyerNickname}</Table.Td>
                  <Table.Td>
                    {order.productName}
                    <div className={`pd-num ${classes.help}`}>{order.itemText}</div>
                  </Table.Td>
                  <Table.Td className={classes.address}>{order.address}</Table.Td>
                  <Table.Td className={classes.right}>
                    <PriceText amount={order.amount} size="S" />
                  </Table.Td>
                  <Table.Td>{statusCell(order)}</Table.Td>
                  <Table.Td>{actionCell(order)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>

        <ul className={classes.list} aria-label="주문 목록">
          {orders.map((order) => (
            <li key={order.shipmentId} className={classes.item}>
              <div className={classes.itemHead}>
                <strong className="pd-num">{order.orderNumber}</strong>
                <span className={`pd-num ${classes.help}`}>
                  {formatDate(order.orderedAt, 'dateTime')}
                </span>
              </div>
              {statusCell(order)}
              <div className={classes.itemMain}>
                <span>
                  {order.productName}{' '}
                  <span className={`pd-num ${classes.help}`}>{order.itemText}</span>
                </span>
                <PriceText amount={order.amount} size="S" />
              </div>
              <span className={classes.help}>
                {order.buyerNickname} · {order.address}
              </span>
              {actionCell(order)}
            </li>
          ))}
        </ul>
      </QueryState>

      <InvoiceModal
        order={modal?.type === 'invoice' ? target : null}
        onClose={close}
        submitting={submitting}
        onSubmit={(input) => target && run(() => onRegisterInvoice(target.shipmentId, input))}
      />
      <DelayModal
        order={modal?.type === 'delay' ? target : null}
        today={today}
        onClose={close}
        submitting={submitting}
        onSubmit={(input) => target && run(() => onNotifyDelay(target.shipmentId, input))}
      />
      <SellerCancelModal
        order={modal?.type === 'cancel' ? target : null}
        onClose={close}
        submitting={submitting}
        onSubmit={(input) => target && run(() => onSellerCancel(target.shipmentId, input))}
      />
      <AddressRequestModal
        order={modal?.type === 'address' ? target : null}
        onClose={close}
        submitting={submitting}
        onAnswer={(approve) =>
          target && run(() => onAnswerAddressChange(target.shipmentId, approve))
        }
      />
    </div>
  )
}
