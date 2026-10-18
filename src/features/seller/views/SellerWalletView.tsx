import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Skeleton,
  Stack,
  Table,
  Text,
} from '@mantine/core'
import {
  BanknoteArrowUp,
  CircleAlert,
  CircleCheck,
  HandCoins,
  RotateCcw,
  Wallet,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Link } from 'react-router'
import { MIN_WITHDRAWAL_AMOUNT } from '@/shared/lib/constants'
import { formatAmount, formatDate, formatPrice } from '@/shared/lib/format'
import { WithdrawalState } from '@/shared/lib/withdrawalState'
import type { StatusTone } from '@/shared/styles/variantColorResolver'
import {
  DisabledReason,
  EmptyView,
  PageHeader,
  PriceText,
  QueryState,
  StatusBadge,
} from '@/shared/ui'
import { AccountChangeModal } from '../components/AccountChangeModal'
import type { AccountChangeValues } from '../schemas'
import {
  type SellerWallet,
  type SellerWalletTx,
  SellerWalletTxType,
  type Withdrawal,
} from '../types'
import classes from './SellerWalletView.module.css'

// 판매자 지갑·출금 /seller/wallet. 시안: seller/SellerWallet, SellerWalletMobile
// 요약(지갑 잔액 · 출금 가능 금액 · 등록 계좌) → 출금 신청(최소 10,000원 · 전액 · 확인 모달) → 출금 내역 · 입출금 내역.
// 출금 결과: 성공 · 잔액 부족 · 계좌 확인 필요. 계좌는 바로 바꾸지 않고 관리자에게 변경 요청(C-6). 출금 규칙은 C-7.
// TODO(api): 📝 GET /wallets/seller, .../transactions, POST .../withdrawals, GET .../withdrawals/{id} · ❌ 계좌 변경

export type WithdrawResult = { kind: 'success'; amount: number } | { kind: 'insufficient' }

export type SellerWalletViewProps = {
  status: 'pending' | 'error' | 'success'
  wallet: SellerWallet
  withdrawals: Withdrawal[]
  transactions: SellerWalletTx[]
  hasMoreTransactions?: boolean
  loadingMoreTransactions?: boolean
  onLoadMoreTransactions?: () => void
  /** 확인 모달에서 ‘출금 신청’. 실패로 throw하면 모달을 열어 둔다 */
  onWithdraw: (amount: number) => unknown
  withdrawing?: boolean
  /** 마지막 출금 신청 결과 */
  withdrawResult?: WithdrawResult | null
  onRequestAccountChange: (values: AccountChangeValues) => unknown
  requestingAccountChange?: boolean
  accountChangeError?: string | null
  /** 미리보기용 */
  defaultAmount?: number
  defaultModal?: 'confirm' | 'account' | null
  onRetry?: () => void
}

const txLook: Record<SellerWalletTxType, { label: string; tone: StatusTone; icon: ReactNode }> = {
  [SellerWalletTxType.PAYOUT]: {
    label: '정산 입금',
    tone: 'primary',
    icon: <HandCoins aria-hidden="true" />,
  },
  [SellerWalletTxType.WITHDRAWAL]: {
    label: '출금',
    tone: 'neutral',
    icon: <BanknoteArrowUp aria-hidden="true" />,
  },
  [SellerWalletTxType.WITHDRAWAL_RETURN]: {
    label: '출금 실패 반환',
    tone: 'info',
    icon: <RotateCcw aria-hidden="true" />,
  },
}

function TxBadge({ type }: { type: SellerWalletTxType }) {
  const look = txLook[type]
  return (
    <Badge color={look.tone} leftSection={look.icon}>
      {look.label}
    </Badge>
  )
}

function SignedAmount({ value }: { value: number }) {
  if (value < 0) return <PriceText amount={value} deduct size="S" />
  return (
    <span className={classes.plus}>
      +<PriceText amount={value} size="S" />
    </span>
  )
}

