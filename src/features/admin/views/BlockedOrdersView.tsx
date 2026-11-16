import { Pagination, Skeleton, Stack, Text } from '@mantine/core'
import { CircleCheck } from 'lucide-react'
import { formatAmount } from '@/shared/lib/format'
import { PageHeader, QueryState } from '@/shared/ui'
import { BlockedOrderCard } from '../components/BlockedOrderCard'
import { PayoutSectionTabs } from '../components/PayoutSectionTabs'
import {
  ResolutionHistoryModal,
  type ResolutionHistoryModalProps,
} from '../components/ResolutionHistoryModal'
import { ResolveOrderModal, type ResolveOrderModalProps } from '../components/ResolveOrderModal'
import { type BlockedOrder, PayoutSection } from '../types'
import classes from './PayoutReviewViews.module.css'

// M-03 정산 관리 · 막힌 주문 /admin/payouts/blocked-orders?page=
// ✅ GET /api/v1/admin/payouts/blocked-orders, POST …/orders/{orderId}/resolution, 해결 기록 2종.
// 목록은 정산 실행이 끝날 때 갱신되는 집계라, 해결한 주문은 다음 실행 전까지 ‘해결됨’으로 남는다.

export type BlockedOrdersViewProps = {
  onSectionChange: (section: PayoutSection) => void
  status: 'pending' | 'error' | 'success'
  errorMessage?: string
  onRetry?: () => void
  orders: BlockedOrder[]
  totalElements: number
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  onResolve: (order: BlockedOrder) => void
  onShowHistory: (orderId: number) => void
  resolve: ResolveOrderModalProps
  history: ResolutionHistoryModalProps
}

export function BlockedOrdersView({
  onSectionChange,
  status,
  errorMessage,
  onRetry,
  orders,
  totalElements,
  page = 1,
  totalPages = 1,
  onPageChange,
  onResolve,
  onShowHistory,
  resolve,
  history,
}: BlockedOrdersViewProps) {
  return (
    <div className={classes.root}>
      <PageHeader title="정산 관리" hideOnMobile />
      <PayoutSectionTabs value={PayoutSection.BLOCKED_ORDERS} onChange={onSectionChange} />

      <section className={classes.panel} aria-labelledby="blocked-orders-title">
        <div className={classes.panelHead}>
          <h2 id="blocked-orders-title" className={classes.title}>
            막힌 주문
          </h2>
          <Text className={classes.desc}>
            정산이 막혀 사람이 봐야 하는 주문이에요. 원인을 확인하고 고친 뒤 해결하면 다음 정산
            실행에서 다시 검사해요.
          </Text>
        </div>

        <QueryState
          status={status === 'success' && orders.length === 0 ? 'empty' : status}
          skeleton={
            <Stack gap="sm" p="md">
              <Skeleton h={160} radius="md" />
              <Skeleton h={160} radius="md" />
            </Stack>
          }
          loadingLabel="막힌 주문을 불러오고 있어요"
          onRetry={onRetry}
          errorMessage={errorMessage}
          empty={{
            icon: <CircleCheck />,
            title: '막힌 주문이 없어요',
            description: '정산이 막히면 여기에 보여요.',
          }}
        >
          <ul className={classes.list} aria-label="막힌 주문 목록">
            {orders.map((order) => (
              <BlockedOrderCard
                key={order.orderId}
                order={order}
                onResolve={onResolve}
                onShowHistory={onShowHistory}
              />
            ))}
          </ul>

          {totalPages > 1 && (
            <Pagination
              className={classes.pagination}
              total={totalPages}
              value={page}
              onChange={onPageChange}
              getControlProps={(control) => ({
                'aria-label': control === 'previous' ? '이전 페이지' : '다음 페이지',
              })}
            />
          )}
          <Text className={`pd-num ${classes.sum}`}>막힌 주문 {formatAmount(totalElements)}건</Text>
        </QueryState>
      </section>

      <ResolveOrderModal {...resolve} />
      <ResolutionHistoryModal {...history} />
    </div>
  )
}
