import { RefundStatus } from '@/shared/api/refund'
import { OrderItemStatus } from '@/shared/api/types'
import type { ScreenPreview } from '@/shared/lib/screenPreview'
import {
  addressChangedShipment,
  cancelledShipment,
  completedShipment,
  delayedShipment,
  deliveredShipment,
  failedRefund,
  inquiries,
  inquiryTargets,
  myRefunds,
  orderDetails,
  orderSummaries,
  orderWithItemStatus,
  preparingShipment,
  processingRefund,
  remoteAreaOrder,
  shipmentSummaries,
  shippingShipment,
} from './fixtures'
import { InquiryType } from './types'
import { OrderDetailView, type OrderDetailViewProps } from './views/OrderDetailView'
import { OrderListView, type OrderListViewProps } from './views/OrderListView'
import { RefundListView, type RefundListViewProps } from './views/RefundListView'
import { ShipmentView, type ShipmentViewProps } from './views/ShipmentView'
import { SupportNotConnectedView, SupportView, type SupportViewProps } from './views/SupportView'

// /__design 화면 상태 갤러리 (개발 전용, app/dev만 import한다)

const noop = () => {}

const list = (props: Partial<OrderListViewProps> = {}) => (
  <OrderListView status="success" orders={orderSummaries} onRetry={noop} {...props} />
)

const detail = (props: Partial<OrderDetailViewProps> = {}) => (
  <OrderDetailView
    status="success"
    order={orderDetails[0]}
    onRetry={noop}
    onConfirm={noop}
    shipments={shipmentSummaries.slice(0, 1)}
    {...props}
  />
)

const status = (value: OrderItemStatus) => () => detail({ order: orderWithItemStatus(value) })

const resolved = async () => null
const order184Refunds = myRefunds.filter((r) => r.orderId === 184)

/** 주문 184(출고 전) + 취소 요청. 고구마는 승인 대기, 사과는 철회해서 다시 요청할 수 있다 */
const cancel = (props: Partial<OrderDetailViewProps> = {}) =>
  detail({
    order: orderWithItemStatus(OrderItemStatus.PREPARING),
    refunds: order184Refunds,
    onRequestCancel: resolved,
    onWithdrawRefund: noop,
    ...props,
  })

const refundList = (props: Partial<RefundListViewProps> = {}) => (
  <RefundListView
    status="success"
    refunds={[processingRefund, ...myRefunds]}
    onRetry={noop}
    onWithdraw={noop}
    {...props}
  />
)

const shipment = (props: Partial<ShipmentViewProps> = {}) => (
  <ShipmentView
    status="success"
    shipment={shippingShipment}
    onRetry={noop}
    onConfirm={noop}
    {...props}
  />
)

const support = (props: Partial<SupportViewProps> = {}) => (
  <SupportView
    orderId={93}
    targets={inquiryTargets}
    inquiries={inquiries}
    photos={[]}
    onAddPhotos={noop}
    onRemovePhoto={noop}
    onSubmit={noop}
    onWriteAnother={noop}
    replyEmail="seoyeon88@example.com"
    {...props}
  />
)

