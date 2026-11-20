import type { UseMutationResult } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { type ApiError, isApiError } from '@/shared/api/ApiError'
import { showToast } from '@/shared/ui'
import {
  type AdminCharge,
  CHARGE_CANCEL_RETRY_SAFE,
  CHARGE_NOT_FOUND_MESSAGE,
  CHARGE_TOSS_UNAVAILABLE_MESSAGE,
  ChargeAction,
  type ChargeReasonRequest,
  isAlreadyCanceledOnToss,
} from '../charges'
import { adminErrorMessage, isConflict } from '../errors'
import { useChargeActions, useChargeDetail, useChargeTargets } from '../queries'
import { AdminChargeDetailView } from '../views/AdminChargeDetailView'
import { AdminChargesView } from '../views/AdminChargesView'

// M-05 멈춘 충전 건 라우트 (관리자 콘솔 청크). 모두 Bearer ADMIN.
// ✅ GET /admin/wallets/charges · GET …/{chargeNo} · POST …/complete · fail · cancel-payment (BE #760)
// 오류: 404 → 목록으로, 409 → detail을 보여 주고 상세 다시 받기, 422 → 사유 칸, 503 → 잠시 뒤 다시 누르기(상세도 다시 받음)

const LIST_PATH = '/admin/charges'

export function AdminChargesPage() {
  const list = useChargeTargets()
  return (
    <AdminChargesView
      status={list.isError ? 'error' : list.isPending ? 'pending' : 'success'}
      errorMessage={list.error ? adminErrorMessage(list.error) : undefined}
      onRetry={() => void list.refetch()}
      charges={list.data ?? []}
      refreshing={list.isFetching && !list.isPending}
      onRefresh={() => void list.refetch()}
    />
  )
}

/** 처리 실패 문구. 409는 서버 detail(이유 문장)에 다시 불러온 것을 덧붙인다 */
function actionErrorMessage(error: unknown, action: ChargeAction): string {
  if (isApiError(error) && error.status === 503) {
    return action === ChargeAction.CANCEL_PAYMENT
      ? `${CHARGE_TOSS_UNAVAILABLE_MESSAGE}. ${CHARGE_CANCEL_RETRY_SAFE}`
      : CHARGE_TOSS_UNAVAILABLE_MESSAGE
  }
  const message = adminErrorMessage(error)
  return isConflict(error) ? `${message} 최신 상태를 다시 불러왔어요.` : message
}

export function AdminChargeDetailPage() {
  const { chargeNo: raw } = useParams()
  const chargeNo = raw?.trim() ? raw : null
  const navigate = useNavigate()
  const query = useChargeDetail(chargeNo)
  const { complete, fail, cancelPayment } = useChargeActions(chargeNo)
  const [actionError, setActionError] = useState<string | null>(null)
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  const status =
    chargeNo === null || query.error?.status === 404
      ? 'notFound'
      : query.isError
        ? 'error'
        : query.isPending
          ? 'pending'
          : 'success'

  const submitting = complete.isPending
    ? ChargeAction.COMPLETE
    : fail.isPending
      ? ChargeAction.FAIL
      : cancelPayment.isPending
        ? ChargeAction.CANCEL_PAYMENT
        : null

  const resetErrors = () => {
    setActionError(null)
    setReasonError(null)
    setModalError(null)
  }

  /** 404(그새 없어진 충전 건)는 목록으로 돌아간다 */
  const leaveIfGone = (error: unknown) => {
    if (!isApiError(error) || error.status !== 404) return false
    showToast({ message: CHARGE_NOT_FOUND_MESSAGE })
    navigate(LIST_PATH, { replace: true })
    return true
  }

  // 사유가 있는 처리. 409는 모달을 닫고 처리 카드에, 422·503 등은 모달을 열어 둔 채(throw) 보여 준다
  const withReason =
    (
      mutation: UseMutationResult<AdminCharge, ApiError, ChargeReasonRequest>,
      action: ChargeAction,
      success: string,
    ) =>
    async (reason: string) => {
      resetErrors()
      try {
        await mutation.mutateAsync({ reason })
        showToast({ message: success })
      } catch (error) {
        if (leaveIfGone(error)) return
        if (isConflict(error)) {
          setActionError(actionErrorMessage(error, action))
          return
        }
        const fieldError =
          isApiError(error) && error.status === 422 ? error.fieldErrors.reason : null
        if (fieldError) setReasonError(fieldError)
        else setModalError(actionErrorMessage(error, action))
        throw error
      }
    }

  const alreadyCanceled = query.data ? isAlreadyCanceledOnToss(query.data) : false

  return (
    <AdminChargeDetailView
      status={status}
      errorMessage={query.error ? adminErrorMessage(query.error) : undefined}
      onRetry={() => void query.refetch()}
      detail={query.data ?? null}
      refreshing={query.isFetching && !query.isPending}
      onRefresh={() => {
        setActionError(null)
        void query.refetch()
      }}
      submitting={submitting}
      actionError={actionError}
      reasonError={reasonError}
      modalError={modalError}
      onComplete={async () => {
        resetErrors()
        try {
          await complete.mutateAsync()
          showToast({ message: '잔액에 반영했어요' })
        } catch (error) {
          if (leaveIfGone(error)) return
          setActionError(actionErrorMessage(error, ChargeAction.COMPLETE))
        }
      }}
      onFail={withReason(fail, ChargeAction.FAIL, '실패로 처리했어요')}
      onCancelPayment={withReason(
        cancelPayment,
        ChargeAction.CANCEL_PAYMENT,
        alreadyCanceled ? '결제 취소를 기록했어요' : '결제를 취소했어요. 회원에게 환불돼요',
      )}
    />
  )
}
