import { Button, Modal, Skeleton, Stack, Text } from '@mantine/core'
import { type PayoutDetail, PayoutEventType, type PayoutItem } from '@/shared/api/types'
import { PAYOUT_FEE_RATE } from '@/shared/lib/constants'
import { formatAmount, formatDate } from '@/shared/lib/format'
import { payoutEventTypeLabels } from '@/shared/lib/labels'
import { PriceText } from '../PriceText/PriceText'
import { QueryState } from '../QueryState/QueryState'
import classes from './PayoutDetailModal.module.css'

// 정산 상세 모달. 판매자 /seller/payouts/:payoutId, 관리자 /admin/payouts/:payoutId가 같이 쓴다.
// 시안: seller/SellerSettlements ‘정산 상세’, admin/AdminSettlements ‘정산 상세’
// 항목을 주문 상품별로 묶어 판매 대금 · 수수료 · 배송비 · 정산 조정을 보여 준다.
// 플랫폼 수수료 몫(system)은 수수료가 들어오는 돈이라 차감 부호 없이 그린다.
// TODO(api): 항목에 주문번호·상품명이 없어 ‘주문 상품 번호’만 보여 준다. SALE_FEE 부호는 상관없이 차감으로 그린다.

export type PayoutDetailModalProps = {
  opened: boolean
  onClose: () => void
  /** notFound: 없는 정산이거나 내 정산이 아님 */
  status: 'pending' | 'error' | 'notFound' | 'success'
  payout: PayoutDetail | null
  /** 지금까지 불러온 항목 (페이지 단위로 더 불러온다) */
  items: PayoutItem[]
  hasMoreItems?: boolean
  loadingMoreItems?: boolean
  onLoadMoreItems?: () => void
  onRetry?: () => void
  /** 받는 사람 이름 (관리자 화면). 없으면 줄을 그리지 않는다 */
  payeeName?: string
}

// 시안 표기: 판매 대금 23,900 · 수수료 −717 · 배송비 +3,000. 조정은 받은 부호 그대로
function ItemAmount({ item, system }: { item: PayoutItem; system: boolean }) {
  if (item.eventType === PayoutEventType.SALE_FEE && !item.adjustment && !system) {
    return <PriceText amount={item.amount} size="S" deduct />
  }
  const plus =
    item.amount > 0 && (item.adjustment || item.eventType === PayoutEventType.SALE_SHIPPING_FEE)
  return (
    <span className={classes.signed}>
      {plus && '+'}
      <PriceText amount={item.amount} size="S" />
    </span>
  )
}

const itemLabel = (item: PayoutItem) => {
  if (item.adjustment) return '정산 조정'
  if (item.eventType === PayoutEventType.SALE_FEE) {
    return `${payoutEventTypeLabels[item.eventType]} ${PAYOUT_FEE_RATE}%`
  }
  return payoutEventTypeLabels[item.eventType]
}

/** 주문 상품 번호별로 묶는다 (처음 나온 순서) */
function groupByOrderItem(items: PayoutItem[]) {
  const groups = new Map<number, PayoutItem[]>()
  for (const item of items) {
    groups.set(item.orderItemId, [...(groups.get(item.orderItemId) ?? []), item])
  }
  return [...groups.entries()]
}

function Period({ payout }: { payout: PayoutDetail }) {
  const to = formatDate(payout.periodTo, 'dateTime')
  return (
    <span className="pd-num">
      {payout.periodFrom
        ? `${formatDate(payout.periodFrom, 'dateTime')} ~ ${to} 전`
        : `${to} 전까지 (첫 정산)`}
    </span>
  )
}

export function PayoutDetailModal({
  opened,
  onClose,
  status,
  payout,
  items,
  hasMoreItems = false,
  loadingMoreItems = false,
  onLoadMoreItems,
  onRetry,
  payeeName,
}: PayoutDetailModalProps) {
  const orderItemCount = payout?.sellerFeeItemCount ?? null
  const system = payout?.system ?? false

  return (
    <Modal opened={opened} onClose={onClose} title="정산 상세" size={640} withCloseButton>
      <QueryState
        status={status === 'success' && !payout ? 'notFound' : status}
        skeleton={
          <Stack gap="sm">
            <Skeleton h={20} w="60%" />
            <Skeleton h={120} radius="md" />
            <Skeleton h={120} radius="md" />
          </Stack>
        }
        loadingLabel="정산 상세를 불러오고 있어요"
        onRetry={onRetry}
        notFound={{
          title: '정산 내역을 찾을 수 없어요',
          description: '정산번호를 확인하거나 목록에서 다시 골라 주세요.',
          action: { label: '정산 목록 보기', onClick: onClose },
        }}
      >
        {payout && (
          <Stack gap="md">
            <dl className={classes.meta}>
              <div>
                <dt>정산번호</dt>
                <dd className="pd-num">{payout.payoutId}</dd>
              </div>
              {payeeName && (
                <div>
                  <dt>받는 사람</dt>
                  <dd>{payeeName}</dd>
                </div>
              )}
              <div>
                <dt>정산 시각</dt>
                <dd className="pd-num">{formatDate(payout.createdAt, 'dateTime')}</dd>
              </div>
              <div>
                <dt>대상 기간</dt>
                <dd>
                  <Period payout={payout} />
                </dd>
              </div>
              {orderItemCount !== null && (
                <div>
                  <dt>주문 상품</dt>
                  <dd className="pd-num">{formatAmount(orderItemCount)}건</dd>
                </div>
              )}
              {payout.systemPayoutId !== null && (
                <div>
                  <dt>수수료 정산번호</dt>
                  <dd className="pd-num">{payout.systemPayoutId}</dd>
                </div>
              )}
            </dl>

            <ul className={classes.groups} aria-label="주문 상품별 정산 항목">
              {groupByOrderItem(items).map(([orderItemId, lines]) => (
                <li key={orderItemId} className={classes.group}>
                  <span className={`pd-num ${classes.groupTitle}`}>주문 상품 {orderItemId}</span>
                  <dl className={classes.lines}>
                    {lines.map((item) => (
                      <div key={item.payoutItemId}>
                        <dt>
                          {itemLabel(item)}
                          {item.adjustment && (
                            <span className={classes.reason}>{item.adjustment.reason}</span>
                          )}
                        </dt>
                        <dd>
                          <ItemAmount item={item} system={system} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>

            {hasMoreItems && (
              <Button variant="outline" loading={loadingMoreItems} onClick={onLoadMoreItems}>
                항목 더 보기
                <span className="pd-num">
                  {' '}
                  ({formatAmount(items.length)}/{formatAmount(payout.itemCount)})
                </span>
              </Button>
            )}

            <dl className={classes.total}>
              {payout.sellerFeeAmount !== null && (
                <div>
                  <dt>판매 수수료 합계</dt>
                  <dd>
                    <PriceText amount={payout.sellerFeeAmount} size="S" deduct />
                  </dd>
                </div>
              )}
              <div className={classes.totalRow}>
                <dt>정산 금액</dt>
                <dd>
                  <PriceText amount={payout.amount} size="M" />
                </dd>
              </div>
            </dl>

            <Text className={classes.help}>
              {system
                ? `플랫폼 수수료 몫이에요. 판매 대금의 ${PAYOUT_FEE_RATE}%를 모았어요.`
                : `판매 수수료는 ${PAYOUT_FEE_RATE}%예요. 배송비는 전액 정산돼요. 정산 금액은 판매자 지갑으로 들어가요.`}
            </Text>
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          </Stack>
        )}
      </QueryState>
    </Modal>
  )
}
