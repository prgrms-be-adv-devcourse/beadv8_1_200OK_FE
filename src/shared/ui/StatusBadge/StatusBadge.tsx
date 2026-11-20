import { Badge, type BadgeProps } from '@mantine/core'
import {
  BadgeCheck,
  CircleCheck,
  CirclePause,
  CircleX,
  Clock,
  Hourglass,
  Loader,
  Lock,
  type LucideIcon,
  Package,
  RotateCcw,
  TriangleAlert,
  Truck,
} from 'lucide-react'
import { RefundStatus } from '@/shared/api/refund'
import { OrderItemStatus, OrderStatus, ProductStatus } from '@/shared/api/types'
import { ChargeReviewState, chargeReviewStateLabels } from '@/shared/lib/chargeReviewState'
import { orderItemStatusLabels, orderStatusLabels, productStatusLabels } from '@/shared/lib/labels'
import { PayoutBlockStatus, payoutBlockStatusLabels } from '@/shared/lib/payoutBlockState'
import {
  OptionStockState,
  optionStockStateLabels,
  ProductSaleState,
  productSaleStateLabels,
} from '@/shared/lib/productState'
import { refundStatusLabels } from '@/shared/lib/refundState'
import {
  SellerApplicationStatus,
  sellerApplicationStatusLabels,
} from '@/shared/lib/sellerApplicationState'
import { ShipmentState, shipmentStateLabels } from '@/shared/lib/shipmentState'
import { WithdrawalState, withdrawalStateLabels } from '@/shared/lib/withdrawalState'
import type { StatusTone } from '@/shared/styles/variantColorResolver'

// 상태값 → 배지(색 · 아이콘 · 문구) 매핑은 이 파일 한 곳에서만 정한다. 색만으로 상태를 전달하지 않는다.
// 시안: design/screens/common/Components.dc.html ‘배지 · 산지 꼬리표’

export type BadgeStatus =
  | OrderItemStatus
  | ProductSaleState
  | ShipmentState
  | WithdrawalState
  | SellerApplicationStatus
  | PayoutBlockStatus
  | OptionStockState
  | ChargeReviewState

type BadgeSpec = { tone: StatusTone; icon: LucideIcon | null; label: string }

const labels: Record<BadgeStatus, string> = {
  ...orderItemStatusLabels,
  ...productSaleStateLabels,
  ...shipmentStateLabels,
  ...withdrawalStateLabels,
  ...sellerApplicationStatusLabels,
  ...payoutBlockStatusLabels,
  ...optionStockStateLabels,
  ...chargeReviewStateLabels,
}

const looks: Record<BadgeStatus, Omit<BadgeSpec, 'label'>> = {
  // 주문 상품 상태 9종
  [OrderItemStatus.PAYMENT_PENDING]: { tone: 'warning', icon: Clock },
  [OrderItemStatus.PAYMENT_FAILED]: { tone: 'error', icon: CircleX },
  [OrderItemStatus.CANCELED]: { tone: 'neutral', icon: RotateCcw },
  [OrderItemStatus.PREPARING]: { tone: 'neutral', icon: Package },
  [OrderItemStatus.SHIPPING]: { tone: 'info', icon: Truck },
  [OrderItemStatus.DELIVERED]: { tone: 'success', icon: CircleCheck },
  [OrderItemStatus.PURCHASE_CONFIRMED]: { tone: 'primary', icon: BadgeCheck },
  [OrderItemStatus.CANCEL_REQUESTED]: { tone: 'warning', icon: TriangleAlert },
  [OrderItemStatus.REFUNDED]: { tone: 'neutral', icon: RotateCcw },
  // 상품 판매 상태(구매자 화면) + 판매자 정지
  [ProductSaleState.UPCOMING]: { tone: 'neutral', icon: Clock },
  [ProductSaleState.SOLD_OUT]: { tone: 'neutral', icon: Clock },
  [ProductSaleState.PAUSED]: { tone: 'neutral', icon: CirclePause },
  [ProductSaleState.ENDED]: { tone: 'neutral', icon: null },
  [ProductSaleState.SELLER_SUSPENDED]: { tone: 'warning', icon: TriangleAlert },
  // 배송 묶음 표시 상태
  [ShipmentState.DELAYED]: { tone: 'warning', icon: Clock },
  [ShipmentState.COMPLETED]: { tone: 'primary', icon: BadgeCheck },
  [ShipmentState.CANCELLED]: { tone: 'neutral', icon: CircleX },
  // 판매자 출금
  [WithdrawalState.REQUESTED]: { tone: 'neutral', icon: Clock },
  [WithdrawalState.PROCESSING]: { tone: 'info', icon: Loader },
  [WithdrawalState.COMPLETED]: { tone: 'success', icon: CircleCheck },
  [WithdrawalState.FAILED]: { tone: 'error', icon: CircleX },
  // 판매자 신청·심사 (신청 현황 · 관리자 심사 목록)
  [SellerApplicationStatus.PENDING]: { tone: 'warning', icon: Clock },
  [SellerApplicationStatus.IN_REVIEW]: { tone: 'info', icon: Hourglass },
  [SellerApplicationStatus.APPROVED]: { tone: 'success', icon: CircleCheck },
  [SellerApplicationStatus.REJECTED]: { tone: 'error', icon: CircleX },
  // 정산이 막힌 주문 (관리자 정산 관리)
  [PayoutBlockStatus.LOCKED]: { tone: 'error', icon: Lock },
  [PayoutBlockStatus.STOPPED]: { tone: 'warning', icon: CirclePause },
  [PayoutBlockStatus.RESOLVED]: { tone: 'success', icon: CircleCheck },
  // 상품 상세 옵션 재고 (품절 임박, 수량 없음)
  [OptionStockState.LOW_STOCK]: { tone: 'warning', icon: TriangleAlert },
  // 관리자 충전 건 처리 (멈춘 충전 건 목록 · 상세)
  [ChargeReviewState.HELD]: { tone: 'warning', icon: CirclePause },
  [ChargeReviewState.CANCEL_UNCONFIRMED]: { tone: 'error', icon: TriangleAlert },
  [ChargeReviewState.AWAITING_CANCEL]: { tone: 'error', icon: TriangleAlert },
  [ChargeReviewState.CHECKING]: { tone: 'info', icon: Loader },
  [ChargeReviewState.PENDING]: { tone: 'neutral', icon: Clock },
  [ChargeReviewState.COMPLETED]: { tone: 'success', icon: CircleCheck },
  [ChargeReviewState.FAILED]: { tone: 'neutral', icon: CircleX },
  [ChargeReviewState.PAYMENT_CANCELED]: { tone: 'neutral', icon: RotateCcw },
}

