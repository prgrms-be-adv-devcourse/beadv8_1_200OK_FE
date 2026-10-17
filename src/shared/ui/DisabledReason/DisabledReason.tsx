import { cloneElement, type ReactElement, type ReactNode, useId } from 'react'
import classes from './DisabledReason.module.css'

// 비활성 버튼 아래 이유 문구 패턴. reason이 있으면 버튼 아래에 보여 주고 aria-describedby로 잇는다.
// 예: <DisabledReason reason={short ? '예치금이 부족해 결제할 수 없어요' : null}>
//       <Button disabled={short}>45,800원 결제하기</Button>
//     </DisabledReason>

export type DisabledReasonProps = {
  /** 비활성 이유. 없으면 문구를 그리지 않는다 */
  reason?: ReactNode
  /** 버튼 하나 */
  children: ReactElement<{ 'aria-describedby'?: string }>
  /** 버튼을 줄 너비로 늘린다 */
  fullWidth?: boolean
}

export function DisabledReason({ reason, children, fullWidth = false }: DisabledReasonProps) {
  const id = useId()
  const hasReason = reason !== undefined && reason !== null && reason !== false && reason !== ''

  return (
    <div className={classes.root} data-full-width={fullWidth || undefined}>
      {hasReason ? cloneElement(children, { 'aria-describedby': id }) : children}
      {/* 이유가 생기거나 바뀌면 읽어 주도록 영역은 늘 둔다 */}
      <p id={id} className={classes.reason} aria-live="polite" hidden={!hasReason}>
        {hasReason ? reason : null}
      </p>
    </div>
  )
}
