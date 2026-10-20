import { Badge, type BadgeProps } from '@mantine/core'
import {
  BadgeCheck,
  CircleCheck,
  CirclePause,
  CircleX,
  Clock,
  Hourglass,
  Loader,
  type LucideIcon,
  Package,
  RotateCcw,
  TriangleAlert,
  Truck,
} from 'lucide-react'
import { OrderItemStatus, OrderStatus, ProductStatus } from '@/shared/api/types'
import { ClaimState, claimStateLabels } from '@/shared/lib/claimState'
import { orderItemStatusLabels, orderStatusLabels, productStatusLabels } from '@/shared/lib/labels'
import { ProductSaleState, productSaleStateLabels } from '@/shared/lib/productState'
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
  | ClaimState
  | WithdrawalState
  | SellerApplicationStatus

type BadgeSpec = { tone: StatusTone; icon: LucideIcon | null; label: string }

const labels: Record<BadgeStatus, string> = {
  ...orderItemStatusLabels,
  ...productSaleStateLabels,
  ...shipmentStateLabels,
  ...claimStateLabels,
  ...withdrawalStateLabels,
  ...sellerApplicationStatusLabels,
}

const looks: Record<BadgeStatus, Omit<BadgeSpec, 'label'>> = {
  // 주문 상품 상태 8종
  [OrderItemStatus.PAYMENT_PENDING]: { tone: 'warning', icon: Clock },
  [OrderItemStatus.PAYMENT_FAILED]: { tone: 'error', icon: CircleX },
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
  [ShipmentState.TRACKING_FAILED]: { tone: 'error', icon: CircleX },
  // 판매자 취소 요청 처리
  [ClaimState.CLAIM_PENDING]: { tone: 'warning', icon: Clock },
  [ClaimState.CLAIM_APPROVED]: { tone: 'success', icon: CircleCheck },
  [ClaimState.CLAIM_REJECTED]: { tone: 'neutral', icon: CircleX },
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
}

export function getStatusBadgeSpec(status: BadgeStatus): BadgeSpec {
  return { ...looks[status], label: labels[status] }
}

export type StatusBadgeProps = Omit<BadgeProps, 'color' | 'leftSection' | 'children'> & {
  status: BadgeStatus
}

export function StatusBadge({ status, ...props }: StatusBadgeProps) {
  const { tone, icon: Icon, label } = getStatusBadgeSpec(status)
  return (
    <Badge color={tone} leftSection={Icon ? <Icon aria-hidden="true" /> : undefined} {...props}>
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
