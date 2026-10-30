import { Alert, Button, Group, Modal, Stack, Text } from '@mantine/core'
import { CircleCheck, CircleX } from 'lucide-react'
import { useState } from 'react'
import { PAYOUT_HOLD_DAYS, PAYOUT_RUN_HOUR } from '@/shared/lib/constants'
import { formatAmount } from '@/shared/lib/format'
import type { PayoutRunResult } from '../types'
import classes from './PayoutCards.module.css'

// 정산 실행 카드 + 확인 모달. 시안: admin/AdminSettlements ‘정산 실행’
// ✅ POST /api/v1/admin/payouts/run (대기 기간 지난 후보), POST …/run/skip-wait (대기 건너뛰기 · 테스트용).
// 응답은 실행 번호와 배치 상태뿐이라 결과는 그 둘만 보여 준다. prod에서는 두 API가 닫혀 있다.
// TODO(api): ❌ 마지막 실행 정보 API 없음 → 줄을 뺐다

type MaybeAsync = unknown
type RunMode = 'run' | 'skipWait'

export type PayoutRunCardProps = {
  /** 정산 전인 후보 수 (GET …/candidates?unsettledOnly=true). 없으면 줄을 숨긴다 */
  pendingCandidateCount?: number
  running?: boolean
  result: PayoutRunResult | null
  onRun: () => MaybeAsync
  onRunSkipWait: () => MaybeAsync
  /** 처음부터 확인 모달을 연다 (미리보기) */
  defaultConfirm?: RunMode | null
}

const confirmCopy: Record<RunMode, { title: string; body: string; action: string }> = {
  run: {
    title: '지금 정산을 실행할까요?',
    body: `구매확정 뒤 ${PAYOUT_HOLD_DAYS}일이 지난 정산 후보를 판매자별로 모아 정산을 만들고 판매자 지갑으로 바로 입금해요. 실행 후에는 되돌릴 수 없어요.`,
    action: '정산 실행',
  },
  skipWait: {
    title: '대기 기간을 건너뛰고 정산할까요?',
    body: `정산 대기 기간(${PAYOUT_HOLD_DAYS}일)을 기다리지 않고 지금 있는 후보를 모두 정산해요. 발표·연동 테스트용이고 실제 정산 기록이 남아요.`,
    action: '건너뛰고 실행',
  },
}

function RunResult({ result }: { result: PayoutRunResult }) {
  if (result.kind === 'error') {
    return (
      <Alert color="error" icon={<CircleX />}>
        {result.message}
      </Alert>
    )
  }
  return (
    <Alert color="success" icon={<CircleCheck />}>
      <span className="pd-num">
        정산 배치를 실행했어요 · 실행 번호 {result.executionId} · 상태 {result.status}
      </span>
      {result.skipWait && <Text className={classes.help}>대기 기간을 건너뛰고 정산했어요</Text>}
    </Alert>
  )
}

export function PayoutRunCard({
  pendingCandidateCount,
  running = false,
  result,
  onRun,
  onRunSkipWait,
  defaultConfirm = null,
}: PayoutRunCardProps) {
  const [confirm, setConfirm] = useState<RunMode | null>(defaultConfirm)
  const copy = confirm ? confirmCopy[confirm] : null

  return (
    <section className={classes.card} aria-labelledby="payout-run-title">
      <h2 id="payout-run-title" className={classes.title}>
        정산 실행
      </h2>
      <Text className={classes.desc}>
        구매확정 뒤 {PAYOUT_HOLD_DAYS}일이 지난 정산 후보를 판매자별로 모아 정산을 만들고, 판매자
        지갑으로 입금해요. 매일 새벽 {PAYOUT_RUN_HOUR}시에 자동으로 실행돼요.
      </Text>
      {pendingCandidateCount !== undefined && (
        <Text className={`pd-num ${classes.help}`}>
          정산 대기 후보 {formatAmount(pendingCandidateCount)}건
        </Text>
      )}
      {result && !running && <RunResult result={result} />}
      <Group gap="xs" className={classes.start}>
        <Button loading={running} onClick={() => setConfirm('run')}>
          정산 지금 실행
        </Button>
        <Button variant="outline" disabled={running} onClick={() => setConfirm('skipWait')}>
          대기 건너뛰고 실행 (테스트용)
        </Button>
      </Group>

      <Modal opened={confirm !== null} onClose={() => setConfirm(null)} title={copy?.title ?? ''}>
        {copy && (
          <Stack gap="lg">
            <Text className={classes.desc}>{copy.body}</Text>
            <Group justify="flex-end" gap="xs">
              <Button variant="outline" onClick={() => setConfirm(null)}>
                닫기
              </Button>
              <Button
                onClick={() => {
                  const mode = confirm
                  setConfirm(null)
                  if (mode === 'skipWait') onRunSkipWait()
                  else onRun()
                }}
              >
                {copy.action}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </section>
  )
}
