import {
  Button,
  Checkbox,
  Pagination,
  SegmentedControl,
  Skeleton,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { CircleCheck, SearchX } from 'lucide-react'
import { useState } from 'react'
import { formatAmount } from '@/shared/lib/format'
import { type PayoutBlockStatus, payoutBlockStatusLabels } from '@/shared/lib/payoutBlockState'
import { PageHeader, QueryState } from '@/shared/ui'
import { ALL_BLOCK_STATUSES, orderIdInputError } from '../blockedOrderFilter'
import { BlockedOrderCard } from '../components/BlockedOrderCard'
import { OrderFocusPanel, type OrderFocusPanelProps } from '../components/OrderFocusPanel'
import { PayoutSectionTabs } from '../components/PayoutSectionTabs'
import {
  ResolutionHistoryModal,
  type ResolutionHistoryModalProps,
} from '../components/ResolutionHistoryModal'
import {
  ResolutionRequestsPanel,
  type ResolutionRequestsPanelProps,
} from '../components/ResolutionRequestsPanel'
import { ResolveOrderModal, type ResolveOrderModalProps } from '../components/ResolveOrderModal'
import {
  type BlockedOrder,
  type BlockedOrderFilter,
  type BlockedOrdersMode,
  PayoutSection,
} from '../types'
import classes from './PayoutReviewViews.module.css'

// M-03 정산 관리 · 막힌 주문 /admin/payouts/blocked-orders?status=&orderId=&page= · 해결 기록 ?view=resolutions
// ✅ GET /api/v1/admin/payouts/blocked-orders(?orderId&status…), POST …/orders/{orderId}/resolution, 주문별 해결 기록 2종,
// GET …/candidates?orderId(기간 없이), POST …/adjustments, 해결 기록 전체 GET …/resolution-requests.
// 주문 번호로 찾으면 그 주문 줄 아래에 정산후보 · 조정을 같이 보여 줘 ‘후보 확인 → 조정 → 해결’을 한 화면에서 잇는다.
// 목록은 정산 실행이 끝날 때 갱신되는 집계라, 해결한 주문은 다음 실행 전까지 ‘해결됨’으로 남는다.

export type BlockedOrdersViewProps = {
  onSectionChange: (section: PayoutSection) => void
  /** 지금 막힌 주문 · 해결 기록 전체 목록 */
  mode?: BlockedOrdersMode
  onModeChange?: (mode: BlockedOrdersMode) => void
  filter: BlockedOrderFilter
  onFilterChange: (filter: BlockedOrderFilter) => void
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
  /** 주문 번호로 찾았을 때 그 주문의 정산후보 · 조정. filter.orderId가 없으면 null */
  focus: Omit<OrderFocusPanelProps, 'orderId' | 'order'> | null
  resolutions: Omit<ResolutionRequestsPanelProps, 'onShowOrder'>
  resolve: ResolveOrderModalProps
  history: ResolutionHistoryModalProps
}

const modeOptions: { value: BlockedOrdersMode; label: string }[] = [
  { value: 'orders', label: '막힌 주문' },
  { value: 'resolutions', label: '해결 기록' },
]

function OrderSearch({
  orderId,
  onSearch,
}: {
  orderId: number | null
  onSearch: (orderId: number | null) => void
}) {
  const [value, setValue] = useState(orderId === null ? '' : String(orderId))
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      className={classes.orderSearch}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const message = orderIdInputError(value)
        setError(message)
        if (message) return
        onSearch(value.trim() ? Number(value.trim()) : null)
      }}
    >
      <TextInput
        className={classes.orderSearchInput}
        label="주문 번호"
        placeholder="예: 2001"
        inputMode="numeric"
        classNames={{ input: 'pd-num' }}
        value={value}
        onChange={(e) => {
          setValue(e.currentTarget.value)
          setError(null)
        }}
        error={error}
      />
      <div className={classes.orderSearchButtons}>
        <Button type="submit" variant="outline">
          찾기
        </Button>
        {orderId !== null && (
          <Button variant="subtle" onClick={() => onSearch(null)}>
            전체 목록
          </Button>
        )}
      </div>
    </form>
  )
}

