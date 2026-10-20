import type { ScreenPreview } from '@/shared/lib/screenPreview'
import {
  followedFarms,
  likedProducts,
  MY_BALANCE,
  myAddress,
  myOrderCounts,
  myProfile,
} from './fixtures'
import { AccountNotConnectedView, AccountView, type AccountViewProps } from './views/AccountView'
import { LikesView, type LikesViewProps } from './views/LikesView'
import { MyPageView, type MyPageViewProps } from './views/MyPageView'

// /__design 화면 상태 갤러리 (개발 전용, app/dev만 import한다). 마이 묶음은 MyPageLayout 안에서 그린다.

const noop = () => {}

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
        label: '연결 전 (지금 화면: 프로필·개수·배송지)',
        render: () =>
          my({
            profile: undefined,
            orderCounts: undefined,
            likedCount: undefined,
            followingCount: undefined,
            addressSummary: undefined,
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
        label: '연결 전 (지금 화면)',
        render: () => <AccountNotConnectedView tab="info" onTabChange={noop} />,
      },
      {
        id: 'not-connected-address',
        label: '연결 전 · 배송지 탭',
        path: '/me/account?tab=address',
        render: () => <AccountNotConnectedView tab="address" onTabChange={noop} />,
      },
      { id: 'info', label: '내 정보', render: () => account() },
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
