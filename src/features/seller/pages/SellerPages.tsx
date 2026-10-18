import { useState } from 'react'
import type { SellerProfile } from '@/shared/api/types'
import { showToast } from '@/shared/ui'
import {
  followers,
  homeAsOf,
  homeStats,
  myStore,
  productStats,
  sellerWalletBalance,
  todos,
} from '../fixtures'
import { SellerHomeView } from '../views/SellerHomeView'
import { SellerProfileView } from '../views/SellerProfileView'

// S-03 센터 홈 · S-09 상점 프로필 라우트 (판매자 센터 청크). 1단계: fixtures.
// TODO(api): 센터 홈 집계 API 없음(❌), 📝 GET/PATCH /sellers/me, 팔로워 목록, 사진은 POST /media/SELLER_PROFILE

export function SellerHomePage() {
  return (
    <SellerHomeView
      status="success"
      asOf={homeAsOf}
      stats={homeStats}
      todos={todos}
      walletBalance={sellerWalletBalance}
      products={productStats}
    />
  )
}

export function SellerProfilePage() {
  const [profile, setProfile] = useState<SellerProfile>(myStore)

  return (
    <SellerProfileView
      status="success"
      profile={profile}
      onSave={(values) => {
        setProfile((current) => ({ ...current, ...values }))
        showToast({ message: '상점 프로필을 저장했어요' })
      }}
      onPhotoChange={(file) => {
        setProfile((current) => ({ ...current, profileImageUrl: URL.createObjectURL(file) }))
        showToast({ message: '프로필 사진을 바꿨어요' })
      }}
      onPhotoRemove={() => setProfile((current) => ({ ...current, profileImageUrl: null }))}
      followers={followers}
      hasMoreFollowers
      onLoadMoreFollowers={() => {}}
    />
  )
}