function Filters({
  filter,
  onFilterChange,
}: Pick<BlockedOrdersViewProps, 'filter' | 'onFilterChange'>) {
  const byOrder = filter.orderId !== null
  // 셋 다 끈 상태는 주소로 남길 수 없어(조건 없음 = 셋 다) 마지막 하나는 끌 수 없게 한다
  const onlyOne = filter.statuses.length === 1 ? filter.statuses[0] : null
  return (
    <div className={classes.filters}>
      <Checkbox.Group
        label="상태"
        description={
          byOrder
            ? '주문 번호로 찾을 때는 상태와 상관없이 그 주문을 보여 줘요'
            : '하나 이상 골라요. 아직 안 푼 주문만 보려면 해결됨을 꺼요'
        }
        value={filter.statuses}
        onChange={(next) =>
          onFilterChange({
            ...filter,
            // 고른 순서와 상관없이 늘 같은 순서로 둔다 (주소·캐시 키가 흔들리지 않게)
            statuses: ALL_BLOCK_STATUSES.filter((s) => next.includes(s)),
          })
        }
      >
        <div className={classes.statusChecks}>
          {ALL_BLOCK_STATUSES.map((status: PayoutBlockStatus) => (
            <Checkbox
              key={status}
              value={status}
              label={payoutBlockStatusLabels[status]}
              disabled={byOrder || status === onlyOne}
              classNames={{ body: classes.statusCheckBody }}
            />
          ))}
        </div>
      </Checkbox.Group>
      <OrderSearch
        key={filter.orderId ?? 'all'}
        orderId={filter.orderId}
        onSearch={(orderId) => onFilterChange({ ...filter, orderId })}
      />
    </div>
  )
}

export function BlockedOrdersView({
  onSectionChange,
  mode = 'orders',
  onModeChange,
  filter,
  onFilterChange,
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
  focus,
  resolutions,
  resolve,
  history,
}: BlockedOrdersViewProps) {
  const focusOrderId = filter.orderId
  // 주문 하나를 보는 중이면 그 줄(없으면 막힌 주문이 아님). 목록을 불러오는 중이면 아직 모른다
  const focusOrder =
    focusOrderId === null || status !== 'success'
      ? undefined
      : (orders.find((o) => o.orderId === focusOrderId) ?? null)

  return (
    <div className={classes.root}>
      <PageHeader title="정산 관리" hideOnMobile />
      <PayoutSectionTabs value={PayoutSection.BLOCKED_ORDERS} onChange={onSectionChange} />

      <SegmentedControl
        className={classes.modeSwitch}
        aria-label="막힌 주문 보기"
        value={mode}
        onChange={(value) => onModeChange?.(value as BlockedOrdersMode)}
        data={modeOptions}
      />

      {mode === 'resolutions' ? (
        <ResolutionRequestsPanel {...resolutions} onShowOrder={onShowHistory} />
      ) : (
        <>
          <section className={classes.panel} aria-labelledby="blocked-orders-title">
            <div className={classes.panelHead}>
              <h2 id="blocked-orders-title" className={classes.title}>
                막힌 주문
              </h2>
              <Text className={classes.desc}>
                정산이 막혀 사람이 봐야 하는 주문이에요. 금액·수수료 불일치면 정산후보를 보고 조정한
                뒤 해결하고, 그 밖의 사유는 원인을 확인하고 고친 뒤 해결해요. 해결하면 다음 정산
                실행에서 다시 검사해요.
              </Text>
            </div>

            <Filters filter={filter} onFilterChange={onFilterChange} />

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
              empty={
                focusOrderId === null
                  ? {
                      icon: <CircleCheck />,
                      title: '막힌 주문이 없어요',
                      description: '정산이 막히면 여기에 보여요.',
                    }
                  : {
                      icon: <SearchX />,
                      title: `막힌 주문이 아니에요 · 주문 ${focusOrderId}`,
                      description:
                        '이미 정산됐거나 아직 막히지 않았을 수 있어요. 아래 정산후보에서 확인해 주세요.',
                    }
              }
            >
              <ul className={classes.list} aria-label="막힌 주문 목록">
                {orders.map((order) => (
                  <BlockedOrderCard
                    key={order.orderId}
                    order={order}
                    onResolve={onResolve}
                    onShowHistory={onShowHistory}
                    onOpenOrder={
                      focusOrderId === null
                        ? (orderId) => onFilterChange({ ...filter, orderId })
                        : undefined
                    }
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
              <Text className={`pd-num ${classes.sum}`}>
                막힌 주문 {formatAmount(totalElements)}건
              </Text>
            </QueryState>
          </section>

          {focusOrderId !== null && focus && (
            <OrderFocusPanel
              key={focusOrderId}
              orderId={focusOrderId}
              order={focusOrder}
              {...focus}
            />
          )}
        </>
      )}

      <ResolveOrderModal {...resolve} />
      <ResolutionHistoryModal {...history} />
    </div>
  )
}
