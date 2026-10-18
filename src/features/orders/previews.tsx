import { OrderItemStatus } from '@/shared/api/types'
import type { ScreenPreview } from '@/shared/lib/screenPreview'
import {
  delayedTracking,
  deliveredTracking,
  inquiries,
  inquiryTargets,
  orderDetails,
  orderSummaries,
  orderWithStatus,
  preparingTracking,
  shippingTracking,
} from './fixtures'
import { filterOrders } from './pages/OrderListPage'
import { InquiryType, OrderFilter } from './types'
import { OrderDetailView, type OrderDetailViewProps } from './views/OrderDetailView'
import { OrderListView, type OrderListViewProps } from './views/OrderListView'
import { ShipmentView, type ShipmentViewProps } from './views/ShipmentView'
import { SupportView, type SupportViewProps } from './views/SupportView'

// /__design 화면 상태 갤러리 (개발 전용, app/dev만 import한다)

const noop = () => {}

const list = (props: Partial<OrderListViewProps> = {}) => (
  <OrderListView
    status="success"
    orders={orderSummaries}
    filter={OrderFilter.ALL}
    onFilterChange={noop}
    onRetry={noop}
    {...props}
  />
)

const detail = (props: Partial<OrderDetailViewProps> = {}) => (
  <OrderDetailView
    status="success"
    order={orderDetails[0]}
    onCancelRequest={noop}
    onWithdraw={noop}
    onConfirm={noop}
    onAddressChangeRequest={noop}
    onRetry={noop}
    {...props}
  />
)

const status = (value: OrderItemStatus) => () => detail({ order: orderWithStatus(value) })

const shipment = (props: Partial<ShipmentViewProps> = {}) => (
  <ShipmentView status="success" shipment={shippingTracking} onRetry={noop} {...props} />
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
      {
        id: 'in-progress',
        label: '진행 중',
        render: () =>
          list({
            filter: OrderFilter.IN_PROGRESS,
            orders: filterOrders(orderSummaries, OrderFilter.IN_PROGRESS),
          }),
      },
      {
        id: 'canceled-empty',
        label: '필터 결과 없음',
        render: () => list({ filter: OrderFilter.CANCELED, orders: [] }),
      },
      { id: 'empty', label: '빈 목록', render: () => list({ orders: [] }) },
      { id: 'more', label: '더 보기', render: () => list({ hasMore: true, onLoadMore: noop }) },
      { id: 'loading', label: '로딩', render: () => list({ status: 'pending' }) },
      { id: 'error', label: '불러오기 실패', render: () => list({ status: 'error' }) },
    ],
  },
  {
    id: 'order-detail',
    title: 'B-08 · B-09 주문 상세 · 취소 · 구매확정',
    layout: 'public',
    path: '/orders/184',
    states: [
      { id: 'preparing', label: '상품 준비 중', render: status(OrderItemStatus.PREPARING) },
      {
        id: 'cancel-modal',
        label: '취소 요청 모달',
        render: () => detail({ defaultModal: { type: 'cancel', shipmentId: 1 } }),
      },
      {
        id: 'already-shipped',
        label: '이미 출고됨 오류',
        render: () =>
          detail({
            defaultModal: { type: 'cancel', shipmentId: 1 },
            cancelError: {
              title: '이미 출고된 상품은 취소할 수 없어요',
              message: '판매자가 방금 송장을 등록했어요.',
            },
          }),
      },
      {
        id: 'cancel-requested',
        label: '취소 요청됨 (철회)',
        render: status(OrderItemStatus.CANCEL_REQUESTED),
      },
      {
        id: 'address-requested',
        label: '배송지 변경 요청 중',
        render: () =>
          detail({
            order: orderWithStatus(OrderItemStatus.PREPARING, { addressChangeRequested: true }),
          }),
      },
      {
        id: 'address-modal',
        label: '배송지 변경 요청 모달',
        render: () => detail({ defaultModal: { type: 'address', shipmentId: 1 } }),
      },
      { id: 'shipping', label: '배송 중', render: status(OrderItemStatus.SHIPPING) },
      { id: 'delivered', label: '배송 완료', render: status(OrderItemStatus.DELIVERED) },
      {
        id: 'confirm-modal',
        label: '구매확정 모달',
        render: () =>
          detail({
            order: orderWithStatus(OrderItemStatus.DELIVERED),
            defaultModal: { type: 'confirm', shipmentId: 1 },
          }),
      },
      {
        id: 'confirmed',
        label: '구매확정 (리뷰 쓰기)',
        render: status(OrderItemStatus.PURCHASE_CONFIRMED),
      },
      { id: 'canceled', label: '취소 완료', render: status(OrderItemStatus.CANCELED) },
      { id: 'loading', label: '로딩', render: () => detail({ status: 'pending' }) },
      {
        id: 'not-found',
        label: '없는 주문',
        render: () => detail({ status: 'notFound', order: undefined }),
      },
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
        label: '배송 완료',
        render: () => shipment({ shipment: deliveredTracking }),
      },
      {
        id: 'preparing',
        label: '송장 등록 전',
        render: () => shipment({ shipment: preparingTracking }),
      },
      { id: 'delayed', label: '출고 지연', render: () => shipment({ shipment: delayedTracking }) },
      { id: 'failed', label: '조회 실패', render: () => shipment({ trackingFailed: true }) },
      { id: 'loading', label: '로딩', render: () => shipment({ status: 'pending' }) },
    ],
  },
  {
    id: 'support',
    title: '고객센터 문의',
    layout: 'public',
    path: '/orders/93/inquiry',
    states: [
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
