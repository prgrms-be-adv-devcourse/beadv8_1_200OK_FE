import { OrderItemStatus, ProductStatus } from '@/shared/api/types'
import { ClaimState } from '@/shared/lib/claimState'
import { LOW_STOCK_THRESHOLD, MIN_WITHDRAWAL_AMOUNT } from '@/shared/lib/constants'
import type { ScreenPreview } from '@/shared/lib/screenPreview'
import { NOT_CONNECTED_REASON } from '@/shared/ui'
import {
  adjustedPayoutDetail,
  adjustedPayoutItems,
  appleFormValues,
  cancelClaims,
  followers,
  homeAsOf,
  homeStats,
  myProfile,
  myStore,
  payoutDetails,
  payoutItems,
  payoutOutlook,
  payouts,
  productStats,
  sellerOrders,
  sellerProducts,
  sellerWallet,
  sellerWalletBalance,
  sellerWalletTxs,
  todos,
  withdrawals,
} from './fixtures'
import { SellerOrderTab } from './types'
import {
  SellerClaimsNotConnectedView,
  SellerClaimsView,
  type SellerClaimsViewProps,
} from './views/SellerClaimsView'
import { SellerHomeView, type SellerHomeViewProps } from './views/SellerHomeView'
import {
  SellerOrdersNotConnectedView,
  SellerOrdersView,
  type SellerOrdersViewProps,
} from './views/SellerOrdersView'
import { SellerPayoutsView, type SellerPayoutsViewProps } from './views/SellerPayoutsView'
import {
  SellerProductFormView,
  type SellerProductFormViewProps,
} from './views/SellerProductFormView'
import {
  NOT_EDITABLE_REASON,
  SellerProductsView,
  type SellerProductsViewProps,
} from './views/SellerProductsView'
import { SellerProfileView, type SellerProfileViewProps } from './views/SellerProfileView'
import { SellerWalletView, type SellerWalletViewProps } from './views/SellerWalletView'

// /__design 화면 상태 갤러리 (개발 전용, app/dev만 import한다). 판매자 레이아웃 안에서 그린다.

const noop = () => {}

const home = (props: Partial<SellerHomeViewProps> = {}) => (
  <SellerHomeView
    status="success"
    asOf={homeAsOf}
    stats={homeStats}
    expectedPayout={payoutOutlook.expectedAmount}
    todos={todos}
    walletBalance={sellerWalletBalance}
    products={productStats}
    {...props}
  />
)

const profile = (props: Partial<SellerProfileViewProps> = {}) => (
  <SellerProfileView
    status="success"
    profile={myProfile}
    sellerId={myStore.sellerId}
    followerCount={myStore.followerCount}
    photoUrl={null}
    onSave={noop}
    onPhotoChange={noop}
    onPhotoRemove={noop}
    followers={followers}
    hasMoreFollowers
    onLoadMoreFollowers={noop}
    {...props}
  />
)

