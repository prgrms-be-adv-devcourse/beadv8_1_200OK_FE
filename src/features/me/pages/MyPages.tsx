import { useState } from 'react'
import { useSearchParams } from 'react-router'
import type { ShippingAddress } from '@/shared/api/types'
import { WITHDRAWAL_GRACE_DAYS } from '@/shared/lib/constants'
import { showToast } from '@/shared/ui'
import {
  followedFarms,
  likedProducts,
  MY_BALANCE,
  myAddress,
  myOrderCounts,
  myProfile,
} from '../fixtures'
import { type AccountTab, AccountView } from '../views/AccountView'
import { type LikesTab, LikesView } from '../views/LikesView'
import { MyPageView } from '../views/MyPageView'

// 마이 묶음 라우트(/me, /me/likes, /me/account). 1단계: fixtures를 화면 안에서만 바꾼다.
// TODO(api): 📝 내 정보·지갑·관심·팔로우·배송지·비밀번호·탈퇴. 판매자 상태는 2-0(0-4) 역할 판단 방법이 정해지면

export function MyPage() {
  return (
    <MyPageView
      status="success"
      profile={myProfile}
      seller={{ status: 'none' }}
      balance={MY_BALANCE}
      orderCounts={myOrderCounts}
      likedCount={likedProducts.length}
      followingCount={followedFarms.length}
      addressSummary="서울 중구"
    />
  )
}

export function LikesPage() {
  const [params, setParams] = useSearchParams()
  const tab: LikesTab = params.get('tab') === 'farms' ? 'farms' : 'products'
  const [products, setProducts] = useState(likedProducts)
  const [farms, setFarms] = useState(followedFarms)

  return (
    <LikesView
      status="success"
      tab={tab}
      onTabChange={(next) => setParams({ tab: next }, { replace: true })}
      products={products}
      farms={farms}
      onUnlike={(id) => {
        setProducts((current) => current.filter((item) => item.product.productId !== id))
        showToast({ message: '관심 상품에서 뺐어요' })
      }}
      onUnfollow={(id) => {
        setFarms((current) => current.filter((farm) => farm.seller.sellerId !== id))
        showToast({ message: '팔로우를 취소했어요' })
      }}
    />
  )
}

const accountTabs: AccountTab[] = ['info', 'password', 'address', 'withdraw']

export function AccountPage() {
  const [params, setParams] = useSearchParams()
  const tab = accountTabs.find((value) => value === params.get('tab')) ?? 'info'
  const [address, setAddress] = useState<ShippingAddress | null>(myAddress)
  const [completesAt, setCompletesAt] = useState<string | null>(null)

  return (
    <AccountView
      tab={tab}
      onTabChange={(next) => setParams({ tab: next }, { replace: true })}
      profile={myProfile}
      onSaveInfo={() => showToast({ message: '내 정보를 저장했어요' })}
      onChangePassword={() => showToast({ message: '비밀번호를 바꿨어요' })}
      address={address}
      onSaveAddress={(next) => {
        setAddress(next)
        showToast({ message: '배송지를 저장했어요' })
      }}
      onDeleteAddress={() => {
        setAddress(null)
        showToast({ message: '배송지를 삭제했어요' })
      }}
      withdrawBlock="balance"
      balance={MY_BALANCE}
      onWithdraw={() => {
        const date = new Date()
        date.setDate(date.getDate() + WITHDRAWAL_GRACE_DAYS)
        setCompletesAt(date.toISOString())
      }}
      withdrawCompletesAt={completesAt}
    />
  )
}
