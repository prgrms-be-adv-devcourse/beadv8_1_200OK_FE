import { useState } from 'react'
import { PAYOUT_FEE_RATE } from '@/shared/lib/constants'
import { PayoutBlockStatus } from '@/shared/lib/payoutBlockState'
import { needsAdjustment } from '../blockedOrderFilter'
import type { BlockedOrder } from '../types'
import classes from '../views/PayoutReviewViews.module.css'
import {
  AdjustmentPanel,
  type AdjustmentPanelProps,
  type AdjustmentPreset,
} from './AdjustmentPanel'
import { OrderCandidatesTable, type OrderCandidatesTableProps } from './OrderCandidatesTable'

// 막힌 주문 한 건 처리: 정산후보 확인 → 조정 → (위 주문 줄의) 대기 조정 합계 확인 → 해결.
// 조정은 잠김·멈춤이면서 금액·수수료 불일치가 있는 주문에서만 연다. 해결한(RESOLVED) 주문에 넣은 조정은
// 금액 검사 없이 지급에만 들어가고, 그 밖의 사유는 조정하지 않고 원인을 확인한 뒤 해결한다(Swagger 관리자 정산 묶음 설명).

export type OrderFocusPanelProps = {
  orderId: number
  /** 그 주문의 막힌 줄. null이면 지금 막힌 주문이 아니다(정산후보만 본다). 목록을 불러오는 중이면 undefined */
  order: BlockedOrder | null | undefined
  candidates: Omit<OrderCandidatesTableProps, 'orderId' | 'onAdjust'>
  adjustment: Omit<AdjustmentPanelProps, 'candidates' | 'preset' | 'description'>
}

function noAdjustReason(order: BlockedOrder | null): string | null {
  if (order === null) {
    return '지금 막힌 주문이 아니라 조정하지 않아요. 아래 정산후보의 정산 여부로 대기 중인지 정산됐는지 봐요. 1~2번 실패한 기록은 관리자 화면에서 볼 수 없어요.'
  }
  if (order.status === PayoutBlockStatus.RESOLVED) {
    return '해결한 주문이라 조정하지 않아요. 해결 뒤 넣은 조정은 금액 검사 없이 지급에만 들어가요. 다시 막히면(잠김·멈춤) 그때 조정해요.'
  }
  if (!needsAdjustment(order)) {
    return '막힌 이유가 금액·수수료 불일치가 아니라 조정하지 않아요. 원인을 확인하고 고친 뒤 위 주문 줄에서 해결해요.'
  }
  return null
}

export function OrderFocusPanel({ orderId, order, candidates, adjustment }: OrderFocusPanelProps) {
  const [preset, setPreset] = useState<AdjustmentPreset | null>(null)
  const reason = order === undefined ? null : noAdjustReason(order)
  const adjustable = order !== undefined && reason === null

  return (
    <section className={classes.panel} aria-labelledby="order-focus-title">
      <div className={classes.panelHead}>
        <h2 id="order-focus-title" className={`pd-num ${classes.title}`}>
          주문 {orderId} 정산후보
        </h2>
        {adjustable ? (
          <ol className={classes.steps}>
            <li>
              아래 정산후보에서 금액이 틀린 상품을 골라요. 원인과 초과 청구 근거(혼자 넘는
              주문상품·이미 지급)를 같이 봐요.
            </li>
            <li>
              판매 대금과 수수료 조정을 함께 넣어요. 수수료 = 판매 금액 × {PAYOUT_FEE_RATE}%(원 미만
              버림), 판매 대금 = 판매 금액 − 수수료예요.
            </li>
            <li>위 주문 줄의 대기 조정 합계에 들어갔는지 확인해요.</li>
            <li>‘해결’로 다시 처리해요. 다음 정산 실행이 금액 검사부터 다시 해요.</li>
          </ol>
        ) : (
          reason && <p className={classes.desc}>{reason}</p>
        )}
      </div>
      <div className={classes.focusBody}>
        <OrderCandidatesTable
          orderId={orderId}
          {...candidates}
          onAdjust={
            adjustable
              ? (target) => setPreset((prev) => ({ ...target, nonce: (prev?.nonce ?? 0) + 1 }))
              : undefined
          }
        />
      </div>
      {adjustable && (
        <div className={classes.focusBody}>
          <AdjustmentPanel
            {...adjustment}
            candidates={candidates.status === 'success' ? candidates.candidates : undefined}
            preset={preset}
            description="정산후보 줄의 ‘조정’을 누르면 주문 상품과 항목이 채워져요. 판매 금액을 바꿀 때는 판매 대금과 수수료를 하나씩 따로 넣어요."
          />
        </div>
      )}
    </section>
  )
}