export const sellerCenterPreviews: ScreenPreview[] = [
  {
    id: 'seller-home',
    title: 'S-03 센터 홈',
    pageTitle: '센터 홈',
    layout: 'seller',
    path: '/seller',
    states: [
      {
        id: 'not-connected',
        label: '지금 연결 모양 (주문 집계·처리할 일 연결 전)',
        session: 'seller',
        render: () => home({ asOf: undefined, stats: null, todos: null }),
      },
      {
        id: 'default',
        label: '처리할 일 있음 (시안 전체)',
        session: 'seller',
        render: () => home(),
      },
      {
        id: 'profile-incomplete',
        label: '상점 프로필 미입력',
        session: 'seller',
        render: () => home({ profileIncomplete: true }),
      },
      {
        id: 'empty',
        label: '처리할 일 없음',
        session: 'seller',
        render: () =>
          home({
            todos: [],
            stats: { newOrders: 0, waitingShipment: 0, cancelRequests: 0 },
            expectedPayout: 0,
          }),
      },
      {
        id: 'payout-loading',
        label: '정산 예정 금액 불러오는 중',
        session: 'seller',
        render: () =>
          home({ stats: null, todos: null, expectedPayout: null, expectedPayoutPending: true }),
      },
      {
        id: 'payout-error',
        label: '정산 예정 금액 불러오기 실패',
        session: 'seller',
        render: () => home({ stats: null, todos: null, expectedPayout: null }),
      },
      {
        id: 'loading',
        label: '로딩',
        session: 'seller',
        render: () => home({ status: 'pending' }),
      },
      {
        id: 'balance-error',
        label: '잔액 불러오기 실패',
        session: 'seller',
        render: () =>
          home({ status: 'error', errorMessage: '판매자 지갑을 찾을 수 없습니다.', onRetry: noop }),
      },
    ],
  },
  {
    id: 'seller-profile',
    title: 'S-09 상점 프로필 · 팔로워',
    pageTitle: '상점 프로필',
    layout: 'seller',
    path: '/seller/profile',
    states: [
      {
        id: 'not-connected',
        label: '지금 연결 모양 (팔로워 연결 전)',
        session: 'seller',
        render: () => profile({ followerCount: null, followers: null, hasMoreFollowers: false }),
      },
      {
        id: 'default',
        label: '기본 (사진 없음 → 첫 글자)',
        session: 'seller',
        render: () => profile(),
      },
      {
        id: 'register',
        label: '등록 전 (빈 폼)',
        session: 'seller',
        render: () => profile({ profile: null, followerCount: 0, followers: [] }),
      },
      {
        id: 'uploading',
        label: '사진 올리는 중 (저장 막힘)',
        session: 'seller',
        render: () => profile({ photoUploading: true, uploading: true, photoUrl: 'blob:preview' }),
      },
      {
        id: 'photo-error',
        label: '사진 10MB 초과',
        session: 'seller',
        render: () => profile({ photoError: '사진은 10MB 이하로 올려 주세요' }),
      },
      {
        id: 'field-errors',
        label: '칸 오류 (서버 422)',
        session: 'seller',
        render: () =>
          profile({
            serverErrors: { customerServicePhone: '고객센터 연락처 형식이 올바르지 않습니다.' },
          }),
      },
      {
        id: 'error',
        label: '저장 실패 (서버)',
        session: 'seller',
        render: () =>
          profile({ errorMessage: '판매자 프로필용으로 업로드한 사진 주소가 아닙니다.' }),
      },
      {
        id: 'empty-profile',
        label: '소개 미입력',
        session: 'seller',
        render: () => profile({ profile: { ...myProfile, introduction: null } }),
      },
      {
        id: 'no-followers',
        label: '팔로워 없음',
        session: 'seller',
        render: () => profile({ followerCount: 0, followers: [], hasMoreFollowers: false }),
      },
      {
        id: 'loading',
        label: '로딩',
        session: 'seller',
        render: () => profile({ status: 'pending', profile: undefined }),
      },
      {
        id: 'saved',
        label: '저장 토스트',
        session: 'seller',
        toast: { message: '상점 프로필을 저장했어요' },
        render: () => profile(),
      },
    ],
  },
]

// ─── 1-8 상품 · 주문 · 취소 ──────────────────────────────

const products = (props: Partial<SellerProductsViewProps> = {}) => (
  <SellerProductsView
    status="success"
    products={sellerProducts}
    tab="ALL"
    onTabChange={noop}
    counts={{ ALL: sellerProducts.length }}
    onChangeStatus={noop}
    onChangeVisibility={noop}
    {...props}
  />
)

const photosOf = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, url: '', alt: `상품 사진 ${i + 1}` }))

const form = (props: Partial<SellerProductFormViewProps> = {}) => (
  <SellerProductFormView
    mode="create"
    photos={[]}
    onAddPhotos={noop}
    onRemovePhoto={noop}
    onMovePhoto={noop}
    onSubmit={noop}
    {...props}
  />
)

const edit = (props: Partial<SellerProductFormViewProps> = {}) =>
  form({
    mode: 'edit',
    defaultValues: appleFormValues,
    photos: photosOf(3),
    onDelete: noop,
    ...props,
  })

const waiting = sellerOrders.filter((o) => o.status === OrderItemStatus.PREPARING)
const orderCounts = { WAITING: 5, SHIPPING: 2, DELIVERED: 1, CANCELED: 1 }

