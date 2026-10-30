import { Alert, Button, Group, Skeleton, Stack, Text } from '@mantine/core'
import { CircleCheck, CircleX, ClipboardList, Hourglass, KeyRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { SellerApplicationHistoryItem, SellerApplicationResponse } from '@/shared/api/types'
import { formatDate } from '@/shared/lib/format'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import type { StatusTone } from '@/shared/styles/variantColorResolver'
import { PageHeader, ProgressSteps, QueryState, StatusBadge } from '@/shared/ui'
import { ApplicationSummary } from '../components/ApplicationSummary'
import classes from './SellerStatusView.module.css'

// S-02 판매자 신청 현황 /seller/apply/status. 시안: b2c/SellerStatusMobile, SellerApply(현황)
// 신청 완료 · 심사 중 · 승인(권한 받기) · 반려(사유 + 다시 신청). 권한 정지 상태는 API에 없다.
// ✅ GET /sellers/me/applications(최근 신청 = application, 나머지 = history), GET .../applications/{id}(detail),
//    승인 뒤 토큰은 발급 시점 권한만 담으므로 POST /auth/reissue로 다시 받는다(grantSeller).

export type SellerStatusViewProps = {
  status: 'pending' | 'error' | 'notFound' | 'success'
  /** 가장 최근 신청 */
  application?: SellerApplicationHistoryItem
  /** 최근 신청의 정보. undefined = 불러오는 중, null = 못 받음(장부 생략) */
  detail?: SellerApplicationResponse | null
  /** 이전 신청들(반려 포함) */
  history?: SellerApplicationHistoryItem[]
  /** 승인됐지만 아직 SELLER 권한을 받지 않았을 때. null이면 바로 판매자 센터 링크 */
  grantSeller?: { onGrant: () => void; granting: boolean; error?: string | null } | null
  onRetry?: () => void
  errorMessage?: string
}

const S = SellerApplicationStatus

type Look = {
  steps: string[]
  current: number
  completed?: boolean
  failed?: boolean
  dates: (string | null)[]
  tone: StatusTone
  icon: ReactNode
  title: string
  body: string
}

function lookOf(app: SellerApplicationHistoryItem): Look {
  const applied = app.appliedAt
  switch (app.status) {
    case S.PENDING:
      return {
        steps: ['신청 완료', '심사 중', '승인'],
        current: 0,
        dates: [applied, null, null],
        tone: 'info',
        icon: <ClipboardList />,
        title: '신청이 접수됐어요',
        body: '관리자가 확인을 시작하면 ‘심사 중’으로 바뀌어요.',
      }
    case S.IN_REVIEW:
      return {
        steps: ['신청 완료', '심사 중', '승인'],
        current: 1,
        dates: [applied, app.reviewStartedAt, null],
        tone: 'info',
        icon: <Hourglass />,
        title: '관리자가 신청 내용을 확인하고 있어요',
        body: '결과가 나오면 이 화면에서 바로 확인할 수 있어요.',
      }
    case S.APPROVED:
      return {
        steps: ['신청 완료', '심사 중', '승인'],
        current: 2,
        completed: true,
        dates: [applied, app.reviewStartedAt, app.approvedAt],
        tone: 'success',
        icon: <CircleCheck />,
        title: '판매자로 승인됐어요',
        body: '상점 소개와 프로필 사진을 입력하면 구매자에게 상점이 보여요.',
      }
    case S.REJECTED:
      return {
        steps: ['신청 완료', '심사 중', '반려'],
        current: 2,
        failed: true,
        dates: [applied, app.reviewStartedAt, app.rejectedAt],
        tone: 'error',
        icon: <CircleX />,
        title: `반려 사유: ${app.rejectReason ?? '관리자에게 문의해 주세요'}`,
        body: '정보를 고쳐서 바로 다시 신청할 수 있어요.',
      }
  }
}

export function SellerStatusView({
  status,
  application,
  detail,
  history = [],
  grantSeller = null,
  onRetry,
  errorMessage,
}: SellerStatusViewProps) {
  const resolved = status === 'success' && !application ? 'notFound' : status
  const look = application ? lookOf(application) : null

  return (
    <div className={classes.root}>
      <PageHeader title="판매자 신청 현황" backTo="/me" />
      <QueryState
        status={resolved}
        skeleton={
          <Stack gap="md">
            <Skeleton h={88} radius="md" />
            <Skeleton h={80} radius="md" />
            <Skeleton h={260} radius="md" />
          </Stack>
        }
        loadingLabel="신청 현황을 불러오고 있어요"
        onRetry={onRetry}
        errorMessage={errorMessage}
        notFound={{
          icon: <ClipboardList />,
          title: '아직 판매자 신청을 하지 않았어요',
          description: '직접 키운 농산물을 팔아 보세요.',
          action: { label: '판매자 신청하기', to: '/seller/apply' },
        }}
      >
        {application && look && (
          <>
            <section className={classes.card} aria-label="진행 단계">
              <ProgressSteps
                steps={look.steps}
                current={look.current}
                completed={look.completed}
                failed={look.failed}
                captions={look.dates.map((date) => (date ? formatDate(date, 'short') : undefined))}
                label="신청 진행 단계"
              />
            </section>

            <Alert
              color={look.tone}
              icon={look.icon}
              title={look.title}
              role={look.tone === 'error' ? 'alert' : 'status'}
            >
              {look.body}
            </Alert>

            {application.status === S.APPROVED &&
              (grantSeller ? (
                <Stack gap="xs">
                  {grantSeller.error && (
                    <Alert
                      color="error"
                      icon={<CircleX />}
                      role="alert"
                      title="권한을 받지 못했어요"
                    >
                      {grantSeller.error}
                    </Alert>
                  )}
                  <Button
                    size="lg"
                    leftSection={<KeyRound size={18} aria-hidden="true" />}
                    loading={grantSeller.granting}
                    onClick={grantSeller.onGrant}
                  >
                    판매자 권한 받기
                  </Button>
                  <Text className={classes.help}>
                    승인된 권한을 새로 받아야 판매자 센터에 들어갈 수 있어요.
                  </Text>
                </Stack>
              ) : (
                <Group gap="xs" grow>
                  <Button component={Link} to="/seller" size="lg">
                    판매자 센터로 가기
                  </Button>
                  <Button component={Link} to="/seller/profile" variant="outline" size="lg">
                    상점 프로필 입력하기
                  </Button>
                </Group>
              ))}
            {application.status === S.REJECTED && (
              <Button component={Link} to="/seller/apply?reapply=1" size="lg">
                다시 신청하기
              </Button>
            )}

            {detail === undefined ? (
              <Skeleton h={200} radius="md" aria-label="신청 정보를 불러오고 있어요" />
            ) : (
              detail && <ApplicationSummary values={detail} appliedAt={detail.appliedAt} />
            )}

            {history.length > 0 && (
              <section className={classes.card} aria-labelledby="apply-history">
                <h2 id="apply-history" className={classes.cardTitle}>
                  이전 신청
                </h2>
                <ul className={classes.history}>
                  {history.map((item) => (
                    <li key={item.applicationId} className={classes.historyItem}>
                      <div className={classes.historyHead}>
                        <StatusBadge status={item.status} />
                        <span className={`pd-num ${classes.help}`}>
                          {formatDate(item.appliedAt)} 신청
                        </span>
                      </div>
                      {item.rejectReason && (
                        <span className={classes.help}>반려 사유: {item.rejectReason}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </QueryState>
    </div>
  )
}