const withdrawalNote = (w: Withdrawal) => {
  switch (w.state) {
    case WithdrawalState.REQUESTED:
      return '확인 후 은행으로 보내요'
    case WithdrawalState.PROCESSING:
      return '은행으로 보내는 중이에요'
    case WithdrawalState.COMPLETED:
      return w.completedAt ? `${formatDate(w.completedAt, 'dateTime')} 입금 완료` : '입금 완료'
    case WithdrawalState.FAILED:
      return `${w.failReason ?? '보내지 못했어요'} · 잔액으로 돌려놨어요`
  }
}

function WalletSkeleton() {
  return (
    <Stack gap="md">
      <Skeleton h={140} radius="md" />
      <Skeleton h={320} radius="md" />
      <Skeleton h={240} radius="md" />
    </Stack>
  )
}

export function SellerWalletView({
  status,
  wallet,
  withdrawals,
  transactions,
  hasMoreTransactions = false,
  loadingMoreTransactions = false,
  onLoadMoreTransactions,
  onWithdraw,
  withdrawing = false,
  withdrawResult = null,
  onRequestAccountChange,
  requestingAccountChange = false,
  accountChangeError = null,
  defaultAmount = 0,
  defaultModal = null,
  onRetry,
}: SellerWalletViewProps) {
  const [amount, setAmount] = useState(defaultAmount)
  const [modal, setModal] = useState(defaultModal)
  // 새 성공 결과가 오면 입력을 비운다 (렌더 중 상태 맞추기)
  const [seenResult, setSeenResult] = useState(withdrawResult)
  if (withdrawResult !== seenResult) {
    setSeenResult(withdrawResult)
    if (withdrawResult?.kind === 'success') setAmount(0)
  }

  const { account } = wallet
  const accountText = `${account.bankName} ${account.accountNumberMasked} · ${account.holder}`
  const available = wallet.withdrawableAmount
  const held = wallet.balance - available
  const formOff = wallet.accountNeedsCheck || available < MIN_WITHDRAWAL_AMOUNT

  let amountError: string | null = null
  if (!formOff && amount > 0 && amount < MIN_WITHDRAWAL_AMOUNT) {
    amountError = `${formatPrice(MIN_WITHDRAWAL_AMOUNT)} 이상 입력해 주세요`
  } else if (!formOff && amount > available) {
    amountError = `출금 가능 금액(${formatPrice(available)})보다 많아요. 전액 버튼을 눌러 보세요`
  }

  let reason: string | null = null
  if (wallet.accountNeedsCheck) reason = '등록 계좌를 확인한 뒤 출금할 수 있어요'
  else if (available < MIN_WITHDRAWAL_AMOUNT) {
    reason =
      available === 0
        ? '출금할 수 있는 금액이 없어요'
        : `출금 가능 금액이 ${formatPrice(MIN_WITHDRAWAL_AMOUNT)}보다 적어요`
  } else if (amount === 0) reason = '출금할 금액을 입력해 주세요'
  else if (amountError) reason = '금액을 고치면 신청할 수 있어요'

  const submitWithdraw = async () => {
    try {
      await onWithdraw(amount)
      setModal(null)
    } catch {
      // 열어 둔다
    }
  }
  const submitAccountChange = async (values: AccountChangeValues) => {
    try {
      await onRequestAccountChange(values)
      setModal(null)
    } catch {
      // 열어 두고 오류 문구를 보여 준다
    }
  }
  const openAccount = () => setModal('account')

  return (
    <div className={classes.root}>
      <div className={classes.intro}>
        <PageHeader title="지갑·출금" hideOnMobile />
        <p className={classes.lead}>
          정산 금액은 매일 새벽 2시에 판매자 지갑으로 들어와요. 지갑에 쌓인 금액을 등록 계좌로
          출금해요.
        </p>
      </div>

      <QueryState
        status={status}
        skeleton={<WalletSkeleton />}
        loadingLabel="지갑 정보를 불러오고 있어요"
        onRetry={onRetry}
      >
        <section className={classes.summary} aria-label="지갑 요약">
          <div className={classes.stat}>
            <span className={classes.statLabel}>지갑 잔액</span>
            <PriceText amount={wallet.balance} size="L" />
            <span className={classes.help}>정산으로 들어온 금액 중 아직 출금하지 않은 금액</span>
          </div>
          <div className={classes.stat}>
            <span className={classes.statLabel}>출금 가능 금액</span>
            <PriceText amount={available} size="L" className={classes.primary} />
            <span className={`pd-num ${classes.help}`}>
              {held > 0
                ? `처리 중인 출금 ${formatPrice(held)}을 뺀 금액`
                : '지금 바로 출금할 수 있는 금액'}
            </span>
          </div>
          <div className={classes.stat}>
            <span className={classes.statLabel}>
              등록 계좌
              {wallet.accountNeedsCheck && (
                <Badge color="warning" leftSection={<CircleAlert aria-hidden="true" />}>
                  확인 필요
                </Badge>
              )}
              {wallet.accountChangePending && (
                <Badge color="info" leftSection={<RotateCcw aria-hidden="true" />}>
                  변경 요청 중
                </Badge>
              )}
            </span>
            <strong className={`pd-num ${classes.account}`}>
              {account.bankName} {account.accountNumberMasked}
            </strong>
            <span className={classes.help}>
              예금주 {account.holder} · 판매자 신청 때 등록한 계좌
            </span>
            {wallet.accountChangePending ? (
              <span className={classes.help}>
                관리자가 확인하면 새 계좌로 바뀌어요. 그 전까지는 이 계좌로 출금돼요.
              </span>
            ) : (
              <Button
                variant="subtle"
                size="sm"
                className={classes.inlineAction}
                aria-haspopup="dialog"
                onClick={openAccount}
              >
                계좌 변경 요청
              </Button>
            )}
          </div>
        </section>

        <div className={classes.columns}>
          <section className={classes.card} aria-labelledby="withdraw-title">
            <h2 id="withdraw-title" className={classes.cardTitle}>
              출금 신청
            </h2>

            {withdrawResult?.kind === 'success' && (
              <Alert
                color="success"
                icon={<CircleCheck />}
                role="status"
                title={`${formatPrice(withdrawResult.amount)} 출금을 신청했어요`}
              >
                다음 영업일까지 {account.bankName} 계좌로 들어가요. 진행 상황은 출금 내역에서 볼 수
                있어요.
              </Alert>
            )}
            {withdrawResult?.kind === 'insufficient' && (
              <Alert
                color="error"
                icon={<CircleAlert />}
                role="alert"
                title="잔액이 부족해서 출금하지 못했어요"
              >
                그 사이 출금 가능 금액이 바뀌었을 수 있어요. 금액을 확인하고 다시 신청해 주세요.
              </Alert>
            )}
            {wallet.accountNeedsCheck && (
              <Alert
                color="warning"
                icon={<CircleAlert />}
                role="alert"
                title="등록 계좌를 확인해야 해요"
              >
                <Stack gap="xs" align="flex-start">
                  <span>
                    은행에서 예금주나 계좌번호가 맞지 않다고 알려 왔어요. 계좌를 확인할 때까지
                    출금할 수 없어요.
                  </span>
                  {wallet.accountChangePending ? (
                    <strong>계좌 변경을 요청했어요. 관리자가 확인하고 있어요.</strong>
                  ) : (
                    <Button
                      variant="outline"
                      color="warning"
                      size="sm"
                      aria-haspopup="dialog"
                      onClick={openAccount}
                    >
                      계좌 변경 요청하기
                    </Button>
                  )}
                </Stack>
              </Alert>
            )}

            <div className={classes.amountRow}>
              <NumberInput
                className={classes.amountInput}
                label="출금할 금액"
                placeholder="0"
                value={amount === 0 ? '' : amount}
                onChange={(value) => setAmount(typeof value === 'number' ? value : 0)}
                thousandSeparator=","
                allowDecimal={false}
                allowNegative={false}
                hideControls
                max={999_999_999}
                clampBehavior="strict"
                rightSection={<span aria-hidden="true">원</span>}
                inputMode="numeric"
                autoComplete="off"
                disabled={formOff}
                error={amountError}
                description={
                  amountError
                    ? undefined
                    : `${formatPrice(MIN_WITHDRAWAL_AMOUNT)}부터 출금 가능 금액(${formatPrice(available)})까지 원 단위로 신청할 수 있어요`
                }
                inputWrapperOrder={['label', 'input', 'description', 'error']}
                classNames={{ input: 'pd-num' }}
              />
              <Button
                variant="outline"
                className={classes.allButton}
                disabled={formOff}
                onClick={() => setAmount(available)}
              >
                전액
              </Button>
            </div>

            <dl className={classes.ledger}>
              <div>
                <dt>받는 계좌</dt>
                <dd className="pd-num">{accountText}</dd>
              </div>
              <div>
                <dt>출금 수수료</dt>
                <dd>
                  <PriceText amount={0} size="S" />
                </dd>
              </div>
              <div>
                <dt>입금 예정</dt>
                <dd>신청 후 다음 영업일까지</dd>
              </div>
            </dl>
            {wallet.accountChangePending && (
              <Text className={classes.help}>
                계좌 변경 요청 중이에요. 바뀌기 전까지는 지금 계좌로 출금돼요.
              </Text>
            )}

            <DisabledReason reason={reason} fullWidth>
              <Button
                size="lg"
                fullWidth
                disabled={reason !== null}
                aria-haspopup="dialog"
                onClick={() => setModal('confirm')}
              >
                출금 신청
              </Button>
            </DisabledReason>
            {reason === null && (
              <Text className={`${classes.help} ${classes.center}`}>
                신청 전에 금액과 받는 계좌를 한 번 더 보여 드려요
              </Text>
            )}
          </section>

          <section className={classes.card} aria-labelledby="withdrawals-title">
            <div className={classes.cardHead}>
              <h2 id="withdrawals-title" className={classes.cardTitle}>
                출금 내역
              </h2>
              <span className={`pd-num ${classes.help}`}>{formatAmount(withdrawals.length)}건</span>
            </div>
            {withdrawals.length === 0 ? (
              <EmptyView
                icon={<BanknoteArrowUp />}
                title="아직 출금한 내역이 없어요"
                description="출금을 신청하면 여기에서 진행 상황을 볼 수 있어요."
              />
            ) : (
              <ul className={classes.withdrawals} aria-label="출금 내역">
                {withdrawals.map((w) => (
                  <li key={w.withdrawalId} className={classes.withdrawal}>
                    <div className={classes.withdrawalBody}>
                      <span className={`pd-num ${classes.help}`}>
                        {formatDate(w.requestedAt, 'dateTime')} 신청
                      </span>
                      <PriceText amount={w.amount} size="M" />
                      <span className={classes.help}>{withdrawalNote(w)}</span>
                    </div>
                    <StatusBadge status={w.state} />
                  </li>
                ))}
              </ul>
            )}
            <p className={classes.footnote}>
              처리 중인 출금은 취소할 수 없어요. 실패한 출금 금액은 지갑 잔액으로 돌려놔요.
            </p>
          </section>
        </div>

        <section className={classes.card} aria-labelledby="ledger-title">
          <div className={classes.cardHead}>
            <h2 id="ledger-title" className={classes.cardTitle}>
              입출금 내역
            </h2>
            <Anchor component={Link} to="/seller/payouts" className={classes.link}>
              정산 내역에서 상세 보기
            </Anchor>
          </div>
          {transactions.length === 0 ? (
            <EmptyView
              icon={<Wallet />}
              title="아직 입출금 내역이 없어요"
              description="구매확정된 판매 대금이 정산되면 매일 새벽 2시에 지갑으로 들어와요."
            />
          ) : (
            <>
              <div className={classes.tableWrap}>
                <Table aria-label="입출금 내역">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>일시</Table.Th>
                      <Table.Th>유형</Table.Th>
                      <Table.Th>내용</Table.Th>
                      <Table.Th className={classes.right}>금액</Table.Th>
                      <Table.Th className={classes.right}>거래 후 잔액</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {transactions.map((tx) => (
                      <Table.Tr key={tx.transactionId}>
                        <Table.Td className={`pd-num ${classes.muted}`}>
                          {formatDate(tx.occurredAt, 'dateTime')}
                        </Table.Td>
                        <Table.Td>
                          <TxBadge type={tx.type} />
                        </Table.Td>
                        <Table.Td className="pd-num">{tx.description}</Table.Td>
                        <Table.Td className={`${classes.right} ${classes.strong}`}>
                          <SignedAmount value={tx.amount} />
                        </Table.Td>
                        <Table.Td className={`${classes.right} ${classes.muted}`}>
                          <PriceText amount={tx.balanceAfter} size="S" />
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>
              <ul className={classes.txList} aria-label="입출금 내역">
                {transactions.map((tx) => (
                  <li key={tx.transactionId} className={classes.tx}>
                    <div className={classes.txRow}>
                      <span className="pd-num">{tx.description}</span>
                      <strong>
                        <SignedAmount value={tx.amount} />
                      </strong>
                    </div>
                    <div className={classes.txRow}>
                      <span className={classes.txMeta}>
                        <TxBadge type={tx.type} />
                        <span className={`pd-num ${classes.help}`}>
                          {formatDate(tx.occurredAt, 'dateTime')}
                        </span>
                      </span>
                      <span className={`pd-num ${classes.help}`}>
                        잔액 {formatPrice(tx.balanceAfter)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              {hasMoreTransactions && (
                <div className={classes.more}>
                  <Button
                    variant="outline"
                    loading={loadingMoreTransactions}
                    onClick={onLoadMoreTransactions}
                  >
                    더 보기
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </QueryState>

      <Modal
        opened={modal === 'confirm'}
        onClose={() => setModal(null)}
        title={`${formatPrice(amount)}을 출금할까요?`}
        closeOnClickOutside={!withdrawing}
        closeOnEscape={!withdrawing}
      >
        <Stack gap="md">
          <Text>
            신청하면 바로 은행으로 보내는 절차가 시작돼요. 처리가 시작된 출금은 취소할 수 없어요.
          </Text>
          <dl className={classes.ledger}>
            <div>
              <dt>받는 계좌</dt>
              <dd className="pd-num">{accountText}</dd>
            </div>
            <div>
              <dt>출금 금액</dt>
              <dd>
                <PriceText amount={amount} size="S" />
              </dd>
            </div>
            <div>
              <dt>출금 수수료</dt>
              <dd>
                <PriceText amount={0} size="S" />
              </dd>
            </div>
            <div>
              <dt>신청 후 출금 가능 금액</dt>
              <dd>
                <PriceText amount={Math.max(0, available - amount)} size="S" />
              </dd>
            </div>
          </dl>
          <Group justify="flex-end" gap="xs">
            <Button variant="outline" disabled={withdrawing} onClick={() => setModal(null)}>
              닫기
            </Button>
            <Button loading={withdrawing} onClick={submitWithdraw}>
              출금 신청
            </Button>
          </Group>
        </Stack>
      </Modal>

      <AccountChangeModal
        opened={modal === 'account'}
        onClose={() => setModal(null)}
        account={account}
        onSubmit={submitAccountChange}
        submitting={requestingAccountChange}
        errorMessage={accountChangeError}
      />
    </div>
  )
}