const orders = (props: Partial<SellerOrdersViewProps> = {}) => (
  <SellerOrdersView
    status="success"
    orders={waiting}
    tab={SellerOrderTab.WAITING}
    onTabChange={noop}
    counts={orderCounts}
    onRegisterInvoice={noop}
    onNotifyDelay={noop}
    onSellerCancel={noop}
    onAnswerAddressChange={noop}
    today={new Date('2026-10-18T15:00:00')}
    {...props}
  />
)

const pendingClaims = cancelClaims.filter((c) => c.state === ClaimState.CLAIM_PENDING)

const claims = (props: Partial<SellerClaimsViewProps> = {}) => (
  <SellerClaimsView
    status="success"
    claims={pendingClaims}
    tab="PENDING"
    onTabChange={noop}
    counts={{ PENDING: 2, DONE: 2 }}
    onApprove={noop}
    onReject={noop}
    {...props}
  />
)

export const sellerWorkPreviews: ScreenPreview[] = [
  {
    id: 'seller-products',
    title: 'S-04 상품 관리',
    pageTitle: '상품 관리',
    layout: 'seller',
    path: '/seller/products',
    states: [
      { id: 'all', label: '전체', session: 'seller', render: () => products() },
      {
        id: 'on-sale',
        label: '판매 중 탭',
        session: 'seller',
        render: () =>
          products({
            tab: ProductStatus.ON_SALE,
            products: sellerProducts.filter((p) => p.status === ProductStatus.ON_SALE),
            counts: { ON_SALE: 2 },
          }),
      },
      {
        id: 'paused-empty',
        label: '일시 중지 탭 (빈 상태)',
        session: 'seller',
        render: () => products({ tab: ProductStatus.PAUSED, products: [], counts: { PAUSED: 0 } }),
      },
      {
        id: 'busy',
        label: '상태 바꾸는 중 (관리 칸 잠금)',
        session: 'seller',
        render: () => products({ busyProductId: 101 }),
      },
      {
        id: 'not-editable',
        label: `수정 불가 (${NOT_EDITABLE_REASON})`,
        session: 'seller',
        render: () =>
          products({ products: sellerProducts.map((p) => ({ ...p, editable: false })) }),
      },
      {
        id: 'low-stock',
        label: `판매 가능 수량 ${LOW_STOCK_THRESHOLD}개 이하 · 품절`,
        session: 'seller',
        render: () =>
          products({
            products: sellerProducts.filter((p) => p.hasLowStock || p.soldOut),
            counts: { ALL: 2 },
          }),
      },
      {
        id: 'none',
        label: '등록한 상품 없음',
        session: 'seller',
        render: () => products({ products: [], counts: { ALL: 0 } }),
      },
      {
        id: 'error',
        label: '불러오기 실패',
        session: 'seller',
        render: () =>
          products({ status: 'error', errorMessage: '접근 권한이 없습니다.', onRetry: noop }),
      },
      {
        id: 'loading',
        label: '로딩',
        session: 'seller',
        render: () => products({ status: 'pending' }),
      },
      {
        id: 'pages',
        label: '페이지 나눔',
        session: 'seller',
        render: () => products({ page: 1, totalPages: 3, onPageChange: noop }),
      },
    ],
  },
  {
    id: 'seller-product-form',
    title: 'S-05 상품 등록 · 수정',
    pageTitle: '상품 등록',
    layout: 'seller',
    path: '/seller/products/new',
    states: [
      { id: 'new', label: '새 상품', session: 'seller', render: () => form() },
      {
        id: 'errors',
        label: '폼 오류 요약',
        session: 'seller',
        render: () => form({ defaultShowErrors: true }),
      },
      {
        id: 'option-errors',
        label: '옵션 오류 (중복·정가)',
        session: 'seller',
        render: () =>
          form({
            defaultShowErrors: true,
            photos: photosOf(2),
            defaultValues: {
              ...appleFormValues,
              options: [
                { name: '2kg', salePrice: 23900, listPrice: 20000, totalStock: 5 },
                { name: '2kg', salePrice: 33900, totalStock: 3 },
              ],
            },
          }),
      },
      {
        id: 'uploading',
        label: '사진 올리는 중 (저장 막힘)',
        session: 'seller',
        render: () =>
          form({
            defaultValues: appleFormValues,
            photos: [...photosOf(1), { id: 'up', url: '', alt: '상품 사진 2', progress: 40 }],
            uploading: true,
          }),
      },
      { id: 'edit', label: '수정 (사진 순서)', session: 'seller', render: () => edit() },
      {
        id: 'conflict',
        label: '수정 충돌 (409)',
        session: 'seller',
        render: () => edit({ conflict: true, onReload: noop }),
      },
      {
        id: 'save-error',
        label: '저장 오류 (서버)',
        session: 'seller',
        render: () =>
          edit({
            errorMessage: '옵션 ‘3kg (16~18과)’ 재고는 주문에 배정된 6개보다 적게 줄일 수 없어요.',
          }),
      },
      {
        id: 'field-errors',
        label: '칸 오류 (서버 422)',
        session: 'seller',
        render: () =>
          edit({
            fieldErrors: { 'options.1.totalStock': '총재고는 0 이상이어야 합니다.' },
          }),
      },
      {
        id: 'delete',
        label: '삭제 확인',
        session: 'seller',
        render: () => edit({ defaultDeleteOpen: true }),
      },
    ],
  },
  {
    id: 'seller-orders',
    title: 'S-06 주문 · 출고',
    pageTitle: '주문·출고 관리',
    layout: 'seller',
    path: '/seller/orders',
    states: [
      {
        id: 'not-connected',
        label: '지금 연결 모양 (연결 전)',
        session: 'seller',
        render: () => <SellerOrdersNotConnectedView />,
      },
      { id: 'waiting', label: '출고 대기', session: 'seller', render: () => orders() },
      {
        id: 'invoice',
        label: '송장 등록',
        session: 'seller',
        render: () => orders({ defaultModal: { type: 'invoice', shipmentId: 1 } }),
      },
      {
        id: 'delay',
        label: '출고 지연 알리기',
        session: 'seller',
        render: () => orders({ defaultModal: { type: 'delay', shipmentId: 1 } }),
      },
      {
        id: 'delay-again',
        label: '지연 다시 알리기',
        session: 'seller',
        render: () => orders({ defaultModal: { type: 'delay', shipmentId: 13 } }),
      },
      {
        id: 'address',
        label: '배송지 변경 요청',
        session: 'seller',
        render: () => orders({ defaultModal: { type: 'address', shipmentId: 12 } }),
      },
      {
        id: 'cancel',
        label: '판매자 취소',
        session: 'seller',
        render: () => orders({ defaultModal: { type: 'cancel', shipmentId: 1 } }),
      },
      {
        id: 'shipping',
        label: '배송 중 탭',
        session: 'seller',
        render: () =>
          orders({
            tab: SellerOrderTab.SHIPPING,
            orders: sellerOrders.filter((o) => o.status === OrderItemStatus.SHIPPING),
          }),
      },
      {
        id: 'empty',
        label: '빈 목록',
        session: 'seller',
        render: () =>
          orders({ orders: [], counts: { WAITING: 0, SHIPPING: 0, DELIVERED: 0, CANCELED: 0 } }),
      },
      {
        id: 'loading',
        label: '로딩',
        session: 'seller',
        render: () => orders({ status: 'pending' }),
      },
    ],
  },
  {
    id: 'seller-claims',
    title: 'S-07 취소 요청 처리',
    pageTitle: '취소 요청 처리',
    layout: 'seller',
    path: '/seller/claims',
    states: [
      {
        id: 'not-connected',
        label: '지금 연결 모양 (연결 전)',
        session: 'seller',
        render: () => <SellerClaimsNotConnectedView />,
      },
      { id: 'pending', label: '처리 대기', session: 'seller', render: () => claims() },
      {
        id: 'approve',
        label: '승인 확인',
        session: 'seller',
        render: () => claims({ defaultModal: { type: 'approve', claimId: 31 } }),
      },
      {
        id: 'reject',
        label: '거절 사유',
        session: 'seller',
        render: () => claims({ defaultModal: { type: 'reject', claimId: 31 } }),
      },
      {
        id: 'done',
        label: '처리 완료',
        session: 'seller',
        render: () =>
          claims({
            tab: 'DONE',
            claims: cancelClaims.filter((c) => c.state !== ClaimState.CLAIM_PENDING),
          }),
      },
      {
        id: 'empty',
        label: '처리할 요청 없음',
        session: 'seller',
        render: () => claims({ claims: [], counts: { PENDING: 0, DONE: 2 } }),
      },
    ],
  },
]

