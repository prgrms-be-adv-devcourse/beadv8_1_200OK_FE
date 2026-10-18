import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { SellerApplicationStatus } from '@/shared/lib/sellerApplicationState'
import { showToast } from '@/shared/ui'
import { applications } from '../fixtures'
import type { SellerApplication } from '../types'
import { SellerApplyView } from '../views/SellerApplyView'
import { SellerStatusView } from '../views/SellerStatusView'

// S-01 · S-02 판매자 신청 라우트. 1단계: fixtures.
// TODO(api): 📝 POST /sellers, 신청 현황 조회 API 없음(❌). 409(사업자번호 중복)는 serverErrors.businessNumber로

export function SellerApplyPage() {
  const [params] = useSearchParams()
  const reapply = params.get('reapply') === '1'
  const rejected = applications[SellerApplicationStatus.REJECTED]
  const [done, setDone] = useState<SellerApplication | null>(null)

  return (
    <SellerApplyView
      defaultValues={reapply ? rejected : undefined}
      rejectReason={reapply ? rejected.rejectReason : null}
      completed={done}
      onSubmit={(values) => {
        setDone({
          ...values,
          status: SellerApplicationStatus.APPLIED,
          appliedAt: new Date().toISOString(),
          reviewStartedAt: null,
          decidedAt: null,
          suspendedAt: null,
          rejectReason: null,
        })
        showToast({ message: '판매자 등록을 신청했어요' })
      }}
    />
  )
}

export function SellerStatusPage() {
  return (
    <SellerStatusView
      status="success"
      application={applications[SellerApplicationStatus.UNDER_REVIEW]}
    />
  )
}
