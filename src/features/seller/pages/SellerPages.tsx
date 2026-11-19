import { useMemo } from 'react'
import { MediaPurpose, ProductStatus, type SellerProfileResponse } from '@/shared/api/types'
import { LOW_STOCK_THRESHOLD } from '@/shared/lib/constants'
import { showToast, useMediaUploads } from '@/shared/ui'
import {
  useAllMyProducts,
  useApprovedApplicationPostalCode,
  useMemberId,
  useMyProfile,
  usePayoutOutlook,
  useSaveMyProfile,
  useSellerBalance,
  useSellerReviewOverview,
} from '../queries'
import type { ProfileFormValues } from '../schemas'
import type { SellerProductStats } from '../types'
import { SellerHomeView } from '../views/SellerHomeView'
import { type ProfileFieldErrors, SellerProfileView } from '../views/SellerProfileView'

// S-03 센터 홈 · S-09 상점 프로필 라우트 (판매자 센터 청크).
// ✅ 지갑 잔액 GET /wallets/sellers/me/balance, 프로필 GET/POST/PUT /sellers/me/profile, 사진 POST /media/SELLER_PROFILE,
//    상품 현황은 GET /sellers/me/products(전부)에서 센다. 리뷰 분석 요약은 S-10과 같은 쿼리(캐시 공유).
//    출고지 우편번호가 프로필에 없으면 GET /sellers/me/applications(+ /{id})의 승인 신청 값으로 채운다.
//    정산 예정 금액은 GET /payouts/me/candidates?unsettledOnly=true 합계(정산 내역 화면과 같은 쿼리).
// TODO(api): ❌ 판매자 주문 목록·집계 API 없음 → 오늘 요약 건수는 ‘–’, 처리할 일은 연결 전(NotConnected).
// TODO(api): ❌ 팔로워 목록·수 API 없음 → 팔로워 수는 ‘–’, 목록은 연결 전(NotConnected).

const EMPTY_STATS: SellerProductStats = { onSale: 0, ready: 0, lowStockProducts: 0 }

export function SellerHomePage() {
  const profile = useMyProfile()
  const balance = useSellerBalance()
  const products = useAllMyProducts()
  const reviews = useSellerReviewOverview()
  // 후보 조회가 실패해도 홈은 보여 준다(정산 예정 칸만 ‘–’)
  const outlook = usePayoutOutlook()

  const productStats = useMemo<SellerProductStats>(() => {
    const list = products.data
    if (!list) return EMPTY_STATS
    return {
      onSale: list.filter((p) => p.status === ProductStatus.ON_SALE).length,
      ready: list.filter((p) => p.status === ProductStatus.READY).length,
      lowStockProducts: list.filter(
        (p) => p.status !== ProductStatus.ENDED && p.availableStock <= LOW_STOCK_THRESHOLD,
      ).length,
    }
  }, [products.data])

  const profileIncomplete =
    profile.data === null || !profile.data?.introduction || !profile.data?.profileImageUrl

  return (
    <SellerHomeView
      status={
        balance.isError ? 'error' : balance.isPending || profile.isPending ? 'pending' : 'success'
      }
      stats={null}
      expectedPayout={outlook.data?.expectedAmount ?? null}
      expectedPayoutPending={outlook.isPending}
      todos={null}
      walletBalance={balance.data?.balance ?? 0}
      products={productStats}
      profileIncomplete={profileIncomplete}
      reviews={reviews}
      errorMessage={balance.error?.detail}
      onRetry={() => {
        void balance.refetch()
        void profile.refetch()
        void products.refetch()
        void outlook.refetch()
      }}
    />
  )
}

export function SellerProfilePage() {
  const profile = useMyProfile()
  // 프로필에 출고지 우편번호가 없으면(미등록·이 칸이 생기기 전 프로필) 승인된 신청 당시 값을 기본값으로 쓴다
  const fallback = useApprovedApplicationPostalCode(
    profile.data !== undefined && !profile.data?.originPostalCode,
  )

  // 폼은 처음 값으로만 채우므로 기본값을 받을 때까지 기다린다(못 받으면 빈 칸)
  if (profile.data === undefined || fallback.pending) {
    return (
      <SellerProfileView
        status={profile.isError ? 'error' : 'pending'}
        followerCount={null}
        photoUrl={null}
        onSave={() => {}}
        onPhotoChange={() => {}}
        onPhotoRemove={() => {}}
        followers={null}
        onRetry={() => void profile.refetch()}
      />
    )
  }
  // 등록 ↔ 수정이 바뀌면(등록 성공) 폼·업로드 상태를 새로 만든다
  return (
    <ProfileEditor
      key={profile.data ? 'edit' : 'register'}
      profile={profile.data}
      fallbackPostalCode={fallback.postalCode}
    />
  )
}

function ProfileEditor({
  profile,
  fallbackPostalCode,
}: {
  profile: SellerProfileResponse | null
  fallbackPostalCode: string | null
}) {
  const sellerId = useMemberId()
  const photos = useMediaUploads(
    MediaPurpose.SELLER_PROFILE,
    profile?.profileImageUrl ? [{ url: profile.profileImageUrl, alt: '프로필 사진' }] : [],
  )
  const save = useSaveMyProfile()
  const registering = profile === null

  const failure = useMemo(() => {
    const error = save.error
    if (!error) return { serverErrors: undefined, errorMessage: null, photoError: null }
    if (error.status === 422 && error.errors.length > 0) {
      const { profileImageUrl, ...fields } = error.fieldErrors
      const serverErrors = fields as ProfileFieldErrors
      return {
        serverErrors: Object.keys(serverErrors).length > 0 ? serverErrors : undefined,
        errorMessage: Object.keys(serverErrors).length > 0 || profileImageUrl ? null : error.detail,
        photoError: profileImageUrl ?? null,
      }
    }
    return { serverErrors: undefined, errorMessage: error.detail, photoError: null }
  }, [save.error])

  const removeAll = () => {
    for (const item of photos.items) photos.remove(item.id)
  }

  return (
    <SellerProfileView
      status="success"
      profile={profile}
      fallbackPostalCode={fallbackPostalCode}
      sellerId={sellerId ?? undefined}
      // TODO(api): ❌ 팔로워 수·목록 API 없음 → null(연결 전)
      followerCount={null}
      photoUrl={photos.items[0]?.url ?? null}
      onPhotoChange={(file) => {
        removeAll()
        photos.add([file])
      }}
      onPhotoRemove={removeAll}
      photoUploading={photos.uploading}
      photoError={failure.photoError ?? photos.error}
      uploading={photos.uploading}
      saving={save.isPending}
      serverErrors={failure.serverErrors}
      errorMessage={failure.errorMessage}
      onSave={(values: ProfileFormValues) =>
        save.mutate(
          {
            ...values,
            introduction: values.introduction || null,
            profileImageUrl: photos.urls[0] ?? null,
          },
          {
            onSuccess: () =>
              showToast({
                message: registering ? '상점 프로필을 등록했어요' : '상점 프로필을 저장했어요',
              }),
          },
        )
      }
      followers={null}
    />
  )
}
