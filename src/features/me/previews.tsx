import type { ScreenPreview } from '@/shared/lib/screenPreview'
import {
  followedFarms,
  likedProducts,
  MY_BALANCE,
  myAddress,
  myOrderCounts,
  myProfile,
} from './fixtures'
import {
  type AccountInfoPanelProps,
  AccountNotConnectedView,
  AccountView,
  type AccountViewProps,
} from './views/AccountView'
import { LikesView, type LikesViewProps } from './views/LikesView'
import { MyPageView, type MyPageViewProps } from './views/MyPageView'

// /__design 화면 상태 갤러리 (개발 전용, app/dev만 import한다). 마이 묶음은 MyPageLayout 안에서 그린다.

const noop = () => {}

const infoPanel: AccountInfoPanelProps = { status: 'success', profile: myProfile, onSave: noop }

const my = (props: Partial<MyPageViewProps> = {}) => (
  <MyPageView
    status="success"
    profile={myProfile}
    seller={{ status: 'none' }}
    balance={MY_BALANCE}
    maxBalance={500_000}
    orderCounts={myOrderCounts}
    likedCount={likedProducts.length}
    followingCount={followedFarms.length}
    addressSummary="서울 중구"
    {...props}
  />
)

const likes = (props: Partial<LikesViewProps> = {}) => (
  <LikesView
    status="success"
    tab="products"
    onTabChange={noop}
    products={likedProducts}
    farms={followedFarms}
    onUnlike={noop}
    onUnfollow={noop}
    {...props}
  />
)

const account = (props: Partial<AccountViewProps> = {}) => (
  <AccountView
    tab="info"
    onTabChange={noop}
    profile={myProfile}
    onSaveInfo={noop}
    onChangePassword={noop}
    address={myAddress}
    onSaveAddress={noop}
    onDeleteAddress={noop}
    balance={MY_BALANCE}
    onWithdraw={noop}
    {...props}
  />
)