export function getStatusBadgeSpec(status: BadgeStatus): BadgeSpec {
  return { ...looks[status], label: labels[status] }
}

export type StatusBadgeProps = Omit<BadgeProps, 'color' | 'leftSection' | 'children'> & {
  status: BadgeStatus
  /** span으로 그린다. 버튼(옵션 카드)처럼 div를 둘 수 없는 곳 안에 둘 때 */
  inline?: boolean
}

export function StatusBadge({ status, inline = false, ...props }: StatusBadgeProps) {
  const { tone, icon: Icon, label } = getStatusBadgeSpec(status)
  return (
    <Badge
      component={inline ? 'span' : 'div'}
      color={tone}
      leftSection={Icon ? <Icon aria-hidden="true" /> : undefined}
      {...props}
    >
      {label}
    </Badge>
  )
}

// 판매자 상품 판매 상태(서버 ProductStatus). 구매자 표시 상태(ProductSaleState)와 값 이름이 겹쳐 따로 둔다.
const productStatusLooks: Record<ProductStatus, Omit<BadgeSpec, 'label'>> = {
  [ProductStatus.READY]: { tone: 'neutral', icon: Clock },
  [ProductStatus.ON_SALE]: { tone: 'primary', icon: CircleCheck },
  [ProductStatus.PAUSED]: { tone: 'warning', icon: CirclePause },
  [ProductStatus.ENDED]: { tone: 'neutral', icon: null },
}

export type ProductStatusBadgeProps = Omit<BadgeProps, 'color' | 'leftSection' | 'children'> & {
  status: ProductStatus
}

export function ProductStatusBadge({ status, ...props }: ProductStatusBadgeProps) {
  const { tone, icon: Icon } = productStatusLooks[status]
  return (
    <Badge color={tone} leftSection={Icon ? <Icon aria-hidden="true" /> : undefined} {...props}>
      {productStatusLabels[status]}
    </Badge>
  )
}

// 주문 전체 상태(서버 OrderStatus). 주문 상품 상태(OrderItemStatus)와 PAYMENT_PENDING 값이 겹쳐 따로 둔다.
const orderStatusLooks: Record<OrderStatus, Omit<BadgeSpec, 'label'>> = {
  [OrderStatus.PAYMENT_PENDING]: { tone: 'warning', icon: Clock },
  [OrderStatus.PAID]: { tone: 'success', icon: CircleCheck },
  [OrderStatus.PAYMENT_FAILED]: { tone: 'error', icon: CircleX },
  [OrderStatus.CANCELED]: { tone: 'neutral', icon: RotateCcw },
}

export type OrderStatusBadgeProps = Omit<BadgeProps, 'color' | 'leftSection' | 'children'> & {
  status: OrderStatus
}

export function OrderStatusBadge({ status, ...props }: OrderStatusBadgeProps) {
  const { tone, icon: Icon } = orderStatusLooks[status]
  return (
    <Badge color={tone} leftSection={Icon ? <Icon aria-hidden="true" /> : undefined} {...props}>
      {orderStatusLabels[status]}
    </Badge>
  )
}

// 환불(취소 요청) 상태(서버 RefundStatus). 출금 상태(WithdrawalState)와 값 이름이 겹쳐 따로 둔다.
const refundStatusLooks: Record<RefundStatus, Omit<BadgeSpec, 'label'>> = {
  [RefundStatus.REQUESTED]: { tone: 'warning', icon: Clock },
  [RefundStatus.PROCESSING]: { tone: 'info', icon: Loader },
  [RefundStatus.COMPLETED]: { tone: 'success', icon: CircleCheck },
  [RefundStatus.REJECTED]: { tone: 'error', icon: CircleX },
  [RefundStatus.WITHDRAWN]: { tone: 'neutral', icon: RotateCcw },
  // 거절(CircleX)과 같은 빨강이라 아이콘으로 구분한다
  [RefundStatus.FAILED]: { tone: 'error', icon: TriangleAlert },
}

export type RefundStatusBadgeProps = Omit<BadgeProps, 'color' | 'leftSection' | 'children'> & {
  status: RefundStatus
}

export function RefundStatusBadge({ status, ...props }: RefundStatusBadgeProps) {
  const { tone, icon: Icon } = refundStatusLooks[status]
  return (
    <Badge color={tone} leftSection={Icon ? <Icon aria-hidden="true" /> : undefined} {...props}>
      {refundStatusLabels[status]}
    </Badge>
  )
}