export const orderPreviews: ScreenPreview[] = [
  {
    id: 'orders',
    title: 'B-07 주문 내역',
    layout: 'public',
    path: '/orders',
    tabBar: true,
    states: [
      { id: 'all', label: '전체', render: () => list() },
      { id: 'empty', label: '빈 목록', render: () => list({ orders: [] }) },
      { id: 'more', label: '더 보기', render: () => list({ hasMore: true, onLoadMore: noop }) },
      { id: 'loading', label: '로딩', render: () => list({ status: 'pending' }) },
      { id: 'error', label: '불러오기 실패', render: () => list({ status: 'error' }) },
    ],
  },
  {
    id: 'order-detail',
    title: 'B-08 주문 상세',
    layout: 'public',
    path: '/orders/184',
    states: [
      { id: 'preparing', label: '상품 준비 중', render: status(OrderItemStatus.PREPARING) },
      {
        id: 'cancel-available',
        label: '출고 전 취소 요청 가능',
        render: () => cancel({ refunds: [] }),
      },
      { id: 'cancel-refunds', label: '취소 요청 (승인 대기 · 철회)', render: () => cancel() },
      {
        id: 'cancel-modal',
        label: '취소 요청 창',
        render: () => cancel({ refunds: [], defaultCancelItemId: 1841 }),
      },
      {
        id: 'cancel-processing',
        label: '취소 승인 · 환불 처리 중',
        render: () =>
          cancel({
            refunds: order184Refunds.map((r) =>
              r.status === RefundStatus.REQUESTED
                ? { ...r, status: RefundStatus.PROCESSING, decidedAt: '2026-10-18T16:00:00' }
                : r,
            ),
          }),
      },
      {
        id: 'cancel-failed',
        label: '취소 실패 · 다시 요청 가능',
        render: () => cancel({ refunds: [failedRefund] }),
      },
      {
        id: 'cancel-requested',
        label: '취소 요청됨',
        render: status(OrderItemStatus.CANCEL_REQUESTED),
      },
      { id: 'shipping', label: '배송 중', render: status(OrderItemStatus.SHIPPING) },
      { id: 'delivered', label: '배송 완료', render: status(OrderItemStatus.DELIVERED) },
      {
        id: 'confirmed',
        label: '구매확정 (리뷰 쓰기)',
        render: status(OrderItemStatus.PURCHASE_CONFIRMED),
      },
      { id: 'refunded', label: '환불 완료', render: status(OrderItemStatus.REFUNDED) },
      {
        id: 'canceled',
        label: '주문 취소 (결제 전 무산)',
        render: status(OrderItemStatus.CANCELED),
      },
      {
        id: 'payment-failed',
        label: '결제 실패',
        render: status(OrderItemStatus.PAYMENT_FAILED),
      },
      {
        id: 'remote-area',
        label: '도서산간 추가 운임',
        render: () => detail({ order: remoteAreaOrder }),
      },
      { id: 'loading', label: '로딩', render: () => detail({ status: 'pending' }) },
      { id: 'error', label: '불러오기 실패', render: () => detail({ status: 'error' }) },
      {
        id: 'not-found',
        label: '없는 주문',
        render: () => detail({ status: 'notFound', order: undefined }),
      },
    ],
  },
  {
    id: 'refunds',
    title: '취소 요청 내역',
    layout: 'mypage',
    path: '/orders/refunds',
    states: [
      { id: 'all', label: '전체 상태', render: () => refundList() },
      { id: 'empty', label: '빈 목록', render: () => refundList({ refunds: [] }) },
      {
        id: 'more',
        label: '더 보기',
        render: () => refundList({ hasMore: true, onLoadMore: noop }),
      },
      { id: 'loading', label: '로딩', render: () => refundList({ status: 'pending' }) },
      { id: 'error', label: '불러오기 실패', render: () => refundList({ status: 'error' }) },
    ],
  },
  {
    id: 'shipment',
    title: '배송 조회',
    layout: 'public',
    path: '/orders/151/shipments/3',
    states: [
      { id: 'shipping', label: '배송 중', render: () => shipment() },
      {
        id: 'delivered',
        label: '배송 완료 (구매확정)',
        render: () => shipment({ shipment: deliveredShipment }),
      },
      {
        id: 'completed',
        label: '거래 완료',
        render: () => shipment({ shipment: completedShipment }),
      },
      {
        id: 'preparing',
        label: '송장 등록 전',
        render: () => shipment({ shipment: preparingShipment }),
      },
      { id: 'delayed', label: '도착 지연', render: () => shipment({ shipment: delayedShipment }) },
      {
        id: 'cancelled',
        label: '배송 취소',
        render: () => shipment({ shipment: cancelledShipment }),
      },
      {
        id: 'address-changed',
        label: '배송지 변경 승인 (추가 운임)',
        render: () => shipment({ shipment: addressChangedShipment }),
      },
      { id: 'error', label: '불러오기 실패', render: () => shipment({ status: 'error' }) },
      { id: 'not-found', label: '없는 배송', render: () => shipment({ status: 'notFound' }) },
      { id: 'loading', label: '로딩', render: () => shipment({ status: 'pending' }) },
    ],
  },
  {
    id: 'support',
    title: '고객센터 문의 (❌ API 없음)',
    layout: 'public',
    path: '/orders/93/inquiry',
    states: [
      {
        id: 'not-connected',
        label: '연결 전 (지금 화면)',
        render: () => <SupportNotConnectedView orderId={93} />,
      },
      { id: 'form', label: '작성', render: () => support() },
      {
        id: 'photos',
        label: '사진 올리는 중',
        render: () =>
          support({
            photos: [
              { id: 'a', url: '', alt: '상자 사진' },
              { id: 'b', url: '', alt: '상품 사진', progress: 45 },
            ],
          }),
      },
      {
        id: 'too-big',
        label: '10MB 초과',
        render: () => support({ photoError: '사진은 10MB 이하로 올려 주세요' }),
      },
      {
        id: 'failed',
        label: '보내기 실패',
        render: () =>
          support({
            errorMessage:
              '일시적인 오류예요. 쓴 내용과 사진은 그대로 있으니 잠시 뒤 다시 보내 주세요.',
          }),
      },
      {
        id: 'done',
        label: '접수 완료',
        render: () =>
          support({
            completed: {
              inquiryNumber: 'CS-20261018-0051',
              productName: '해남 꿀고구마 베니하루카',
              type: InquiryType.DAMAGED,
              photoCount: 2,
            },
          }),
      },
      { id: 'no-history', label: '문의 내역 없음', render: () => support({ inquiries: [] }) },
    ],
  },
]