export const mePreviews: ScreenPreview[] = [
  {
    id: 'mypage',
    title: 'B-12 마이페이지',
    layout: 'mypage',
    path: '/me',
    tabBar: true,
    states: [
      {
        id: 'not-connected',
        label: '연결 전 (지금 화면: 개수·배송지)',
        render: () =>
          my({
            orderCounts: undefined,
            likedCount: undefined,
            followingCount: undefined,
            addressSummary: undefined,
          }),
      },
      {
        id: 'profile-loading',
        label: '프로필 불러오는 중',
        render: () => my({ profile: undefined }),
      },
      {
        id: 'profile-error',
        label: '프로필 오류',
        render: () =>
          my({
            profile: undefined,
            profileError: '요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요',
            onRetryProfile: noop,
          }),
      },
      { id: 'buyer', label: '구매자', render: () => my() },
      {
        id: 'applying',
        label: '판매자 신청 중',
        sellerStatus: 'applying',
        render: () => my({ seller: { status: 'applying' } }),
      },
      {
        id: 'seller',
        label: '판매자',
        session: 'seller',
        sellerStatus: 'approved',
        render: () => my({ seller: { status: 'approved', storeName: '청송 햇살농원' } }),
      },
      { id: 'no-address', label: '배송지 없음', render: () => my({ addressSummary: null }) },
      { id: 'loading', label: '로딩', render: () => my({ status: 'pending' }) },
    ],
  },
  {
    id: 'likes',
    title: 'B-14 관심 상품 · 팔로우한 농가',
    layout: 'mypage',
    path: '/me/likes?tab=products',
    tabBar: true,
    states: [
      {
        id: 'not-connected',
        label: '연결 전 (지금 화면)',
        render: () => likes({ status: 'notConnected', products: undefined, farms: undefined }),
      },
      {
        id: 'not-connected-farms',
        label: '연결 전 · 팔로우 탭',
        path: '/me/likes?tab=farms',
        render: () =>
          likes({ status: 'notConnected', tab: 'farms', products: undefined, farms: undefined }),
      },
      { id: 'products', label: '관심 상품 (품절·판매 종료)', render: () => likes() },
      {
        id: 'farms',
        label: '팔로우한 농가 (판매 중지)',
        path: '/me/likes?tab=farms',
        render: () => likes({ tab: 'farms' }),
      },
      { id: 'empty-products', label: '관심 상품 없음', render: () => likes({ products: [] }) },
      {
        id: 'empty-farms',
        label: '팔로우 없음',
        path: '/me/likes?tab=farms',
        render: () => likes({ tab: 'farms', farms: [] }),
      },
      {
        id: 'unliked',
        label: '관심 해제 토스트',
        toast: { message: '관심 상품에서 뺐어요' },
        render: () => likes(),
      },
    ],
  },
  {
    id: 'account',
    title: 'B-15 계정 관리',
    layout: 'mypage',
    path: '/me/account?tab=info',
    states: [
      {
        id: 'not-connected',
        label: '연결 전 · 비밀번호 탭',
        path: '/me/account?tab=password',
        render: () => (
          <AccountNotConnectedView tab="password" onTabChange={noop} info={infoPanel} />
        ),
      },
      {
        id: 'not-connected-address',
        label: '연결 전 · 배송지 탭',
        path: '/me/account?tab=address',
        render: () => <AccountNotConnectedView tab="address" onTabChange={noop} info={infoPanel} />,
      },
      {
        id: 'info-live',
        label: '내 정보 (지금 화면)',
        render: () => <AccountNotConnectedView tab="info" onTabChange={noop} info={infoPanel} />,
      },
      {
        id: 'info-saved',
        label: '내 정보 · 저장함',
        render: () => (
          <AccountNotConnectedView
            tab="info"
            onTabChange={noop}
            info={{ ...infoPanel, saved: true }}
          />
        ),
      },
      {
        id: 'info-field-error',
        label: '내 정보 · 칸 오류(422)',
        render: () => (
          <AccountNotConnectedView
            tab="info"
            onTabChange={noop}
            info={{
              ...infoPanel,
              serverErrors: { nickname: '닉네임은 2자 이상 30자 이하여야 합니다.' },
            }}
          />
        ),
      },
      {
        id: 'info-error',
        label: '내 정보 · 저장 실패',
        render: () => (
          <AccountNotConnectedView
            tab="info"
            onTabChange={noop}
            info={{
              ...infoPanel,
              errorMessage: '내 정보를 찾을 수 없어요. 탈퇴했거나 없는 계정이에요',
            }}
          />
        ),
      },
      {
        id: 'info-load-error',
        label: '내 정보 · 불러오기 실패',
        render: () => (
          <AccountNotConnectedView
            tab="info"
            onTabChange={noop}
            info={{
              status: 'error',
              onSave: noop,
              loadErrorMessage: '요청을 처리하지 못했어요',
              onRetry: noop,
            }}
          />
        ),
      },
      {
        id: 'info-loading',
        label: '내 정보 · 로딩',
        render: () => (
          <AccountNotConnectedView
            tab="info"
            onTabChange={noop}
            info={{ status: 'pending', onSave: noop }}
          />
        ),
      },
      { id: 'info', label: '내 정보 (시안 전체)', render: () => account() },
      {
        id: 'password',
        label: '비밀번호',
        path: '/me/account?tab=password',
        render: () => account({ tab: 'password' }),
      },
      {
        id: 'password-wrong',
        label: '현재 비밀번호 틀림',
        path: '/me/account?tab=password',
        render: () =>
          account({
            tab: 'password',
            passwordErrors: { currentPassword: '현재 비밀번호가 맞지 않아요' },
          }),
      },
      {
        id: 'address',
        label: '배송지 1개',
        path: '/me/account?tab=address',
        render: () => account({ tab: 'address' }),
      },
      {
        id: 'address-edit',
        label: '배송지 수정',
        path: '/me/account?tab=address',
        render: () => account({ tab: 'address', defaultModal: 'address' }),
      },
      {
        id: 'address-delete',
        label: '배송지 삭제 확인',
        path: '/me/account?tab=address',
        render: () => account({ tab: 'address', defaultModal: 'deleteAddress' }),
      },
      {
        id: 'address-none',
        label: '배송지 없음',
        path: '/me/account?tab=address',
        render: () => account({ tab: 'address', address: null }),
      },
      {
        id: 'withdraw-balance',
        label: '탈퇴 차단 · 잔액',
        path: '/me/account?tab=withdraw',
        render: () => account({ tab: 'withdraw', withdrawBlock: 'balance' }),
      },
      {
        id: 'withdraw-pending',
        label: '탈퇴 차단 · 진행 중',
        path: '/me/account?tab=withdraw',
        render: () => account({ tab: 'withdraw', withdrawBlock: 'pending' }),
      },
      {
        id: 'withdraw-seller',
        label: '탈퇴 차단 · 판매자',
        path: '/me/account?tab=withdraw',
        render: () => account({ tab: 'withdraw', withdrawBlock: 'seller' }),
      },
      {
        id: 'withdraw-confirm',
        label: '탈퇴 확인',
        path: '/me/account?tab=withdraw',
        render: () => account({ tab: 'withdraw', balance: 0, defaultModal: 'withdraw' }),
      },
      {
        id: 'withdraw-done',
        label: '탈퇴 신청 완료',
        path: '/me/account?tab=withdraw',
        render: () =>
          account({ tab: 'withdraw', balance: 0, withdrawCompletesAt: '2026-10-25T10:00:00' }),
      },
    ],
  },
]
