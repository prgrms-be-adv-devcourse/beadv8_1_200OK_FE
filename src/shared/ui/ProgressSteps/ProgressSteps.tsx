import { Check, X } from 'lucide-react'
import classes from './ProgressSteps.module.css'

// 진행 단계 (읽기 전용). 지난 단계는 체크 + primary, 지금 단계는 굵게 + aria-current, 실패한 단계는 X + error.
// 색만으로 구분하지 않는다(아이콘 + 굵기 + 숨은 상태 문구).
// 쓰는 곳: 주문 상세(결제 완료 → 구매확정), 배송 조회, 판매자 신청 단계·신청 현황(반려·정지)

export type ProgressStepsProps = {
  steps: string[]
  /** 지금 단계 (0부터) */
  current: number
  /** 마지막 단계까지 끝났으면 true (지금 단계 없이 모두 체크) */
  completed?: boolean
  /** 지금 단계가 실패(반려·정지 등) */
  failed?: boolean
  /** 단계 아래 작은 글 (예: 날짜 10.13) */
  captions?: (string | undefined)[]
  label?: string
}

export function ProgressSteps({
  steps,
  current,
  completed = false,
  failed = false,
  captions,
  label = '진행 단계',
}: ProgressStepsProps) {
  return (
    <ol className={classes.root} aria-label={label}>
      {steps.map((step, index) => {
        const done = index < current || (completed && index <= current)
        const now = !completed && index === current
        const state = done ? 'done' : now ? (failed ? 'failed' : 'current') : 'todo'
        return (
          <li
            key={step}
            className={classes.step}
            data-state={state}
            aria-current={now ? 'step' : undefined}
          >
            <span className={classes.dot} aria-hidden="true">
              {state === 'done' && <Check size={12} />}
              {state === 'failed' && <X size={12} />}
            </span>
            {step}
            {captions?.[index] && (
              <span className={`pd-num ${classes.caption}`}>{captions[index]}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
