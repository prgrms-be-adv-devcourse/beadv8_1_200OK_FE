import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useSellerMenuStatus } from '@/features/sellerApply'
import type { ShippingAddress } from '@/shared/api/types'
import { walletBalanceQueryOptions } from '@/shared/api/walletBalance'
import { WITHDRAWAL_GRACE_DAYS } from '@/shared/lib/constants'
import { showToast } from '@/shared/ui'
import { followedFarms, likedProducts, myAddress, myOrderCounts, myProfile } from '../fixtures'
import { type AccountTab, AccountView } from '../views/AccountView'
import { type LikesTab, LikesView } from '../views/LikesView'
import { MyPageView } from '../views/MyPageView'

// 마이 묶음 라우트(/me, /me/likes, /me/account). 예치금은 ✅ GET /wallets/me/balance, 나머지는 fixtures를 화면 안에서만 바꾼다.
// 판매자 상태 카드는 sellerApply의 useSellerMenuStatus(토큰 역할 + ✅ GET /sellers/me/applications).
// TODO(api): ❌ 내 정보·관심·팔로우·배송지·비밀번호·탈퇴 API 없음. 상점 이름은 판매자 프로필(판매자 센터 청크)에 있어 여기선 보이지 않는다.

export function MyPage() {
  const balance = useQuery(walletBalanceQueryOptions())
  const sellerStatus = useSellerMenuStatus()
  return (
    <MyPageView
      status={balance.isPending ? 'pending' : balance.isError ? 'error' : 'success'}
      profile={myProfile}
      seller={{ status: sellerStatus }}
      balance={balance.data?.balance}
      maxBalance={balance.data?.maxBalance}
      orderCounts={myOrderCounts}
      likedCount={likedProducts.length}
      followingCount={followedFarms.length}
      addressSummary="서울 중구"
      onRetry={() => void balance.refetch()}
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
  const balance = useQuery(walletBalanceQueryOptions())
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
      withdrawBlock={balance.data && balance.data.balance === 0 ? null : 'balance'}
      balance={balance.data?.balance ?? 0}
      onWithdraw={() => {
        const date = new Date()
        date.setDate(date.getDate() + WITHDRAWAL_GRACE_DAYS)
        setCompletesAt(date.toISOString())
      }}
      withdrawCompletesAt={completesAt}
    />
  )
}
