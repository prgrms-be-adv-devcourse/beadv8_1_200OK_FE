import { useMemo } from 'react'
import { MediaPurpose, ProductStatus, type SellerProfileResponse } from '@/shared/api/types'
import { LOW_STOCK_THRESHOLD } from '@/shared/lib/constants'
import { showToast, useMediaUploads } from '@/shared/ui'
import { followers, homeAsOf, homeStats, myStore, todos } from '../fixtures'
import {
  useMemberId,
  useMyProducts,
  useMyProfile,
  useSaveMyProfile,
  useSellerBalance,
} from '../queries'
import type { ProfileFormValues } from '../schemas'
import type { SellerProductStats } from '../types'
import { SellerHomeView } from '../views/SellerHomeView'
import { type ProfileFieldErrors, SellerProfileView } from '../views/SellerProfileView'

// S-03 센터 홈 · S-09 상점 프로필 라우트 (판매자 센터 청크).
// ✅ 지갑 잔액 GET /wallets/sellers/me/balance, 프로필 GET/POST/PUT /sellers/me/profile, 사진 POST /media/SELLER_PROFILE,
//    상품 현황은 GET /sellers/me/products(최대 100개)에서 센다.
// TODO(api): 판매자 주문 목록·집계 API 없음(❌) → 오늘 요약·처리할 일은 fixtures. ❌ 팔로워 목록·수 → fixtures.

const EMPTY_STATS: SellerProductStats = { onSale: 0, ready: 0, lowStockProducts: 0 }

export function SellerHomePage() {
  const profile = useMyProfile()
  const balance = useSellerBalance()
  const products = useMyProducts({ page: 0, size: 100 })

  const productStats = useMemo<SellerProductStats>(() => {
    const list = products.data?.content
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
      asOf={homeAsOf}
      stats={homeStats}
      todos={todos}
      walletBalance={balance.data?.balance ?? 0}
      products={productStats}
      profileIncomplete={profileIncomplete}
      errorMessage={balance.error?.detail}
      onRetry={() => {
        void balance.refetch()
        void profile.refetch()
        void products.refetch()
      }}
    />
  )
}

export function SellerProfilePage() {
  const profile = useMyProfile()

  if (profile.data === undefined) {
    return (
      <SellerProfileView
        status={profile.isError ? 'error' : 'pending'}
        followerCount={0}
        photoUrl={null}
        onSave={() => {}}
        onPhotoChange={() => {}}
        onPhotoRemove={() => {}}
        followers={[]}
        onRetry={() => void profile.refetch()}
      />
    )
  }
  // 등록 ↔ 수정이 바뀌면(등록 성공) 폼·업로드 상태를 새로 만든다
  return <ProfileEditor key={profile.data ? 'edit' : 'register'} profile={profile.data} />
}

function ProfileEditor({ profile }: { profile: SellerProfileResponse | null }) {
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
      sellerId={sellerId ?? undefined}
      followerCount={registering ? 0 : myStore.followerCount}
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
      followers={registering ? [] : followers}
      hasMoreFollowers={!registering}
      onLoadMoreFollowers={() => {}}
    />
  )
}
