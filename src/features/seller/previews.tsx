import { appleReviewKeywords, appleReviews } from '@/features/products/fixtures'
import { RefundStatus } from '@/shared/api/refund'
import { ProductStatus } from '@/shared/api/types'
import { LOW_STOCK_THRESHOLD, MIN_WITHDRAWAL_AMOUNT } from '@/shared/lib/constants'
import type { ScreenPreview } from '@/shared/lib/screenPreview'
import { NOT_CONNECTED_REASON } from '@/shared/ui'
import {
  AddressRequestModal,
  type AddressRequestModalProps,
  InvoiceModal,
} from './components/OrderModals'
import {
  adjustedPayoutDetail,
  adjustedPayoutItems,
  appleFormValues,
  followers,
  homeAsOf,
  homeStats,
  myProfile,
  myStore,
  noReviewSentiments,
  payoutDetails,
  payoutItems,
  payoutOutlook,
  payouts,
  productStats,
  reviewOverviewOf,
  reviewSentiments101,
  sellerProducts,
  sellerRefunds,
  sellerShipmentDetail2,
  sellerShipments,
  sellerWallet,
  sellerWalletBalance,
  sellerWalletTxs,
  todos,
  withdrawals,
} from './fixtures'
import { SellerClaimsView, type SellerClaimsViewProps } from './views/SellerClaimsView'
import { SellerHomeView, type SellerHomeViewProps } from './views/SellerHomeView'
import { SellerOrdersView, type SellerOrdersViewProps } from './views/SellerOrdersView'
import { SellerPayoutsView, type SellerPayoutsViewProps } from './views/SellerPayoutsView'
import {
  SellerProductFormView,
  type SellerProductFormViewProps,
} from './views/SellerProductFormView'
import {
  SellerProductReviewsView,
  type SellerProductReviewsViewProps,
} from './views/SellerProductReviewsView'
import { SellerProductsView, type SellerProductsViewProps } from './views/SellerProductsView'
import { SellerProfileView, type SellerProfileViewProps } from './views/SellerProfileView'
import { SellerReviewOverviewView } from './views/SellerReviewOverviewView'
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
    reviews={{
      status: 'success',
      overview: reviewOverviewOf(),
      onRetryFailed: noop,
      retryingFailed: false,
    }}
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
        id: 'reviews-calm',
        label: '리뷰 분석 · 먼저 볼 항목 없음',
        session: 'seller',
        render: () =>
          home({
            reviews: {
              status: 'success',
              overview: reviewOverviewOf([101, 106]),
              onRetryFailed: noop,
              retryingFailed: false,
            },
          }),
      },
      {
        id: 'reviews-loading',
        label: '리뷰 분석 · 로딩',
        session: 'seller',
        render: () => home({ reviews: { status: 'pending' } }),
      },
      {
        id: 'reviews-error',
        label: '리뷰 분석 · 오류',
        session: 'seller',
        render: () => home({ reviews: { status: 'error', onRetry: noop } }),
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
        id: 'no-postal-code',
        label: '출고지 우편번호 없음 (이 칸이 생기기 전 프로필 · 신청 값도 없음)',
        session: 'seller',
        render: () => profile({ profile: { ...myProfile, originPostalCode: null } }),
      },
      {
        id: 'postal-code-from-application',
        label: '출고지 우편번호 없음 → 승인 신청 값으로 채움',
        session: 'seller',
        render: () =>
          profile({
            profile: { ...myProfile, originPostalCode: null },
            fallbackPostalCode: '37421',
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
    onDescriptionImageUpload={async (file) => URL.createObjectURL(file)}
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
    reviewsTo: '/seller/reviews/101',
    ...props,
  })

const orders = (props: Partial<SellerOrdersViewProps> = {}) => (
  <SellerOrdersView
    status="success"
    shipments={sellerShipments}
    page={0}
    totalPages={1}
    totalElements={sellerShipments.length}
    onPageChange={noop}
    onRegisterInvoice={noop}
    onOpenAddressChange={noop}
    {...props}
  />
)

const shipmentOf = (shipmentId: number) => sellerShipments.find((s) => s.shipmentId === shipmentId)

const withInvoiceModal = (props: { error?: string } = {}) => (
  <>
    {orders()}
    <InvoiceModal shipment={shipmentOf(1) ?? null} onClose={noop} onSubmit={noop} {...props} />
  </>
)

const withAddressModal = (props: Partial<AddressRequestModalProps> = {}) => (
  <>
    {orders()}
    <AddressRequestModal
      shipment={shipmentOf(2) ?? null}
      detailStatus="success"
      detail={sellerShipmentDetail2}
      onClose={noop}
      onAnswer={noop}
      {...props}
    />
  </>
)

const pendingRefunds = sellerRefunds.filter((r) => r.status === RefundStatus.REQUESTED)
const resolved = async () => null

const claims = (props: Partial<SellerClaimsViewProps> = {}) => (
  <SellerClaimsView
    status="success"
    refunds={pendingRefunds}
    filter={RefundStatus.REQUESTED}
    onFilterChange={noop}
    pendingCount={pendingRefunds.length}
    onApprove={resolved}
    onReject={resolved}
    {...props}
  />
)

const overviewSuccess = (data = reviewOverviewOf(), retryingFailed = false) => (
  <SellerReviewOverviewView
    state={{ status: 'success', overview: data, onRetryFailed: noop, retryingFailed }}
  />
)

const productReviews = (props: Partial<SellerProductReviewsViewProps> = {}) => (
  <SellerProductReviewsView
    productId={101}
    productName="청송 꿀사과 부사"
    sentiments={{ status: 'success', summary: reviewSentiments101 }}
    keywordStatus="success"
    keywords={appleReviewKeywords.keywords}
    onSelectKeyword={noop}
    reviewStatus="success"
    reviews={appleReviews}
    reviewTotal={appleReviews.length}
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
      { id: 'list', label: '출고 목록', session: 'seller', render: () => orders() },
      {
        id: 'many-pages',
        label: '여러 쪽',
        session: 'seller',
        render: () => orders({ totalPages: 4, totalElements: 92 }),
      },
      {
        id: 'invoice',
        label: '송장 등록',
        session: 'seller',
        render: () => withInvoiceModal(),
      },
      {
        id: 'invoice-error',
        label: '송장 등록 거절 (중복 송장)',
        session: 'seller',
        render: () => withInvoiceModal({ error: '이미 사용된 송장번호입니다.' }),
      },
      {
        id: 'address',
        label: '배송지 변경 요청',
        session: 'seller',
        render: () => withAddressModal(),
      },
      {
        id: 'address-loading',
        label: '배송지 변경 요청 불러오는 중',
        session: 'seller',
        render: () => withAddressModal({ detailStatus: 'pending', detail: undefined }),
      },
      {
        id: 'address-processed',
        label: '이미 처리된 요청',
        session: 'seller',
        render: () =>
          withAddressModal({
            detail: {
              ...sellerShipmentDetail2,
              latestAddressChange: sellerShipmentDetail2.latestAddressChange && {
                ...sellerShipmentDetail2.latestAddressChange,
                status: 'APPROVED',
              },
            },
            error: '이미 처리된 배송지 변경 요청입니다.',
          }),
      },
      {
        id: 'empty',
        label: '빈 목록',
        session: 'seller',
        render: () => orders({ shipments: [], totalPages: 0, totalElements: 0 }),
      },
      {
        id: 'error',
        label: '불러오기 실패',
        session: 'seller',
        render: () => orders({ status: 'error', shipments: [] }),
      },
      {
        id: 'loading',
        label: '로딩',
        session: 'seller',
        render: () => orders({ status: 'pending', shipments: [] }),
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
      { id: 'pending', label: '승인 대기', session: 'seller', render: () => claims() },
      {
        id: 'approve',
        label: '승인 확인',
        session: 'seller',
        render: () => claims({ defaultModal: { type: 'approve', refundId: 31 } }),
      },
      {
        id: 'reject',
        label: '거절 사유',
        session: 'seller',
        render: () => claims({ defaultModal: { type: 'reject', refundId: 31 } }),
      },
      {
        id: 'all',
        label: '전체 (처리 중 · 완료 · 거절 · 철회 · 취소 실패)',
        session: 'seller',
        render: () => claims({ filter: 'ALL', refunds: sellerRefunds }),
      },
      {
        id: 'failed',
        label: '취소 실패',
        session: 'seller',
        render: () =>
          claims({
            filter: RefundStatus.FAILED,
            refunds: sellerRefunds.filter((r) => r.status === RefundStatus.FAILED),
          }),
      },
      {
        id: 'more',
        label: '더 보기',
        session: 'seller',
        render: () => claims({ filter: 'ALL', refunds: sellerRefunds, hasMore: true }),
      },
      {
        id: 'empty',
        label: '처리할 요청 없음',
        session: 'seller',
        render: () => claims({ refunds: [], pendingCount: 0 }),
      },
      {
        id: 'loading',
        label: '로딩',
        session: 'seller',
        render: () => claims({ status: 'pending' }),
      },
      {
        id: 'error',
        label: '불러오기 실패',
        session: 'seller',
        render: () => claims({ status: 'error' }),
      },
    ],
  },
  {
    id: 'seller-reviews',
    title: 'S-10 리뷰 분석',
    pageTitle: '리뷰 분석',
    layout: 'seller',
    path: '/seller/reviews',
    states: [
      { id: 'default', label: '상품 여러 개', session: 'seller', render: () => overviewSuccess() },
      {
        id: 'partial',
        label: '일부 상품 반응 실패',
        session: 'seller',
        render: () => overviewSuccess(reviewOverviewOf([106])),
      },
      {
        id: 'partial-retrying',
        label: '일부 실패 · 다시 받는 중',
        session: 'seller',
        render: () => overviewSuccess(reviewOverviewOf([106]), true),
      },
      {
        id: 'no-focus',
        label: '먼저 볼 항목 없음 (언급 10개 이상 항목 없음)',
        session: 'seller',
        render: () => overviewSuccess(reviewOverviewOf([101, 106])),
      },
      {
        id: 'zero-analyzed',
        label: '분석 리뷰 0',
        session: 'seller',
        render: () =>
          overviewSuccess({
            ...reviewOverviewOf([101, 106, 109, 110]),
            failed: [],
          }),
      },
      {
        id: 'no-products',
        label: '상품 없음',
        session: 'seller',
        render: () =>
          overviewSuccess({
            ...reviewOverviewOf(),
            productCount: 0,
            analyzedReviewCount: 0,
            ranked: [],
            thin: [],
            failed: [],
          }),
      },
      {
        id: 'loading',
        label: '로딩',
        session: 'seller',
        render: () => <SellerReviewOverviewView state={{ status: 'pending' }} />,
      },
      {
        id: 'error',
        label: '상품 목록 오류',
        session: 'seller',
        render: () => (
          <SellerReviewOverviewView
            state={{ status: 'error', errorMessage: '잠시 후 다시 시도해 주세요.', onRetry: noop }}
          />
        ),
      },
    ],
  },
  {
    id: 'seller-product-reviews',
    title: 'S-11 상품 리뷰 분석',
    pageTitle: '리뷰 분석',
    layout: 'seller',
    path: '/seller/reviews/101',
    states: [
      {
        id: 'default',
        label: '감성 · 키워드 · 리뷰',
        session: 'seller',
        render: () => productReviews(),
      },
      {
        id: 'keyword',
        label: '키워드로 거름',
        session: 'seller',
        render: () =>
          productReviews({
            selectedKeywordId: 'C02',
            reviews: appleReviews.slice(0, 1),
            reviewTotal: 1,
          }),
      },
      {
        id: 'hidden',
        label: '숨긴 상품 (공개 API 404)',
        session: 'seller',
        render: () =>
          productReviews({
            keywordStatus: 'hidden',
            keywords: [],
            reviewStatus: 'hidden',
            reviews: [],
            reviewTotal: undefined,
          }),
      },
      {
        id: 'no-reviews',
        label: '분석한 리뷰 · 리뷰 없음',
        session: 'seller',
        render: () =>
          productReviews({
            sentiments: { status: 'success', summary: noReviewSentiments },
            keywords: [],
            reviews: [],
            reviewTotal: 0,
          }),
      },
      {
        id: 'more',
        label: '리뷰 더 보기',
        session: 'seller',
        render: () => productReviews({ hasMore: true, onLoadMore: noop }),
      },
      {
        id: 'loading',
        label: '로딩',
        session: 'seller',
        render: () =>
          productReviews({
            sentiments: { status: 'pending' },
            keywordStatus: 'pending',
            reviewStatus: 'pending',
            reviews: [],
            reviewTotal: undefined,
          }),
      },
      {
        id: 'error',
        label: '감성 · 리뷰 오류',
        session: 'seller',
        render: () =>
          productReviews({
            sentiments: {
              status: 'error',
              errorMessage: '상품을 찾을 수 없습니다.',
              onRetry: noop,
            },
            keywordStatus: 'error',
            reviewStatus: 'error',
            reviews: [],
            reviewTotal: undefined,
            reviewErrorMessage: '잠시 후 다시 시도해 주세요.',
            onRetryReviews: noop,
          }),
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
