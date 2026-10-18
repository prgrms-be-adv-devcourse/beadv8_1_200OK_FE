import { Alert, Button, Group, Skeleton, Stack } from '@mantine/core'
import { CircleAlert, CircleCheck, CircleX, ClipboardList, Hourglass } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { formatDate } from '@/shared/lib/format'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import type { StatusTone } from '@/shared/styles/variantColorResolver'
import { PageHeader, ProgressSteps, QueryState } from '@/shared/ui'
import { ApplicationSummary } from '../components/ApplicationSummary'
import type { SellerApplication } from '../types'
import classes from './SellerStatusView.module.css'

// S-02 판매자 신청 현황 /seller/apply/status. 시안: b2c/SellerStatusMobile, SellerApply(현황)
// 신청 완료 · 심사 중 · 승인 · 반려(사유 + 다시 신청) · 권한 정지
// TODO(api): 신청 현황 조회 API 없음(❌). 승인·반려·정지는 관리자 API(📝)의 결과다

export type SellerStatusViewProps = {
  status: 'pending' | 'error' | 'notFound' | 'success'
  application?: SellerApplication
  onRetry?: () => void
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

function lookOf(app: SellerApplication): Look {
  const applied = app.appliedAt
  switch (app.status) {
    case S.APPLIED:
      return {
        steps: ['신청 완료', '심사 중', '승인'],
        current: 0,
        dates: [applied, null, null],
        tone: 'info',
        icon: <ClipboardList />,
        title: '신청이 접수됐어요',
        body: '관리자가 확인을 시작하면 ‘심사 중’으로 바뀌어요.',
      }
    case S.UNDER_REVIEW:
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
        dates: [applied, app.reviewStartedAt, app.decidedAt],
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
        dates: [applied, app.reviewStartedAt, app.decidedAt],
        tone: 'error',
        icon: <CircleX />,
        title: `반려 사유: ${app.rejectReason ?? '관리자에게 문의해 주세요'}`,
        body: '정보를 고쳐서 바로 다시 신청할 수 있어요.',
      }
    case S.SUSPENDED:
      return {
        steps: ['신청 완료', '승인', '권한 정지'],
        current: 2,
        failed: true,
        dates: [applied, app.decidedAt, app.suspendedAt],
        tone: 'warning',
        icon: <CircleAlert />,
        title: '판매 권한이 정지됐어요',
        body: '상품 등록과 판매를 할 수 없어요. 구매는 그대로 할 수 있어요. 자세한 내용은 고객센터로 문의해 주세요.',
      }
  }
}

export function SellerStatusView({ status, application, onRetry }: SellerStatusViewProps) {
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
              role={look.tone === 'error' || look.tone === 'warning' ? 'alert' : 'status'}
            >
              {look.body}
            </Alert>

            {application.status === S.APPROVED && (
              <Group gap="xs" grow>
                <Button component={Link} to="/seller" size="lg">
                  판매자 센터로 가기
                </Button>
                <Button component={Link} to="/seller/profile" variant="outline" size="lg">
                  상점 프로필 입력하기
                </Button>
              </Group>
            )}
            {application.status === S.REJECTED && (
              <Button component={Link} to="/seller/apply?reapply=1" size="lg">
                다시 신청하기
              </Button>
            )}

            <ApplicationSummary values={application} appliedAt={application.appliedAt} />
          </>
        )}
      </QueryState>
    </div>
  )
}