// ─── 1-9 정산 · 지갑 ─────────────────────────────────────

const firstPayout = payoutDetails[0] ?? null
const monthSummary = {
  month: '2026-10-18T02:00:00',
  amount: payouts.reduce((sum, p) => sum + p.amount, 0),
  count: payouts.length,
}

const payoutsView = (props: Partial<SellerPayoutsViewProps> = {}) => (
  <SellerPayoutsView
    status="success"
    payouts={payouts}
    outlook={payoutOutlook}
    monthSummary={monthSummary}
    page={1}
    totalPages={3}
    onPageChange={noop}
    detail={null}
    {...props}
  />
)

const detailOf = (
  payout = firstPayout,
  items = payoutItems[firstPayout?.payoutId ?? 0] ?? [],
): NonNullable<SellerPayoutsViewProps['detail']> => ({
  onClose: noop,
  status: 'success',
  payout,
  items,
})

const walletView = (props: Partial<SellerWalletViewProps> = {}) => (
  <SellerWalletView
    status="success"
    wallet={sellerWallet}
    withdrawals={withdrawals}
    transactions={sellerWalletTxs}
    hasMoreTransactions
    onLoadMoreTransactions={noop}
    onWithdraw={noop}
    onRequestAccountChange={noop}
    {...props}
  />
)

