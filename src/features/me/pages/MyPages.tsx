import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useSellerMenuStatus } from '@/features/sellerApply'
import { myInfoQueryOptions } from '@/shared/api/memberInfo'
import { walletBalanceQueryOptions } from '@/shared/api/walletBalance'
import { infoErrorMessage, toInfoSubmitErrors } from '../errors'
import { useUpdateMyInfo } from '../queries'
import { AccountNotConnectedView, type AccountTab } from '../views/AccountView'
import { type LikesTab, LikesView } from '../views/LikesView'
import { MyPageView } from '../views/MyPageView'

// 마이 묶음 라우트(/me, /me/likes, /me/account). 예치금은 ✅ GET /wallets/me/balance.
// 판매자 상태 카드는 sellerApply의 useSellerMenuStatus(토큰 역할 + ✅ GET /sellers/me/applications).
// API가 없는 곳은 가짜 데이터를 그리지 않고 ‘연결 전’으로 보여 준다(값은 넘기지 않는다).
// 프로필은 ✅ GET /members/me(못 받으면 프로필 자리만 안내, 나머지 화면은 그대로).
// TODO(api): 주문 상태별 집계, 📝 관심 상품·팔로우 농가, ❌ 배송지·비밀번호·탈퇴 API 없음.
//   상점 이름은 판매자 프로필(판매자 센터 청크)에 있어 여기선 보이지 않는다.

export function MyPage() {
  const balance = useQuery(walletBalanceQueryOptions())
  const sellerStatus = useSellerMenuStatus()
  const info = useQuery(myInfoQueryOptions())
  return (
    <MyPageView
      profile={info.data}
      profileError={info.isError ? infoErrorMessage(info.error) : undefined}
      onRetryProfile={() => void info.refetch()}
      status={balance.isPending ? 'pending' : balance.isError ? 'error' : 'success'}
      seller={{ status: sellerStatus }}
      balance={balance.data?.balance}
      maxBalance={balance.data?.maxBalance}
      onRetry={() => void balance.refetch()}
    />
  )
}

export function LikesPage() {
  const [params, setParams] = useSearchParams()
  const tab: LikesTab = params.get('tab') === 'farms' ? 'farms' : 'products'

  return (
    <LikesView
      status="notConnected"
      tab={tab}
      onTabChange={(next) => setParams({ tab: next }, { replace: true })}
    />
  )
}

const accountTabs: AccountTab[] = ['info', 'password', 'address', 'withdraw']

export function AccountPage() {
  const [params, setParams] = useSearchParams()
  const tab = accountTabs.find((value) => value === params.get('tab')) ?? 'info'

  const info = useQuery(myInfoQueryOptions())
  const update = useUpdateMyInfo()
  const errors = useMemo(() => toInfoSubmitErrors(update.error), [update.error])
  return (
    <AccountNotConnectedView
      tab={tab}
      onTabChange={(next) => setParams({ tab: next }, { replace: true })}
      info={{
        status: info.isPending ? 'pending' : info.isError ? 'error' : 'success',
        profile: info.data,
        loadErrorMessage: info.isError ? infoErrorMessage(info.error) : undefined,
        onRetry: () => void info.refetch(),
        onSave: (values) => update.mutate(values),
        submitting: update.isPending,
        serverErrors: errors.fields,
        errorMessage: errors.message,
        saved: update.isSuccess,
      }}
    />
  )
}
