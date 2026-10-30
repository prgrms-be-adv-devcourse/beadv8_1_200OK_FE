import { Anchor, Badge, Button, Chip, Group, Skeleton, Stack, Table } from '@mantine/core'
import { DatePickerInput } from '@mantine/dates'
import { CreditCard, ReceiptText, WalletCards } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { formatDate } from '@/shared/lib/format'
import type { StatusTone } from '@/shared/styles/variantColorResolver'
import { PageHeader, PriceText, QueryState } from '@/shared/ui'
import { type WalletPeriod, type WalletTransaction, WalletTxType } from '../types'
import classes from './WalletHistoryView.module.css'

// B-13 지갑 이용 내역 /me/wallet. 시안: b2c/Wallet, WalletMobile
// 기간(1개월 · 3개월 · 직접 선택 + 날짜 검증) · 유형(전체 · 충전 · 결제). 데스크톱 표, 모바일 목록. 결제 줄은 주문 상세로 이어진다.
// ✅ GET /wallets/me/balance · GET /wallets/me/ledgers. 시안의 결제 취소·환불 입금 유형은 서버에 없어 뺐다.

export type WalletHistoryViewProps = {
  status: 'pending' | 'error' | 'success'
  balance: number
  transactions: WalletTransaction[]
  period: WalletPeriod
  onPeriodChange: (period: WalletPeriod) => void
  /** 직접 선택 기간 (period가 custom일 때) */
  range: [Date | null, Date | null]
  onRangeChange: (range: [Date | null, Date | null]) => void
  type: WalletTxType | 'ALL'
  onTypeChange: (type: WalletTxType | 'ALL') => void
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  onRetry?: () => void
  errorMessage?: string
}

const typeLook: Record<WalletTxType, { label: string; tone: StatusTone; icon: ReactNode }> = {
  [WalletTxType.CHARGE]: {
    label: '충전',
    tone: 'primary',
    icon: <CreditCard aria-hidden="true" />,
  },
  [WalletTxType.PAYMENT]: {
    label: '결제',
    tone: 'neutral',
    icon: <ReceiptText aria-hidden="true" />,
  },
}

const periods: { value: WalletPeriod; label: string }[] = [
  { value: '1m', label: '1개월' },
  { value: '3m', label: '3개월' },
  { value: 'custom', label: '직접 선택' },
]

function TypeBadge({ type }: { type: WalletTxType }) {
  const look = typeLook[type]
  return (
    <Badge color={look.tone} leftSection={look.icon}>
      {look.label}
    </Badge>
  )
}

function Description({ tx }: { tx: WalletTransaction }) {
  return tx.orderId !== null ? (
    <Anchor component={Link} to={`/orders/${tx.orderId}`} size="sm">
      {tx.description}
    </Anchor>
  ) : (
    <span>{tx.description}</span>
  )
}

function Amount({ value }: { value: number }) {
  return value < 0 ? (
    <PriceText amount={value} deduct size="S" />
  ) : (
    <span className={classes.plus}>
      <span aria-hidden="true">+</span>
      <PriceText amount={value} size="S" />
    </span>
  )
}

