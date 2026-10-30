import { VisuallyHidden } from '@mantine/core'
import { Check, Minus } from 'lucide-react'
import { passwordRules } from '@/shared/lib/password'
import classes from './PasswordRules.module.css'

// 비밀번호 입력 아래 규칙 체크: 영문 · 숫자 · 특수문자 · 8~20자. 맞으면 체크 + primary, 아니면 대시 + muted(색만으로 구분하지 않는다)

export function PasswordRules({ id, value }: { id: string; value: string }) {
  return (
    <ul id={id} className={classes.root} aria-label="비밀번호 규칙">
      {passwordRules.map((rule) => {
        const ok = rule.test(value)
        return (
          <li key={rule.label} className={classes.rule} data-ok={ok || undefined}>
            {ok ? <Check size={14} aria-hidden="true" /> : <Minus size={14} aria-hidden="true" />}
            {rule.label}
            <VisuallyHidden>{ok ? ' 충족' : ' 미충족'}</VisuallyHidden>
          </li>
        )
      })}
    </ul>
  )
}
