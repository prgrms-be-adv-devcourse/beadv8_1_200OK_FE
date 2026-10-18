import { Button, ThemeIcon } from '@mantine/core'
import { CircleCheck, CircleX, Clock, CreditCard, Hourglass } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { formatPrice } from '@/shared/lib/format'
import type { StatusTone } from '@/shared/styles/variantColorResolver'
import classes from './ChargeResultView.module.css'

// B-05 충전 진행·결과. 시안: b2c/Charge (결제창 진행 · 성공 · 실패 · 확인 중 · 시간 만료)
// PG는 토스페이먼츠. 복귀 주소: 성공 /wallet/charge/success, 실패 /wallet/charge/fail (ADR-0005 개정, DECISIONS.md B-1)
// TODO(api): 📝 POST /wallets/me/charges → confirm·fail. 결제창 만료 시간(15분)은 토스페이먼츠 설정 확인 필요

export type ChargeResultStatus = 'paying' | 'success' | 'failed' | 'pending' | 'expired'

export type ChargeResultViewProps = {
  status: ChargeResultStatus
  amount?: number
  /** 충전 뒤 예치금 (성공) */
  balanceAfter?: number
  /** 주문서에서 왔으면 돌아갈 곳 */
  returnTo?: string | null
  /** 다시 충전하기 경로 (금액·돌아갈 곳을 유지) */
  retryPath?: string
}

type Look = {
  tone: StatusTone
  icon: ReactNode
  title: string
  body: ReactNode
  role: 'status' | 'alert'
}

export function ChargeResultView({
  status,
  amount,
  balanceAfter,
  returnTo,
  retryPath = '/wallet/charge',
}: ChargeResultViewProps) {
  const amountText = amount ? formatPrice(amount) : ''
  const looks: Record<ChargeResultStatus, Look> = {
    paying: {
      tone: 'info',
      icon: <CreditCard size={28} />,
      title: `토스페이먼츠 결제창에서 ${amountText} 결제를 진행해 주세요`,
      body: '결제창이 닫히면 결과를 바로 알려 드려요. 결제창은 15분 뒤 만료돼요.',
      role: 'status',
    },
    success: {
      tone: 'success',
      icon: <CircleCheck size={28} />,
      title: `${amountText}을 충전했어요`,
      body:
        balanceAfter !== undefined ? (
          <>
            지금 예치금은 <strong className="pd-num">{formatPrice(balanceAfter)}</strong>이에요
          </>
        ) : (
          '예치금에 바로 반영됐어요'
        ),
      role: 'status',
    },
    failed: {
      tone: 'error',
      icon: <CircleX size={28} />,
      title: '충전하지 못했어요',
      body: '결제창이 닫혔거나 카드사에서 승인되지 않았어요. 예치금은 그대로예요.',
      role: 'alert',
    },
    pending: {
      tone: 'warning',
      icon: <Hourglass size={28} />,
      title: '충전 결과를 확인하고 있어요',
      body: '최대 10분 정도 걸릴 수 있어요. 확인되면 예치금에 바로 반영돼요.',
      role: 'status',
    },
    expired: {
      tone: 'warning',
      icon: <Clock size={28} />,
      title: '결제 시간이 지나 충전이 취소됐어요',
      body: '결제창은 15분 동안만 열려 있어요. 다시 충전해 주세요.',
      role: 'alert',
    },
  }
  const look = looks[status]
  const backLabel = returnTo ? '주문서로 돌아가기' : '이용 내역 보기'
  const backPath = returnTo ?? '/me/wallet'

  return (
    <section className={classes.root} role={look.role} aria-labelledby="charge-result">
      <ThemeIcon color={look.tone} variant="light" size={64} radius="50%" aria-hidden="true">
        {look.icon}
      </ThemeIcon>
      <h1 id="charge-result" className={`pd-num ${classes.title}`}>
        {look.title}
      </h1>
      <p className={classes.body}>{look.body}</p>
      <div className={classes.actions}>
        {status === 'success' && (
          <Button component={Link} to={backPath} size="lg">
            {backLabel}
          </Button>
        )}
        {status === 'pending' && (
          <Button component={Link} to={backPath} variant="outline" size="lg">
            {returnTo ? backLabel : '확인'}
          </Button>
        )}
        {(status === 'failed' || status === 'expired') && (
          <Button component={Link} to={retryPath} size="lg">
            다시 충전하기
          </Button>
        )}
      </div>
    </section>
  )
}
