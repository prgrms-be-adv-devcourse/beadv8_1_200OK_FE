import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useSellerMenuStatus } from '@/features/sellerApply'
import { toAddressRequest, toShippingAddress, useDefaultAddress } from '@/shared/api/defaultAddress'
import { myInfoQueryOptions } from '@/shared/api/memberInfo'
import { walletBalanceQueryOptions } from '@/shared/api/walletBalance'
import {
  addressErrorMessage,
  infoErrorMessage,
  toAddressSubmitErrors,
  toInfoSubmitErrors,
} from '../errors'
import { useSaveDefaultAddress, useUpdateMyInfo } from '../queries'
import { AccountNotConnectedView, type AccountTab } from '../views/AccountView'
import { type LikesTab, LikesView } from '../views/LikesView'
import { MyPageView } from '../views/MyPageView'

// 마이 묶음 라우트(/me, /me/likes, /me/account). 예치금은 ✅ GET /wallets/me/balance.
// 판매자 상태 카드는 sellerApply의 useSellerMenuStatus(토큰 역할 + ✅ GET /sellers/me/applications).
// API가 없는 곳은 가짜 데이터를 그리지 않고 ‘연결 전’으로 보여 준다(값은 넘기지 않는다).
// 프로필은 ✅ GET /members/me(못 받으면 프로필 자리만 안내, 나머지 화면은 그대로).
// 배송지는 ✅ GET·PUT /shipments/addresses/default (BUYER만. 판매자·관리자는 부르지 않고 ‘–’).
// TODO(api): 주문 상태별 집계, 📝 관심 상품·팔로우 농가, ❌ 비밀번호·탈퇴·배송지 삭제 API 없음.
//   상점 이름은 판매자 프로필(판매자 센터 청크)에 있어 여기선 보이지 않는다.

export function MyPage() {
  const balance = useQuery(walletBalanceQueryOptions())
  const sellerStatus = useSellerMenuStatus()
  const info = useQuery(myInfoQueryOptions())
  const address = useDefaultAddress()
  return (
    <MyPageView
      addressSummary={addressSummaryOf(address)}
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

/** 마이페이지 바로가기 요약(‘서울 중구’). 못 받았거나 BUYER가 아니면 undefined(‘–’), 등록 전이면 null */
function addressSummaryOf(query: ReturnType<typeof useDefaultAddress>): string | null | undefined {
  if (!query.enabled || query.data === undefined) return undefined
  return query.data === null ? null : query.data.address.split(' ').slice(0, 2).join(' ')
}

const accountTabs: AccountTab[] = ['info', 'password', 'address', 'withdraw']

export function AccountPage() {
  const [params, setParams] = useSearchParams()
  const tab = accountTabs.find((value) => value === params.get('tab')) ?? 'info'

  const info = useQuery(myInfoQueryOptions())
  const update = useUpdateMyInfo()
  const errors = useMemo(() => toInfoSubmitErrors(update.error), [update.error])
  const address = useDefaultAddress()
  const saveAddress = useSaveDefaultAddress()
  const addressErrors = useMemo(() => toAddressSubmitErrors(saveAddress.error), [saveAddress.error])
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
      address={{
        // BUYER가 아니면(판매자·관리자) 부르지 않는다 → 등록 전으로 보이게 하지 않고 안내만
        status: !address.enabled
          ? 'error'
          : address.isPending
            ? 'pending'
            : address.isError
              ? 'error'
              : 'success',
        address:
          address.data === undefined ? undefined : address.data && toShippingAddress(address.data),
        loadErrorMessage: !address.enabled
          ? '기본 배송지는 구매자 계정에서만 쓸 수 있어요'
          : address.isError
            ? addressErrorMessage(address.error)
            : undefined,
        onRetry: address.enabled ? () => void address.refetch() : undefined,
        onSave: (next) =>
          saveAddress.mutateAsync(toAddressRequest(next, address.data?.deliveryNote)),
        submitting: saveAddress.isPending,
        serverErrors: addressErrors.fields,
        errorMessage: addressErrors.message,
      }}
    />
  )
}
