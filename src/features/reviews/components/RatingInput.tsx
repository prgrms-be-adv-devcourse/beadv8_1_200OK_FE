import { Star } from 'lucide-react'
import { useId } from 'react'
import { toStarRating } from '@/shared/lib/rating'
import classes from './RatingInput.module.css'

// 별점 입력 (design/COMPONENTS.md ‘별점 입력’). 별 버튼 5개(44×44, 별 32).
// 누른 별까지 N.0점, 같은 별을 다시 누르면 −0.5점. 값은 API rating(1~10)으로 주고받는다.

export type RatingInputProps = {
  /** API 값 1~10. 고르기 전이면 null */
  value: number | null
  onChange: (value: number) => void
  error?: string
}

function fillOf(value: number | null, star: number): 'full' | 'half' | 'empty' {
  if (value === null) return 'empty'
  if (value >= star * 2) return 'full'
  if (value === star * 2 - 1) return 'half'
  return 'empty'
}

export function RatingInput({ value, onChange, error }: RatingInputProps) {
  const statusId = useId()
  const helpId = useId()
  const errorId = useId()

  return (
    <fieldset
      className={classes.root}
      aria-describedby={[statusId, helpId, error ? errorId : null].filter(Boolean).join(' ')}
      data-error={error ? true : undefined}
    >
      <legend className={classes.legend}>
        별점 <span className={classes.required}>(필수)</span>
      </legend>
      <div className={classes.row}>
        <div className={classes.stars}>
          {[1, 2, 3, 4, 5].map((star) => {
            const fill = fillOf(value, star)
            return (
              <button
                key={star}
                type="button"
                className={classes.star}
                data-fill={fill}
                aria-label={`별점 ${star}점`}
                aria-pressed={value !== null && value >= star * 2 - 1}
                onClick={() => onChange(value === star * 2 ? star * 2 - 1 : star * 2)}
              >
                <span className={classes.icon} aria-hidden="true">
                  <Star size={32} className={classes.base} />
                  <span className={classes.fill}>
                    <Star size={32} />
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        <span id={statusId} className={classes.value} aria-live="polite">
          {value === null ? '별을 눌러 골라 주세요' : `${toStarRating(value).toFixed(1)}점`}
        </span>
      </div>
      {error && (
        <p id={errorId} className={classes.error} role="alert">
          {error}
        </p>
      )}
      <p id={helpId} className={classes.help}>
        같은 별을 한 번 더 누르면 0.5점을 빼요
      </p>
    </fieldset>
  )
}
