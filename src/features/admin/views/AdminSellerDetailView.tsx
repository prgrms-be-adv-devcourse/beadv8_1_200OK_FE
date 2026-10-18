import { Alert, Button, Group, Skeleton, Stack, Text } from '@mantine/core'
import { ChevronLeft, CircleAlert, CircleX, NotebookPen } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Link } from 'react-router'
import { formatDate } from '@/shared/lib/format'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { PageHeader, QueryState, StatusBadge } from '@/shared/ui'
import { type ReviewReasonKind, ReviewReasonModal } from '../components/ReviewReasonModal'
import { sellerReviewActionLabels } from '../labels'
import { type AdminSellerApplication, SellerReviewAction } from '../types'
import classes from './AdminSellerDetailView.module.css'

// M-02 판매자 심사 상세 /admin/sellers/:sellerId. 시안: admin/AdminSellers (상세 · 모달)
// 신청 정보 · 정산 계좌 장부 + 처리 카드(상태별 버튼) + 처리 이력.
// 심사 대기 → 심사 시작 · 심사 중 → 승인 / 반려(사유) · 승인 → 권한 회수(사유 + 주문 일괄 취소 경고)
// TODO(api): ❌ 신청 상세 API 없음. 📝 승인 POST /admin/sellers/{id}/approval, 반려 .../rejection,
//   권한 회수 .../suspension. ‘심사 시작’은 API 목록에 없다(시안 기준으로 둠)

type MaybeAsync = unknown

export type AdminSellerDetailViewProps = {
  status: 'pending' | 'error' | 'notFound' | 'success'
  application: AdminSellerApplication | null
  onStartReview: () => MaybeAsync
  onApprove: () => MaybeAsync
  onReject: (reason: string) => MaybeAsync
  onSuspend: (reason: string) => MaybeAsync
  /** 처리 중인 동작 */
  submitting?: SellerReviewAction | null
  /** 처음부터 사유 모달을 연다 (미리보기) */
  defaultModal?: ReviewReasonKind | null
  onRetry?: () => void
}

const S = SellerApplicationStatus

type Row = { label: string; value: string; num?: boolean }

