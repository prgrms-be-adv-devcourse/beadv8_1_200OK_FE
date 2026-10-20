import { Navigate, type RouteObject } from 'react-router'
import { FindAccountPage, LoginPage, ResetPasswordPage, SignupPage } from '@/features/auth'
import { CartPage } from '@/features/cart'
import { CheckoutCompletePage, CheckoutPage } from '@/features/checkout'
import { FarmPage } from '@/features/farms'
import { AccountPage, LikesPage, MyPage } from '@/features/me'
import { OrderDetailPage, OrderListPage, ShipmentPage, SupportPage } from '@/features/orders'
import { HomePage, ProductDetailPage, ProductListPage } from '@/features/products'
import { ReviewEditPage, ReviewNewPage } from '@/features/reviews'
import { SellerApplyPage, SellerStatusPage } from '@/features/sellerApply'
import {
  ChargeFailPage,
  ChargePage,
  ChargeSuccessPage,
  TermsPage,
  WalletHistoryPage,
} from '@/features/wallet'
import { lazyWithRetry } from '@/shared/lib/lazyWithRetry'
import { GuestOnly, RequireAdmin, RequireAuth, RequireSeller } from './guards/guards'
import { AuthLayout } from './layouts/AuthLayout'
import { MyPageLayout } from './layouts/MyPageLayout'
import { PublicLayout } from './layouts/PublicLayout'
import { RootErrorBoundary, RootHydrateFallback, RootLayout } from './layouts/RootLayout'
import { NotFoundPage } from './pages/NotFoundPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import type { RouteHandle } from './routeHandle'

// 라우트 표: design/SCREENS.md. 아직 안 만든 화면은 빈 페이지(PlaceholderPage)이고,
// 1단계에서 화면을 만들면 해당 라우트의 Component(판매자·관리자는 청크 모듈의 내보내기)만 바꾼다.
// /seller/*, /admin/*는 각각 하나의 지연 로딩 청크. 청크를 못 받으면 lazyWithRetry가 1회 새로고침(FE-Q-005).

const page = (
  path: string,
  handle: RouteHandle,
  Component: RouteObject['Component'] = PlaceholderPage,
): RouteObject => ({ path, handle, Component })

// ─── 판매자 센터 청크 ─────────────────────────────────────
const sellerChunk = lazyWithRetry(() => import('./chunks/sellerChunk'))

type SellerChunk = Awaited<ReturnType<typeof sellerChunk>>
type SellerScreen = Exclude<keyof SellerChunk, 'SellerLayout'>

/** 판매자 화면. screen은 청크 모듈이 내보낸 화면 이름 (안 만든 화면은 빈 페이지) */
const sellerPage = (
  path: string | null,
  handle: RouteHandle,
  screen: SellerScreen = 'SellerPlaceholderPage',
): RouteObject => ({
  ...(path === null ? { index: true } : { path }),
  handle,
  lazy: async () => ({ Component: (await sellerChunk())[screen] }),
})

// ─── 관리자 콘솔 청크 ─────────────────────────────────────
const adminChunk = lazyWithRetry(() => import('./chunks/adminChunk'))

type AdminChunk = Awaited<ReturnType<typeof adminChunk>>
type AdminScreen = Exclude<keyof AdminChunk, 'AdminLayout'>

/** 관리자 화면. screen은 청크 모듈이 내보낸 화면 이름 */
const adminPage = (path: string, handle: RouteHandle, screen: AdminScreen): RouteObject => ({
  path,
  handle,
  lazy: async () => ({ Component: (await adminChunk())[screen] }),
})