export const sellerMoneyPreviews: ScreenPreview[] = [
  {
    id: 'seller-payouts',
    title: 'S-08 정산 내역 · 상세',
    pageTitle: '정산 내역',
    layout: 'seller',
    path: '/seller/payouts',
    states: [
      { id: 'default', label: '기본', session: 'seller', render: () => payoutsView() },
      {
        id: 'detail',
        label: '상세',
        session: 'seller',
        render: () => payoutsView({ detail: detailOf() }),
      },
      {
        id: 'detail-adjusted',
        label: '상세 · 정산 조정',
        session: 'seller',
        render: () => payoutsView({ detail: detailOf(adjustedPayoutDetail, adjustedPayoutItems) }),
      },
      {
        id: 'detail-more',
        label: '상세 · 항목 더 보기',
        session: 'seller',
        render: () =>
          payoutsView({
            detail: {
              ...detailOf(),
              items: (payoutItems[firstPayout?.payoutId ?? 0] ?? []).slice(0, 6),
              hasMoreItems: true,
              onLoadMoreItems: noop,
            },
          }),
      },
      {
        id: 'detail-loading',
        label: '상세 로딩',
        session: 'seller',
        render: () => payoutsView({ detail: { ...detailOf(), status: 'pending', payout: null } }),
      },
      {
        id: 'detail-not-found',
        label: '상세 없음 (404)',
        session: 'seller',
        render: () => payoutsView({ detail: { ...detailOf(), status: 'notFound', payout: null } }),
      },
      {
        id: 'empty',
        label: '빈 정산',
        session: 'seller',
        render: () =>
          payoutsView({
            payouts: [],
            totalPages: 1,
            monthSummary: { ...monthSummary, amount: 0, count: 0 },
            outlook: { ...payoutOutlook, expectedAmount: 0, pendingCount: 0 },
          }),
      },
      {
        id: 'outlook-missing',
        label: '정산 예정 못 받음 (칸 비움)',
        session: 'seller',
        render: () => payoutsView({ outlook: null }),
      },
      {
        id: 'outlook-truncated',
        label: '정산 예정 후보 100건 초과',
        session: 'seller',
        render: () =>
          payoutsView({
            outlook: {
              ...payoutOutlook,
              expectedAmount: 2_841_300,
              pendingCount: 137,
              truncated: true,
            },
          }),
      },
      {
        id: 'loading',
        label: '로딩',
        session: 'seller',
        render: () => payoutsView({ status: 'pending' }),
      },
      {
        id: 'error',
        label: '불러오기 실패',
        session: 'seller',
        render: () => payoutsView({ status: 'error', onRetry: noop }),
      },
    ],
  },
  {
    id: 'seller-wallet',
    title: '지갑 · 출금',
    pageTitle: '지갑·출금',
    layout: 'seller',
    path: '/seller/wallet',
    states: [
      {
        id: 'not-connected',
        label: '지금 연결 모양 (잔액만 · 계좌·내역 연결 전 · 출금 닫힘)',
        session: 'seller',
        render: () =>
          walletView({
            wallet: {
              balance: sellerWallet.balance,
              withdrawableAmount: sellerWallet.balance,
              account: null,
              accountNeedsCheck: false,
              accountChangePending: false,
            },
            withdrawals: null,
            transactions: null,
            hasMoreTransactions: false,
            featureDisabledReason: NOT_CONNECTED_REASON,
          }),
      },
      { id: 'default', label: '기본 (시안 전체)', session: 'seller', render: () => walletView() },
      {
        id: 'amount-error',
        label: '금액 오류 (가능 금액 초과)',
        session: 'seller',
        render: () => walletView({ defaultAmount: 900000 }),
      },
      {
        id: 'confirm',
        label: '출금 확인',
        session: 'seller',
        render: () => walletView({ defaultAmount: 300000, defaultModal: 'confirm' }),
      },
      {
        id: 'confirm-busy',
        label: '출금 신청 중',
        session: 'seller',
        render: () =>
          walletView({ defaultAmount: 300000, defaultModal: 'confirm', withdrawing: true }),
      },
      {
        id: 'success',
        label: '출금 성공',
        session: 'seller',
        toast: { message: '출금을 신청했어요' },
        render: () =>
          walletView({
            withdrawResult: { kind: 'success', amount: 300000 },
            wallet: {
              ...sellerWallet,
              withdrawableAmount: sellerWallet.withdrawableAmount - 300000,
            },
          }),
      },
      {
        id: 'insufficient',
        label: '잔액 부족',
        session: 'seller',
        render: () =>
          walletView({ defaultAmount: 300000, withdrawResult: { kind: 'insufficient' } }),
      },
      {
        id: 'account-check',
        label: '계좌 확인 필요',
        session: 'seller',
        render: () => walletView({ wallet: { ...sellerWallet, accountNeedsCheck: true } }),
      },
      {
        id: 'account-change',
        label: '계좌 변경 요청',
        session: 'seller',
        render: () => walletView({ defaultModal: 'account' }),
      },
      {
        id: 'account-change-fail',
        label: '계좌 변경 보내기 실패',
        session: 'seller',
        render: () =>
          walletView({
            defaultModal: 'account',
            accountChangeError: '잠시 후 다시 보내 주세요. 입력한 내용은 그대로 있어요.',
          }),
      },
      {
        id: 'account-pending',
        label: '계좌 변경 요청 중',
        session: 'seller',
        render: () => walletView({ wallet: { ...sellerWallet, accountChangePending: true } }),
      },
      {
        id: 'below-min',
        label: '출금 가능 금액 부족',
        session: 'seller',
        render: () =>
          walletView({
            wallet: {
              ...sellerWallet,
              balance: 208000,
              withdrawableAmount: MIN_WITHDRAWAL_AMOUNT - 2000,
            },
          }),
      },
      {
        id: 'empty',
        label: '내역 없음',
        session: 'seller',
        render: () =>
          walletView({
            wallet: { ...sellerWallet, balance: 0, withdrawableAmount: 0 },
            withdrawals: [],
            transactions: [],
            hasMoreTransactions: false,
          }),
      },
      {
        id: 'loading',
        label: '로딩',
        session: 'seller',
        render: () => walletView({ status: 'pending' }),
      },
    ],
  },
]