function Ledger({ id, title, rows }: { id: string; title: string; rows: Row[] }) {
  return (
    <section className={classes.ledger} aria-labelledby={id}>
      <h2 id={id} className={classes.ledgerTitle}>
        <NotebookPen size={16} aria-hidden="true" />
        {title}
      </h2>
      <dl className={classes.ledgerList}>
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd className={row.num ? 'pd-num' : undefined}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function ActionCard({
  application: app,
  submitting,
  onStartReview,
  onApprove,
  onOpen,
}: {
  application: AdminSellerApplication
  submitting: SellerReviewAction | null
  onStartReview: () => MaybeAsync
  onApprove: () => MaybeAsync
  onOpen: (kind: ReviewReasonKind) => void
}) {
  const busy = submitting !== null
  let body: ReactNode
  switch (app.status) {
    case S.APPLIED:
      body = (
        <>
          <Text className={classes.desc}>심사를 시작하면 신청자에게 ‘심사 중’으로 보여요.</Text>
          <Button
            loading={submitting === SellerReviewAction.START_REVIEW}
            disabled={busy && submitting !== SellerReviewAction.START_REVIEW}
            onClick={() => onStartReview()}
          >
            심사 시작
          </Button>
        </>
      )
      break
    case S.UNDER_REVIEW:
      body = (
        <>
          <Text className={classes.desc}>
            사업자등록번호와 통신판매업 신고번호를 확인한 뒤 결정해 주세요.
          </Text>
          <Group gap="xs" grow>
            <Button variant="outline" disabled={busy} onClick={() => onOpen('reject')}>
              반려
            </Button>
            <Button
              loading={submitting === SellerReviewAction.APPROVE}
              disabled={busy && submitting !== SellerReviewAction.APPROVE}
              onClick={() => onApprove()}
            >
              승인
            </Button>
          </Group>
        </>
      )
      break
    case S.APPROVED:
      body = (
        <>
          <Text className={classes.desc}>
            판매 중인 판매자예요. 권한을 회수하면 상품 판매가 바로 멈춰요.
          </Text>
          <Button color="red" disabled={busy} onClick={() => onOpen('suspend')}>
            권한 회수
          </Button>
        </>
      )
      break
    case S.REJECTED:
      body = (
        <>
          <Alert color="error" icon={<CircleX />} title="반려됨">
            {app.reason ?? '사유가 남아 있지 않아요'}
          </Alert>
          <Text className={classes.help}>신청자는 바로 다시 신청할 수 있어요</Text>
        </>
      )
      break
    case S.SUSPENDED:
      body = (
        <Alert color="warning" icon={<CircleAlert />} title="권한 정지">
          {app.reason ?? '사유가 남아 있지 않아요'}
        </Alert>
      )
      break
  }

  return (
    <section className={classes.card} aria-labelledby="review-action-title">
      <h2 id="review-action-title" className={classes.cardTitle}>
        처리
      </h2>
      {body}
    </section>
  )
}

function History({ application }: { application: AdminSellerApplication }) {
  return (
    <section className={classes.card} aria-labelledby="review-history-title">
      <h2 id="review-history-title" className={classes.cardTitle}>
        처리 이력
      </h2>
      <ol className={classes.history}>
        {[...application.history].reverse().map((line) => (
          <li key={`${line.action}-${line.at}`}>
            <time className={`pd-num ${classes.help}`} dateTime={line.at}>
              {formatDate(line.at, 'dateTime')}
            </time>
            <span>
              {line.adminName && `${line.adminName} · `}
              {sellerReviewActionLabels[line.action]}
              {line.reason && ` — ${line.reason}`}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function AdminSellerDetailView({
  status,
  application,
  onStartReview,
  onApprove,
  onReject,
  onSuspend,
  submitting = null,
  defaultModal = null,
  onRetry,
}: AdminSellerDetailViewProps) {
  const [modal, setModal] = useState<ReviewReasonKind | null>(defaultModal)
  const confirm = async (reason: string) => {
    try {
      await (modal === 'suspend' ? onSuspend(reason) : onReject(reason))
      setModal(null)
    } catch {
      // 열어 둔다
    }
  }

  return (
    <div className={classes.root}>
      <Button
        component={Link}
        to="/admin/sellers"
        variant="subtle"
        size="sm"
        leftSection={<ChevronLeft size={16} aria-hidden="true" />}
        className={classes.back}
      >
        심사 목록
      </Button>

      <QueryState
        status={status === 'success' && !application ? 'notFound' : status}
        skeleton={
          <Stack gap="md">
            <Skeleton h={38} w="40%" />
            <Skeleton h={220} radius="md" />
            <Skeleton h={160} radius="md" />
          </Stack>
        }
        loadingLabel="신청 정보를 불러오고 있어요"
        onRetry={onRetry}
        notFound={{
          title: '신청을 찾을 수 없어요',
          description: '판매자 번호를 확인하거나 심사 목록에서 다시 골라 주세요.',
          action: { label: '심사 목록 보기', to: '/admin/sellers' },
        }}
      >
        {application && (
          <>
            <PageHeader title={application.storeName} hideOnMobile />
            <div className={classes.summary}>
              <strong className={classes.mobileName}>{application.storeName}</strong>
              <StatusBadge status={application.status} />
              <span className={`pd-num ${classes.help}`}>
                신청 {formatDate(application.appliedAt)} · 담당 {application.reviewerName ?? '없음'}
              </span>
            </div>

            <div className={classes.columns}>
              <div className={classes.main}>
                <Ledger
                  id="application-info"
                  title="신청 정보"
                  rows={[
                    { label: '상호명', value: application.storeName },
                    { label: '대표자', value: application.representativeName },
                    { label: '사업자등록번호', value: application.businessNumber, num: true },
                    { label: '통신판매업 신고번호', value: application.mailOrderNumber, num: true },
                    { label: '신청일', value: formatDate(application.appliedAt), num: true },
                  ]}
                />
                <Ledger
                  id="application-account"
                  title="정산 계좌"
                  rows={[
                    { label: '은행', value: application.bankName },
                    { label: '계좌번호', value: application.accountNumberMasked, num: true },
                    { label: '예금주', value: application.accountHolder },
                  ]}
                />
              </div>
              <div className={classes.side}>
                <ActionCard
                  application={application}
                  submitting={submitting}
                  onStartReview={onStartReview}
                  onApprove={onApprove}
                  onOpen={setModal}
                />
                <History application={application} />
              </div>
            </div>

            <ReviewReasonModal
              kind={modal}
              application={application}
              onClose={() => setModal(null)}
              onConfirm={confirm}
              submitting={
                submitting === SellerReviewAction.REJECT ||
                submitting === SellerReviewAction.SUSPEND
              }
            />
          </>
        )}
      </QueryState>
    </div>
  )
}