export function WalletHistoryView({
  status,
  balance,
  transactions,
  period,
  onPeriodChange,
  range,
  onRangeChange,
  type,
  onTypeChange,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  onRetry,
  errorMessage,
}: WalletHistoryViewProps) {
  const [from, to] = range
  const rangeError = from && to && from > to ? '시작일이 종료일보다 늦어요' : null
  const resolved = rangeError ? 'success' : status

  return (
    <div className={classes.root}>
      <PageHeader title="지갑 이용 내역" backTo="/me" />

      <section className={classes.balance} aria-label="예치금 잔액">
        <div>
          <span className={classes.label}>예치금 잔액</span>
          <PriceText amount={balance} size="L" />
        </div>
        <Button component={Link} to="/wallet/charge">
          충전하기
        </Button>
      </section>

      <section className={classes.filters} aria-label="조회 조건">
        <div className={classes.filterRow}>
          <span className={classes.label} id="wallet-period">
            기간
          </span>
          <Chip.Group value={period} onChange={(value) => onPeriodChange(value as WalletPeriod)}>
            <Group gap="xs" role="radiogroup" aria-labelledby="wallet-period">
              {periods.map((p) => (
                <Chip key={p.value} value={p.value}>
                  {p.label}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        </div>
        {period === 'custom' && (
          <div className={classes.range}>
            <DatePickerInput
              label="시작일"
              value={from}
              onChange={(value) => onRangeChange([value ? new Date(value) : null, to])}
              valueFormat="YYYY.MM.DD"
              maxDate={new Date()}
              error={rangeError}
            />
            <DatePickerInput
              label="종료일"
              value={to}
              onChange={(value) => onRangeChange([from, value ? new Date(value) : null])}
              valueFormat="YYYY.MM.DD"
              maxDate={new Date()}
            />
          </div>
        )}
        <div className={classes.filterRow}>
          <span className={classes.label} id="wallet-type">
            유형
          </span>
          <Chip.Group<false>
            value={type as string}
            onChange={(value) => onTypeChange(value as WalletTxType | 'ALL')}
          >
            <Group gap="xs" role="radiogroup" aria-labelledby="wallet-type">
              <Chip value="ALL">전체</Chip>
              {Object.values(WalletTxType).map((value) => (
                <Chip key={value} value={value}>
                  {typeLook[value].label}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        </div>
      </section>

      <QueryState
        status={
          resolved === 'success' && (transactions.length === 0 || rangeError) ? 'empty' : resolved
        }
        skeleton={
          <Stack gap="xs">
            {[1, 2, 3, 4, 5].map((n) => (
              <Skeleton key={n} h={52} />
            ))}
          </Stack>
        }
        loadingLabel="이용 내역을 불러오고 있어요"
        errorMessage={errorMessage}
        onRetry={onRetry}
        empty={{
          icon: <WalletCards />,
          title: rangeError ? '기간을 다시 골라 주세요' : '이 기간에는 이용 내역이 없어요',
          description: rangeError
            ? '시작일을 종료일과 같거나 이른 날로 골라 주세요.'
            : '기간이나 유형을 바꿔서 찾아보세요.',
        }}
      >
        {/* 데스크톱: 표 */}
        <div className={classes.tableWrap}>
          <Table aria-label="이용 내역">
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
                <Table.Tr key={tx.key}>
                  <Table.Td className={`pd-num ${classes.muted}`}>
                    {formatDate(tx.occurredAt, 'dateTime')}
                  </Table.Td>
                  <Table.Td>
                    <TypeBadge type={tx.type} />
                  </Table.Td>
                  <Table.Td>
                    <Description tx={tx} />
                  </Table.Td>
                  <Table.Td className={classes.right}>
                    <Amount value={tx.amount} />
                  </Table.Td>
                  <Table.Td className={classes.right}>
                    <PriceText amount={tx.balanceAfter} size="S" />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>

        {/* 모바일: 목록 */}
        <ul className={classes.list} aria-label="이용 내역">
          {transactions.map((tx) => (
            <li key={tx.key} className={classes.item}>
              <div className={classes.itemTop}>
                <TypeBadge type={tx.type} />
                <span className={`pd-num ${classes.muted}`}>
                  {formatDate(tx.occurredAt, 'dateTime')}
                </span>
              </div>
              <div className={classes.itemMain}>
                <Description tx={tx} />
                <Amount value={tx.amount} />
              </div>
              <span className={`pd-num ${classes.muted} ${classes.itemBalance}`}>
                잔액 <PriceText amount={tx.balanceAfter} size="S" />
              </span>
            </li>
          ))}
        </ul>

        {hasMore && onLoadMore && (
          <div className={classes.more}>
            <Button variant="outline" loading={loadingMore} onClick={onLoadMore}>
              더 보기
            </Button>
          </div>
        )}
      </QueryState>
    </div>
  )
}
