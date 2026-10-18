import { Alert, Button, Group, Modal, Stack, Text } from '@mantine/core'
import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { formatAmount, formatDate, formatPrice } from '@/shared/lib/format'
import type { PayoutLastRun, PayoutRunResult } from '../types'
import classes from './PayoutCards.module.css'

// 정산 실행 카드 + 확인 모달. 시안: admin/AdminSettlements ‘정산 실행’
// 결과 3종: 정상 · 후보 없음 · 새벽 정산 중(409)
// TODO(api): 📝 POST /payout/run. 마지막 실행 정보는 API 없음(❌)

type MaybeAsync = unknown

export type PayoutRunCardProps = {
  lastRun: PayoutLastRun | null
  running?: boolean
  result: PayoutRunResult | null
  onRun: () => MaybeAsync
  /** 처음부터 확인 모달을 연다 (미리보기) */
  defaultConfirmOpen?: boolean
}

function RunResult({ result }: { result: PayoutRunResult }) {
  switch (result.kind) {
    case 'ok':
      return (
        <Alert color="success" icon={<CircleCheck />}>
          <span className="pd-num">
            정산 후보 {formatAmount(result.candidateCount)}건을 모아 정산{' '}
            {formatAmount(result.payoutCount)}건(합계 {formatPrice(result.totalAmount)})을
            만들었어요
          </span>
        </Alert>
      )
    case 'none':
      return (
        <Alert color="info" icon={<Info />}>
          정산할 후보가 없어요(0건)
        </Alert>
      )
    case 'busy':
      return (
        <Alert color="warning" icon={<TriangleAlert />}>
          새벽 정산이 진행 중이라 지금은 실행할 수 없어요. 끝난 뒤 다시 실행해 주세요.
        </Alert>
      )
    case 'error':
      return (
        <Alert color="error" icon={<CircleX />}>
          {result.message}
        </Alert>
      )
  }
}

export function PayoutRunCard({
  lastRun,
  running = false,
  result,
  onRun,
  defaultConfirmOpen = false,
}: PayoutRunCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(defaultConfirmOpen)

  return (
    <section className={classes.card} aria-labelledby="payout-run-title">
      <h2 id="payout-run-title" className={classes.title}>
        정산 실행
      </h2>
      <Text className={classes.desc}>
        구매확정되어 정산 후보가 된 주문 상품을 판매자별로 모아 정산을 만들고, 판매자 지갑으로
        입금해요. 매일 새벽 2시에 자동으로 실행돼요.
      </Text>
      {lastRun && (
        <Text className={`pd-num ${classes.help}`}>
          마지막 실행 · {formatDate(lastRun.at, 'dateTime')} {lastRun.auto ? '자동' : '수동'} · 정산{' '}
          {formatAmount(lastRun.payoutCount)}건
        </Text>
      )}
      {result && !running && <RunResult result={result} />}
      <Button className={classes.start} loading={running} onClick={() => setConfirmOpen(true)}>
        정산 지금 실행
      </Button>

      <Modal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="지금 정산을 실행할까요?"
      >
        <Stack gap="lg">
          <Text className={classes.desc}>
            정산 후보를 판매자별로 모아 정산을 만들고 판매자 지갑으로 바로 입금해요. 실행 후에는
            되돌릴 수 없어요.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              닫기
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false)
                onRun()
              }}
            >
              정산 실행
            </Button>
          </Group>
        </Stack>
      </Modal>
    </section>
  )
}
