import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { isApiError } from '@/shared/api/ApiError'
import { getAuthSession, subscribeAuth } from '@/shared/api/authToken'
import { reissueSession } from '@/shared/api/reissue'
import { MemberRole } from '@/shared/api/types'
import { toServerDateTime } from '@/shared/lib/dateRange'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { QueryState, showToast } from '@/shared/ui'
import { toApplyFailure } from '../errors'
import { sellerApplyKeys, useApplySeller, useMyApplication, useMyApplications } from '../queries'
import { formatBusinessNumber } from '../schemas'
import { type CompletedApplication, SellerApplyView } from '../views/SellerApplyView'
import { SellerStatusView } from '../views/SellerStatusView'

// S-01 · S-02 판매자 신청 라우트.
// ✅ POST /sellers/me/applications, GET /sellers/me/applications, GET .../applications/{id}, 승인 뒤 POST /auth/reissue.
// 신청: 진행 중(심사 대기·심사 중·승인)인 신청이 있으면 현황으로 보낸다. 반려만 있으면 ?reapply=1로 전 내용을 채워 다시 신청.
// 현황: 승인됐는데 토큰이 아직 BUYER면 재발급으로 SELLER 권한을 받고 판매자 센터로 보낸다(한 번 자동, 실패하면 버튼으로 다시).

const S = SellerApplicationStatus

export function SellerApplyPage() {
  const [params] = useSearchParams()
  const reapply = params.get('reapply') === '1'
  const history = useMyApplications()
  const latest = history.data?.[0]
  const rejected = latest?.status === S.REJECTED
  const previous = useMyApplication(reapply && rejected ? latest.applicationId : null)
  const apply = useApplySeller()
  const [done, setDone] = useState<CompletedApplication | null>(null)
  const failure = useMemo(() => toApplyFailure(apply.error), [apply.error])

  if (done) return <SellerApplyView onSubmit={() => {}} completed={done} />
  if (history.isPending || (reapply && rejected && previous.isPending)) {
    return <QueryState status="pending" loadingLabel="신청 내역을 확인하고 있어요" />
  }
  if (history.isError) {
    return (
      <QueryState
        status="error"
        errorMessage={history.error.detail}
        onRetry={() => void history.refetch()}
      />
    )
  }
  if (latest && !rejected) return <Navigate to="/seller/apply/status" replace />

  const defaultValues =
    reapply && previous.data
      ? {
          storeName: previous.data.storeName,
          representativeName: previous.data.representativeName,
          businessNumber: previous.data.businessNumber,
        }
      : undefined

  return (
    <SellerApplyView
      defaultValues={defaultValues}
      rejectReason={reapply ? (latest?.rejectReason ?? null) : null}
      submitting={apply.isPending}
      serverErrors={failure.serverErrors}
      errorMessage={failure.errorMessage}
      onSubmit={(values) => {
        const body = { ...values, businessNumber: formatBusinessNumber(values.businessNumber) }
        apply.mutate(body, {
          onSuccess: ({ applicationId }) => {
            setDone({ ...body, applicationId, appliedAt: toServerDateTime(new Date()) })
            showToast({ message: '판매자 등록을 신청했어요' })
          },
        })
      }}
    />
  )
}

export function SellerStatusPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = useSyncExternalStore(subscribeAuth, getAuthSession, getAuthSession)
  const history = useMyApplications()
  const latest = history.data?.[0]
  const detail = useMyApplication(latest?.applicationId ?? null)
  const [granting, setGranting] = useState(false)
  const [grantError, setGrantError] = useState<string | null>(null)
  const autoGranted = useRef(false)

  const needsGrant =
    latest?.status === S.APPROVED &&
    session !== null &&
    session.role !== MemberRole.SELLER &&
    session.role !== MemberRole.ADMIN

  const grant = useCallback(() => {
    setGranting(true)
    setGrantError(null)
    reissueSession()
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: sellerApplyKeys.all })
        showToast({ message: '판매자 권한을 받았어요' })
        navigate('/seller', { replace: true })
      })
      .catch((error: unknown) => {
        setGrantError(isApiError(error) ? error.detail : '권한을 받지 못했어요. 다시 시도해 주세요')
      })
      .finally(() => setGranting(false))
  }, [navigate, queryClient])

  // 승인을 확인하면 한 번은 자동으로 권한을 받는다. 실패하면 버튼으로 다시 시도
  useEffect(() => {
    if (!needsGrant || autoGranted.current) return
    autoGranted.current = true
    grant()
  }, [needsGrant, grant])

  return (
    <SellerStatusView
      status={history.isError ? 'error' : history.isPending ? 'pending' : 'success'}
      application={latest}
      detail={detail.isError ? null : detail.data}
      history={history.data?.slice(1) ?? []}
      // 재발급이 실패하면 세션이 끝나(가드가 로그인으로 보낸다) needsGrant가 꺼지지만, 그 전까지 이유는 보여 준다
      grantSeller={
        needsGrant || grantError !== null ? { onGrant: grant, granting, error: grantError } : null
      }
      errorMessage={history.error?.detail}
      onRetry={() => {
        void history.refetch()
        void detail.refetch()
      }}
    />
  )
}
