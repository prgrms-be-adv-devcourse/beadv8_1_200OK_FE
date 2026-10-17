import { cloneElement, type ReactElement, type ReactNode, useId } from 'react'
import classes from './CtaBar.module.css'

// 모바일 하단 고정 CTA 바: 높이 72(+ safe area), 흰 배경, shadow md, 위 1px divider.
// 왼쪽 금액 요약(+ 보조 줄), 오른쪽 주 버튼. 주 버튼이 비활성이면 reason을 보조 줄에 두고 버튼 설명으로 잇는다.
// 시안: b2c/CartMobile·CheckoutMobile·ProductMobile의 .mbar. 데스크톱(≥ 1024)에서는 숨긴다.

export type CtaBarProps = {
  /** 금액 요약 (예: <>총 <PriceText …/></>) */
  summary?: ReactNode
  /** 요약 아래 작은 안내 (예: ‘결제 후 잔액 12,000원’) */
  note?: ReactNode
  /** 주 버튼 비활성 이유. 있으면 note 대신 경고색으로 */
  reason?: string | null
  /** 주 버튼 (Button size="lg") */
  action: ReactElement<{ 'aria-describedby'?: string }>
  /** 주 버튼 앞 보조 요소 (예: 관심 하트) */
  leading?: ReactNode
  /** fixed: 화면 아래 고정 (기본) / static: 제자리 (갤러리 미리보기) */
  position?: 'fixed' | 'static'
}

export function CtaBar({
  summary,
  note,
  reason,
  action,
  leading,
  position = 'fixed',
}: CtaBarProps) {
  const reasonId = useId()

  return (
    <>
      {/* 고정 바에 가려지지 않게 같은 높이만큼 자리를 둔다 */}
      {position === 'fixed' && <div className={classes.spacer} aria-hidden="true" />}
      <div className={classes.root} data-position={position} data-cta-bar={position}>
        {(summary || note || reason) && (
          <div className={classes.summary}>
            {summary && <span className={classes.amount}>{summary}</span>}
            {reason ? (
              <span id={reasonId} className={classes.reason}>
                {reason}
              </span>
            ) : (
              note && <span className={classes.note}>{note}</span>
            )}
          </div>
        )}
        {leading}
        <div className={classes.action} data-grow={summary ? undefined : true}>
          {reason ? cloneElement(action, { 'aria-describedby': reasonId }) : action}
        </div>
      </div>
    </>
  )
}
