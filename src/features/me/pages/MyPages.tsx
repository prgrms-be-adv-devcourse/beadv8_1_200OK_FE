import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useSellerMenuStatus } from '@/features/sellerApply'
import { isApiError } from '@/shared/api/ApiError'
import { toAddressRequest, toShippingAddress, useDefaultAddress } from '@/shared/api/defaultAddress'
import { myInfoQueryOptions } from '@/shared/api/memberInfo'
import { walletBalanceQueryOptions } from '@/shared/api/walletBalance'
import { useWishAccess, WISH_ADMIN_REASON, wishPageQueryOptions } from '@/shared/api/wishes'
import { showToast, useWishToggle } from '@/shared/ui'
import {
  addressErrorMessage,
  infoErrorMessage,
  toAddressSubmitErrors,
  toInfoSubmitErrors,
  toPasswordSubmitErrors,
} from '../errors'
import {
  LIKES_PAGE_SIZE,
  productSummariesQueryOptions,
  useChangePassword,
  useSaveDefaultAddress,
  useUpdateMyInfo,
} from '../queries'
import { AccountNotConnectedView, type AccountTab } from '../views/AccountView'
import { type LikesTab, LikesView } from '../views/LikesView'
import { MyPageView } from '../views/MyPageView'

// 마이 묶음 라우트(/me, /me/likes, /me/account). 예치금은 ✅ GET /wallets/me/balance.
// 판매자 상태 카드는 sellerApply의 useSellerMenuStatus(토큰 역할 + ✅ GET /sellers/me/applications).
// API가 없는 곳은 가짜 데이터를 그리지 않고 ‘연결 전’으로 보여 준다(값은 넘기지 않는다).
// 프로필은 ✅ GET /members/me(못 받으면 프로필 자리만 안내, 나머지 화면은 그대로).
// 배송지는 ✅ GET·PUT /shipments/addresses/default (BUYER만. 판매자·관리자는 부르지 않고 ‘–’).
// 비밀번호 변경은 ✅ PATCH /members/me/password. 성공하면 서버가 모든 토큰을 무효로 만들어 세션을 끝내고 /login으로 보낸다.
// 관심 상품은 ✅ GET /members/me/wishes(찜 ID·개수) + GET /products/summaries(카드). 구매자·판매자만 부르고 관리자는 안내만.
// TODO(api): 주문 상태별 집계, 📝 팔로우 농가, ❌ 탈퇴·배송지 삭제 API 없음.
//   상점 이름은 판매자 프로필(판매자 센터 청크)에 있어 여기선 보이지 않는다.

export function MyPage() {
  const balance = useQuery(walletBalanceQueryOptions())
  const sellerStatus = useSellerMenuStatus()
  const info = useQuery(myInfoQueryOptions())
  const address = useDefaultAddress()
  const likes = useWishListPage(0)
  return (
    <MyPageView
      likedCount={likes.data?.totalElements}
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

/** 내 찜 목록 한 페이지(0부터). 구매자·판매자일 때만 부른다 */
function useWishListPage(page: number) {
  const { access, memberId } = useWishAccess()
  return useQuery({
    ...wishPageQueryOptions(memberId ?? 0, page, LIKES_PAGE_SIZE),
    enabled: access === 'buyer' && memberId !== undefined,
    // 페이지를 옮기거나 해제 뒤 다시 부를 때 화면 전체가 로딩으로 깜빡이지 않게 이전 목록을 둔다
    placeholderData: keepPreviousData,
  })
}

const asPage = (value: string | null) => {
  const page = Number(value)
  return Number.isInteger(page) && page > 1 ? page : 1
}

export function LikesPage() {
  const [params, setParams] = useSearchParams()
  const tab: LikesTab = params.get('tab') === 'farms' ? 'farms' : 'products'
  const page = asPage(params.get('page'))
  const list = useWishListPage(page - 1)
  // 관심 상품 화면은 로그인해야 들어온다(RequireAuth). 하트는 찜 ID 집합으로 그린다
  const wishes = useWishToggle(() => {})
  const ids = list.data?.content.map((wish) => wish.productId) ?? []
  const summaries = useQuery({
    ...productSummariesQueryOptions(ids),
    enabled: ids.length > 0,
    placeholderData: keepPreviousData,
  })
  const totalPages = list.data?.totalPages ?? 0

  // 마지막 페이지의 찜을 모두 빼면 빈 페이지가 남으므로 마지막 페이지로 옮긴다
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setParams({ tab: 'products', page: String(totalPages) }, { replace: true })
    }
  }, [page, totalPages, setParams])

  // 찜 ID를 아직 모르면 이 목록에 있으니 찜한 것으로 본다
  const likedOf = (productId: number) => (wishes.known ? wishes.isWished(productId) : true)
  const cards = ids.length === 0 ? [] : (summaries.data ?? [])
  const error = list.error ?? summaries.error
  const status =
    wishes.access === 'admin' || list.isError || (ids.length > 0 && summaries.isError)
      ? 'error'
      : list.data && (ids.length === 0 || summaries.data)
        ? 'success'
        : 'pending'

  return (
    <LikesView
      status={status}
      tab={tab}
      onTabChange={(next) => setParams({ tab: next }, { replace: true })}
      products={cards.map((product) => ({ product, liked: likedOf(product.productId) }))}
      totalCount={list.data?.totalElements}
      // 이전 카드를 잠깐 두는 동안에는 숨김 수를 셈하지 않는다
      hiddenCount={summaries.isPlaceholderData ? 0 : Math.max(0, ids.length - cards.length)}
      page={page}
      totalPages={totalPages}
      onPageChange={(next) => setParams({ tab: 'products', page: String(next) })}
      errorMessage={
        wishes.access === 'admin' ? WISH_ADMIN_REASON : isApiError(error) ? error.detail : undefined
      }
      onToggleLike={
        wishes.access === 'buyer'
          ? (productId) => wishes.toggle(productId, likedOf(productId))
          : undefined
      }
      onRetry={
        wishes.access === 'admin'
          ? undefined
          : () => void (list.isError ? list.refetch() : summaries.refetch())
      }
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
  const navigate = useNavigate()
  const changePassword = useChangePassword(() => {
    showToast({ message: '비밀번호를 바꿨어요. 새 비밀번호로 다시 로그인해 주세요' })
    void navigate('/login', { replace: true })
  })
  const passwordErrors = useMemo(
    () => toPasswordSubmitErrors(changePassword.error),
    [changePassword.error],
  )
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
      password={{
        onSave: (values) => changePassword.mutate(values),
        submitting: changePassword.isPending,
        serverErrors: passwordErrors.fields,
        errorMessage: passwordErrors.message,
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
