import { Badge, type BadgeProps } from '@mantine/core'
import {
  BadgeCheck,
  CircleCheck,
  CirclePause,
  CircleX,
  Clock,
  type LucideIcon,
  Package,
  RotateCcw,
  TriangleAlert,
  Truck,
} from 'lucide-react'
import { OrderItemStatus } from '@/shared/api/types'
import { orderItemStatusLabels } from '@/shared/lib/labels'
import { ProductSaleState, productSaleStateLabels } from '@/shared/lib/productState'
import type { StatusTone } from '@/shared/styles/variantColorResolver'

// 상태값 → 배지(색 · 아이콘 · 문구) 매핑은 이 파일 한 곳에서만 정한다. 색만으로 상태를 전달하지 않는다.
// 시안: design/screens/common/Components.dc.html ‘배지 · 산지 꼬리표’

export type BadgeStatus = OrderItemStatus | ProductSaleState

type BadgeSpec = { tone: StatusTone; icon: LucideIcon | null; label: string }

const labels: Record<BadgeStatus, string> = { ...orderItemStatusLabels, ...productSaleStateLabels }

const looks: Record<BadgeStatus, Omit<BadgeSpec, 'label'>> = {
  // 주문 상품 상태 8종
  [OrderItemStatus.PAYMENT_PENDING]: { tone: 'warning', icon: Clock },
  [OrderItemStatus.PAYMENT_FAILED]: { tone: 'error', icon: CircleX },
  [OrderItemStatus.PREPARING]: { tone: 'neutral', icon: Package },
  [OrderItemStatus.SHIPPING]: { tone: 'info', icon: Truck },
  [OrderItemStatus.DELIVERED]: { tone: 'success', icon: CircleCheck },
  [OrderItemStatus.PURCHASE_CONFIRMED]: { tone: 'primary', icon: BadgeCheck },
  [OrderItemStatus.CANCEL_REQUESTED]: { tone: 'warning', icon: TriangleAlert },
  [OrderItemStatus.CANCELED]: { tone: 'neutral', icon: RotateCcw },
  // 상품 판매 상태(구매자 화면) + 판매자 정지
  [ProductSaleState.UPCOMING]: { tone: 'neutral', icon: Clock },
  [ProductSaleState.SOLD_OUT]: { tone: 'neutral', icon: Clock },
  [ProductSaleState.PAUSED]: { tone: 'neutral', icon: CirclePause },
  [ProductSaleState.ENDED]: { tone: 'neutral', icon: null },
  [ProductSaleState.SELLER_SUSPENDED]: { tone: 'warning', icon: TriangleAlert },
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
