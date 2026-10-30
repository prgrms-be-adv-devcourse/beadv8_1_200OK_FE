import { Button, ThemeIcon } from '@mantine/core'
import { PartyPopper } from 'lucide-react'
import { Link } from 'react-router'
import { loginPath } from '@/shared/lib/returnTo'
import classes from './AuthView.module.css'

// A-02 가입 완료. 시안: b2c/Auth (done 뷰) → 둘러보기 / 충전하기
// 가입 API는 토큰을 주지 않아(memberId만) 충전 전에 로그인을 거친다.

export function SignupCompleteView({ nickname }: { nickname?: string }) {
  return (
    <section className={classes.result} aria-labelledby="signup-done">
      <ThemeIcon color="success" variant="light" size={56} radius="50%" aria-hidden="true">
        <PartyPopper size={28} />
      </ThemeIcon>
      <h1 id="signup-done" className={classes.resultTitle}>
        {nickname ? `${nickname}님, 가입을 환영해요` : '가입을 환영해요'}
      </h1>
      <p className={classes.resultText}>
        로그인하고 예치금을 충전하면 바로 첫 장보기를 시작할 수 있어요.
      </p>
      <div className={classes.actions}>
        <Button component={Link} to="/" variant="outline" size="lg">
          둘러보기
        </Button>
        <Button component={Link} to={loginPath('/wallet/charge')} size="lg">
          로그인하고 충전하기
        </Button>
      </div>
    </section>
  )
}
