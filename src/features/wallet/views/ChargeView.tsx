import { Alert, Anchor, Button, Group, NumberInput, Text, ThemeIcon } from '@mantine/core'
import { ChevronLeft, CircleAlert, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import type { TermsAgreeRequest, TermsItem } from '@/shared/api/types'
import { MIN_CHARGE_AMOUNT, WALLET_BALANCE_LIMIT } from '@/shared/lib/constants'
import { formatPrice } from '@/shared/lib/format'
import { DisabledReason, PageHeader, PriceText } from '@/shared/ui'
import { TermsAgreementModal } from '../components/TermsAgreementModal'
import classes from './ChargeView.module.css'

// B-05 예치금 충전. 시안: b2c/Charge, ChargeMobile
// 결제는 예치금으로만 하고 PG(토스페이먼츠)는 충전에만 쓴다(B-1). 주문서에서 잔액이 부족해 왔으면 부족 금액을 알려 주고 ‘부족한 금액만큼’을 준다.
// 최소 20,000원 · 보유 한도 2,000,000원은 가정(C-4, constants.ts). 동의 안 한 필수 약관이 있으면 첫 충전 약관 시트를 먼저 띄운다.

export type ChargeRequest = {
  amount: number
  /** 첫 충전이면 함께 보낼 약관 동의 */
  agreements?: TermsAgreeRequest['agreements']
}

export type ChargeViewProps = {
  /** TODO(api): 📝 GET /wallets/me */
  balance: number
  /** GET /wallets/me/terms 응답 */
  terms: TermsItem[]
  /** 주문서에서 왔을 때 부족한 금액 */
  shortfall?: number | null
  /** 충전 뒤 돌아갈 곳 (주문서) */
  returnTo?: string | null
  defaultAmount?: number
  submitting?: boolean
  /** 충전 요청 실패 (서버 detail) */
  errorMessage?: string | null
  /** 약관 시트를 열어 둔 채로 시작 (미리보기) */
  defaultTermsOpen?: boolean
  onCharge: (request: ChargeRequest) => void
}

const quickAmounts = [20_000, 50_000, 100_000]

export function ChargeView({
  balance,
  terms,
  shortfall,
  returnTo,
  defaultAmount,
  submitting = false,
  errorMessage,
  defaultTermsOpen = false,
  onCharge,
}: ChargeViewProps) {
  const fromOrder = Boolean(returnTo && shortfall && shortfall > 0)
  const [amount, setAmount] = useState<number>(
    defaultAmount ?? (fromOrder && shortfall ? Math.max(shortfall, MIN_CHARGE_AMOUNT) : 0),
  )
  const [roundedUp, setRoundedUp] = useState(false)
  const [termsOpen, setTermsOpen] = useState(defaultTermsOpen)

  const room = Math.max(0, WALLET_BALANCE_LIMIT - balance)
  const pendingTerms = terms.filter((item) => item.required && !item.agreed)
  const amountError =
    amount > 0 && amount < MIN_CHARGE_AMOUNT
      ? `${formatPrice(MIN_CHARGE_AMOUNT)}부터 충전할 수 있어요`
      : amount > room
        ? `보유 한도를 넘어요. 지금은 ${formatPrice(room)}까지 충전할 수 있어요`
        : null
  const chargeReason =
    room === 0
      ? `보유 한도(${formatPrice(WALLET_BALANCE_LIMIT)})까지 채워져 있어 충전할 수 없어요`
      : amount === 0
        ? '충전할 금액을 입력해 주세요'
        : amountError
          ? '충전 금액을 확인해 주세요'
          : null

  const changeAmount = (next: number) => {
    setAmount(Math.max(0, Math.min(next, 99_999_999)))
    setRoundedUp(false)
  }

  const fillShortfall = () => {
    if (!shortfall) return
    setAmount(Math.max(shortfall, MIN_CHARGE_AMOUNT))
    setRoundedUp(shortfall < MIN_CHARGE_AMOUNT)
  }

  const charge = () => {
    if (chargeReason) return
    if (pendingTerms.length > 0) setTermsOpen(true)
    else onCharge({ amount })
  }

  return (
    <div className={classes.root}>
      <PageHeader title="예치금 충전" backTo={returnTo ?? '/me'} />
      {fromOrder && returnTo && (
        <Anchor component={Link} to={returnTo} className={classes.back}>
          <ChevronLeft size={16} aria-hidden="true" />
          주문서로 돌아가기
        </Anchor>
      )}

      <section className={classes.balance} aria-label="현재 예치금">
        <ThemeIcon color="primary" variant="light" size={40} radius="md" aria-hidden="true">
          <Wallet size={20} />
        </ThemeIcon>
        <span>현재 예치금</span>
        <PriceText amount={balance} size="L" />
      </section>

      {fromOrder && shortfall && (
        <Alert
          color="warning"
          icon={<CircleAlert />}
          title={`주문하려면 ${formatPrice(shortfall)}이 더 필요해요`}
        >
          최소 충전 금액은 {formatPrice(MIN_CHARGE_AMOUNT)}이에요. 충전하면 주문서로 돌아가 결제할
          수 있어요.
        </Alert>
      )}
      {errorMessage && (
        <Alert color="error" icon={<CircleAlert />} role="alert">
          {errorMessage}
        </Alert>
      )}

      <div className={classes.card}>
        <NumberInput
          label="충전 금액"
          placeholder="충전할 금액을 입력해 주세요"
          value={amount === 0 ? '' : amount}
          onChange={(value) => changeAmount(typeof value === 'number' ? value : 0)}
          thousandSeparator=","
          allowDecimal={false}
          allowNegative={false}
          hideControls
          rightSection={<span aria-hidden="true">원</span>}
          inputMode="numeric"
          autoComplete="off"
          error={amountError}
          description={`지금 최대 ${formatPrice(room)}까지 충전할 수 있어요 · 보유 한도 ${formatPrice(WALLET_BALANCE_LIMIT)}`}
          classNames={{ input: 'pd-num' }}
          disabled={room === 0}
        />
        <Group gap="xs">
          {quickAmounts.map((add) => (
            <Button
              key={add}
              variant="outline"
              size="sm"
              radius="xl"
              onClick={() => changeAmount(amount + add)}
              disabled={room === 0}
            >
              +{add / 10_000}만
            </Button>
          ))}
          {fromOrder && (
            <Button variant="light" size="sm" radius="xl" onClick={fillShortfall}>
              부족한 금액만큼
            </Button>
          )}
        </Group>
        {roundedUp && shortfall && (
          <Text className={`pd-num ${classes.help}`} role="status">
            부족한 {formatPrice(shortfall)}을 최소 충전 금액 {formatPrice(MIN_CHARGE_AMOUNT)}으로
            맞췄어요
          </Text>
        )}
        <div className={classes.after}>
          <span>충전 후 잔액</span>
          <PriceText amount={balance + (amountError ? 0 : amount)} size="M" />
        </div>
      </div>

      <ul className={classes.notes}>
        <li>본인 명의 결제 수단으로만 충전할 수 있어요</li>
        <li>토스페이먼츠 결제창에서 카드·간편결제로 결제해요</li>
        <li>
          한 번에 {formatPrice(MIN_CHARGE_AMOUNT)}부터, 보유 예치금이{' '}
          {formatPrice(WALLET_BALANCE_LIMIT)}을 넘지 않게 충전할 수 있어요
        </li>
      </ul>

      <DisabledReason reason={chargeReason} fullWidth>
        <Button
          size="lg"
          fullWidth
          className="pd-num"
          disabled={chargeReason !== null}
          loading={submitting}
          onClick={charge}
        >
          {chargeReason ? '충전하기' : `${formatPrice(amount)} 충전하기`}
        </Button>
      </DisabledReason>

      <TermsAgreementModal
        opened={termsOpen}
        terms={pendingTerms}
        submitting={submitting}
        onClose={() => setTermsOpen(false)}
        onAgree={(agreements) => {
          setTermsOpen(false)
          onCharge({ amount, agreements })
        }}
      />
    </div>
  )
}