export const appRoutes: RouteObject[] = [
  // B2C
  {
    Component: PublicLayout,
    children: [
      {
        index: true,
        handle: { title: '홈', screenId: 'B-01', mobileHeader: true, tabBar: true },
        Component: HomePage,
      },
      page('products', { title: '상품 목록', tabBar: true }, ProductListPage),
      page(
        'products/:productId',
        { title: '상품 상세', screenId: 'B-02', mobileHeader: true },
        ProductDetailPage,
      ),
      page(
        'farms/:farmId',
        { title: '판매자 상점', screenId: 'B-11', mobileHeader: true },
        FarmPage,
      ),
      page('terms/:type', { title: '약관' }, TermsPage),
      {
        Component: RequireAuth,
        children: [
          page('cart', { title: '장바구니', screenId: 'B-03' }, CartPage),
          page('checkout', { title: '주문서', screenId: 'B-04' }, CheckoutPage),
          page('checkout/complete', { title: '주문 완료', screenId: 'B-06' }, CheckoutCompletePage),
          page('wallet/charge', { title: '예치금 충전', screenId: 'B-05' }, ChargePage),
          page(
            'wallet/charge/success',
            { title: '충전 완료', screenId: 'B-05' },
            ChargeSuccessPage,
          ),
          page('wallet/charge/fail', { title: '충전 실패', screenId: 'B-05' }, ChargeFailPage),
          page('orders/:orderId', { title: '주문 상세', screenId: 'B-08' }, OrderDetailPage),
          page('orders/:orderId/shipments/:shipmentId', { title: '배송 조회' }, ShipmentPage),
          page('orders/:orderId/inquiry', { title: '고객센터 문의' }, SupportPage),
          page('reviews/new', { title: '리뷰 쓰기', screenId: 'B-10' }, ReviewNewPage),
          page('reviews/:reviewId/edit', { title: '리뷰 수정', screenId: 'B-10' }, ReviewEditPage),
          {
            // 마이 묶음: 데스크톱 왼쪽 메뉴 (MyPageLayout). 메뉴에서 여는 주문 내역·판매자 신청도 메뉴를 유지한다
            Component: MyPageLayout,
            children: [
              page('me', { title: '마이페이지', screenId: 'B-12', tabBar: true }, MyPage),
              page('orders', { title: '주문 내역', screenId: 'B-07', tabBar: true }, OrderListPage),
              page(
                'me/wallet',
                { title: '지갑 이용 내역', screenId: 'B-13', tabBar: true },
                WalletHistoryPage,
              ),
              page('me/likes', { title: '관심', screenId: 'B-14', tabBar: true }, LikesPage),
              page('me/account', { title: '계정 관리', screenId: 'B-15' }, AccountPage),
              page('seller/apply', { title: '판매자 신청', screenId: 'S-01' }, SellerApplyPage),
              page(
                'seller/apply/status',
                { title: '신청 현황', screenId: 'S-02' },
                SellerStatusPage,
              ),
            ],
          },
        ],
      },
      { path: '*', handle: { title: '페이지 없음' }, Component: NotFoundPage },
    ],
  },

  // 로그인·가입 (비회원 전용)
  {
    Component: GuestOnly,
    children: [
      {
        Component: AuthLayout,
        children: [
          page('login', { title: '로그인', screenId: 'A-01' }, LoginPage),
          page('signup', { title: '회원가입', screenId: 'A-02' }, SignupPage),
          page('find-account', { title: '아이디·비밀번호 찾기' }, FindAccountPage),
          page('find-account/reset', { title: '새 비밀번호 정하기' }, ResetPasswordPage),
        ],
      },
    ],
  },

  // 판매자 센터 (판매자만, 지연 로딩)
  {
    path: 'seller',
    Component: RequireSeller,
    children: [
      {
        lazy: async () => ({ Component: (await sellerChunk()).SellerLayout }),
        children: [
          sellerPage(null, { title: '센터 홈', screenId: 'S-03' }, 'SellerHomePage'),
          sellerPage('products', { title: '상품 관리', screenId: 'S-04' }, 'SellerProductsPage'),
          sellerPage(
            'products/new',
            { title: '상품 등록', screenId: 'S-05' },
            'SellerProductFormPage',
          ),
          sellerPage(
            'products/:productId/edit',
            { title: '상품 수정', screenId: 'S-05' },
            'SellerProductFormPage',
          ),
          sellerPage('orders', { title: '주문·출고 관리', screenId: 'S-06' }, 'SellerOrdersPage'),
          sellerPage('claims', { title: '취소 요청 처리', screenId: 'S-07' }, 'SellerClaimsPage'),
          // 상세는 목록 위 모달이라 한 라우트(선택 세그먼트)로 둬 목록이 다시 그려지지 않게 한다
          sellerPage(
            'payouts/:payoutId?',
            { title: '정산 내역', screenId: 'S-08' },
            'SellerPayoutsPage',
          ),
          sellerPage('wallet', { title: '지갑·출금' }, 'SellerWalletPage'),
          sellerPage('profile', { title: '상점 프로필', screenId: 'S-09' }, 'SellerProfilePage'),
        ],
      },
    ],
  },

  // 운영 관리자 콘솔 (관리자만, 지연 로딩)
  {
    path: 'admin',
    Component: RequireAdmin,
    children: [
      {
        lazy: async () => ({ Component: (await adminChunk()).AdminLayout }),
        children: [
          { index: true, element: <Navigate to="/admin/sellers" replace /> },
          adminPage('sellers', { title: '판매자 심사', screenId: 'M-01' }, 'AdminSellersPage'),
          adminPage(
            'sellers/:applicationId',
            { title: '판매자 심사 상세', screenId: 'M-02' },
            'AdminSellerDetailPage',
          ),
          // 상세는 목록 위 모달이라 한 라우트(선택 세그먼트)로 둔다 (판매자 정산 내역과 같게)
          adminPage(
            'payouts/:payoutId?',
            { title: '정산 관리', screenId: 'M-03' },
            'AdminPayoutsPage',
          ),
        ],
      },
    ],
  },
]

// 개발 서버에서만: 컴포넌트 갤러리와 레이아웃 미리보기. 프로덕션에서는 DEV가 false로 바뀌어 번들에서 빠진다.
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '__design',
        lazy: async () => ({ Component: (await import('./dev/DesignGallery')).DesignGallery }),
      },
      {
        path: '__design/preview/:layout',
        lazy: async () => ({ Component: (await import('./dev/LayoutPreview')).LayoutPreview }),
      },
      {
        path: '__design/screen/:screenId',
        lazy: async () => ({ Component: (await import('./dev/ScreenPreview')).ScreenPreview }),
      },
    ]
  : []

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RootErrorBoundary,
    HydrateFallback: RootHydrateFallback,
    children: [...devRoutes, ...appRoutes],
  },
]
