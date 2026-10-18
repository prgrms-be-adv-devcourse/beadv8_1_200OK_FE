import { Alert, Button, Group, Modal, Skeleton, Stack, Tabs, Text, Textarea } from '@mantine/core'
import { Info, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { ClaimState } from '@/shared/lib/claimState'
import { formatAmount, formatDate, formatPrice } from '@/shared/lib/format'
import { PageHeader, PriceText, QueryState, StatusBadge } from '@/shared/ui'
import type { CancelClaim } from '../types'
import classes from './SellerClaimsView.module.css'

// S-07 취소 요청 처리 /seller/claims. 시안: seller/SellerCancels, SellerCancelsMobile
// 탭: 처리 대기 · 처리 완료. 승인(확인 모달) → 바로 환불, 거절(사유 필수) → 구매자 주문 상세에 사유가 보인다.
// TODO(api): 📝 GET /claims/seller, GET /claims/seller/{id}, 승인 .../approve, 거절 .../reject

type MaybeAsync = unknown

export type ClaimTab = 'PENDING' | 'DONE'

export type SellerClaimsViewProps = {
  status: 'pending' | 'error' | 'success'
  claims: CancelClaim[]
  tab: ClaimTab
  onTabChange: (tab: ClaimTab) => void
  counts: Record<ClaimTab, number>
  onApprove: (claimId: number) => MaybeAsync
  onReject: (claimId: number, reason: string) => MaybeAsync
  submitting?: boolean
  defaultModal?: { type: 'approve' | 'reject'; claimId: number } | null
  onRetry?: () => void
}

export function SellerClaimsView({
  status,
  claims,
  tab,
  onTabChange,
  counts,
  onApprove,
  onReject,
  submitting = false,
  defaultModal = null,
  onRetry,
}: SellerClaimsViewProps) {
  const [modal, setModal] = useState(defaultModal)
  const [why, setWhy] = useState('')
  const [whyError, setWhyError] = useState<string | null>(null)
  const target = claims.find((c) => c.claimId === modal?.claimId) ?? null
  const close = () => {
    setModal(null)
    setWhy('')
    setWhyError(null)
  }
  const run = async (task: () => MaybeAsync) => {
    try {
      await task()
      close()
    } catch {
      // 열어 둔다
    }
  }

  return (
    <div className={classes.root}>
      <PageHeader title="취소 요청 처리" hideOnMobile />
      <Alert color="info" icon={<Info />}>
        승인하면 주문이 취소되고 구매자 예치금으로 바로 환불돼요. 거절하면 구매자에게 거절 사유가
        보이고, 그대로 출고하면 돼요.
      </Alert>

      <Tabs value={tab} onChange={(v) => onTabChange((v ?? 'PENDING') as ClaimTab)}>
        <Tabs.List aria-label="처리 상태로 보기">
          <Tabs.Tab value="PENDING">
            처리 대기 <span className="pd-num">{formatAmount(counts.PENDING)}</span>
          </Tabs.Tab>
          <Tabs.Tab value="DONE">
            처리 완료 <span className="pd-num">{formatAmount(counts.DONE)}</span>
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      <QueryState
        status={status === 'success' && claims.length === 0 ? 'empty' : status}
        skeleton={
          <Stack gap="md">
            <Skeleton h={180} radius="md" />
            <Skeleton h={180} radius="md" />
          </Stack>
        }
        loadingLabel="취소 요청을 불러오고 있어요"
        onRetry={onRetry}
        empty={{
          icon: <RotateCcw />,
          title: tab === 'PENDING' ? '처리할 취소 요청이 없어요' : '처리한 취소 요청이 없어요',
          description:
            tab === 'PENDING'
              ? '구매자가 출고 전에 취소를 요청하면 이곳에 보여요.'
              : '승인하거나 거절한 요청이 이곳에 남아요.',
          action: { label: '주문·출고로 가기', to: '/seller/orders' },
        }}
      >
        <Stack gap="md">
          {claims.map((claim) => {
            const refund = claim.amount + claim.shippingFee
            const pending = claim.state === ClaimState.CLAIM_PENDING
            return (
              <article
                key={claim.claimId}
                className={classes.card}
                aria-labelledby={`claim-${claim.claimId}`}
              >
                <div className={classes.body}>
                  <div className={classes.head}>
                    <StatusBadge status={claim.state} />
                    <span id={`claim-${claim.claimId}`} className={`pd-num ${classes.help}`}>
                      {formatDate(claim.requestedAt, 'dateTime')} 요청 · {claim.orderNumber}
                    </span>
                  </div>
                  <dl className={classes.kv}>
                    <div>
                      <dt>주문</dt>
                      <dd className="pd-num">
                        {claim.orderNumber} · {claim.buyerNickname}
                      </dd>
                    </div>
                    <div>
                      <dt>상품</dt>
                      <dd className="pd-num">{claim.itemText}</dd>
                    </div>
                    <div>
                      <dt>취소 사유</dt>
                      <dd>{claim.reason}</dd>
                    </div>
                    {claim.rejectReason && (
                      <div>
                        <dt>거절 사유</dt>
                        <dd>{claim.rejectReason}</dd>
                      </div>
                    )}
                  </dl>
                </div>
                <div className={classes.side}>
                  <dl className={classes.rows}>
                    <div>
                      <dt>상품 금액</dt>
                      <dd>
                        <PriceText amount={claim.amount} size="S" />
                      </dd>
                    </div>
                    <div>
                      <dt>배송비</dt>
                      <dd>
                        <PriceText amount={claim.shippingFee} size="S" />
                      </dd>
                    </div>
                    <div className={classes.total}>
                      <dt>
                        {claim.state === ClaimState.CLAIM_APPROVED ? '환불 금액' : '환불 예정 금액'}
                      </dt>
                      <dd>
                        <PriceText amount={refund} size="M" />
                      </dd>
                    </div>
                  </dl>
                  {pending && (
                    <Group gap="xs" grow>
                      <Button
                        variant="outline"
                        onClick={() => setModal({ type: 'reject', claimId: claim.claimId })}
                      >
                        거절
                      </Button>
                      <Button onClick={() => setModal({ type: 'approve', claimId: claim.claimId })}>
                        승인
                      </Button>
                    </Group>
                  )}
                </div>
              </article>
            )
          })}
        </Stack>
      </QueryState>

      <Modal
        opened={modal?.type === 'approve' && target !== null}
        onClose={close}
        title="취소 요청을 승인할까요?"
      >
        {target && (
          <Stack gap="md">
            <Text className={`pd-num ${classes.help}`}>
              {target.orderNumber} · {target.buyerNickname} · {target.itemText}
            </Text>
            <Text className="pd-num">
              주문이 취소되고 구매자에게{' '}
              <strong>{formatPrice(target.amount + target.shippingFee)}</strong>이 예치금으로 바로
              환불돼요. 승인한 뒤에는 되돌릴 수 없어요.
            </Text>
            <Group justify="flex-end" gap="xs">
              <Button variant="outline" onClick={close}>
                닫기
              </Button>
              <Button loading={submitting} onClick={() => run(() => onApprove(target.claimId))}>
                승인
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal
        opened={modal?.type === 'reject' && target !== null}
        onClose={close}
        title="취소 요청 거절"
      >
        {target && (
          <Stack gap="md">
            <Text className={`pd-num ${classes.help}`}>
              {target.orderNumber} · {target.buyerNickname} · {target.itemText}
            </Text>
            <Textarea
              label="거절 사유"
              description="구매자 주문 상세에 그대로 보여요"
              placeholder="예: 이미 포장을 마쳐 오늘 출고할 예정이에요"
              autosize
              minRows={3}
              maxLength={200}
              value={why}
              onChange={(e) => {
                setWhy(e.currentTarget.value)
                setWhyError(null)
              }}
              error={whyError}
              data-autofocus
            />
            <Group justify="flex-end" gap="xs" align="flex-start">
              <Button variant="outline" onClick={close}>
                닫기
              </Button>
              <Button
                loading={submitting}
                onClick={() => {
                  if (!why.trim()) return setWhyError('거절 사유를 입력해 주세요')
                  run(() => onReject(target.claimId, why.trim()))
                }}
              >
                거절하기
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </div>
  )
}
