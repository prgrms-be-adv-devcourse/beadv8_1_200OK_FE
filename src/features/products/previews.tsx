import { ProductCategory, ProductRegion, ProductStatus } from '@/shared/api/types'
import type { ScreenPreview } from '@/shared/lib/screenPreview'
import {
  appleReviews,
  categoryOptions,
  farmItems,
  MY_MEMBER_ID,
  productCardItems,
  productDetailOf,
  sellers,
} from './fixtures'
import { HomeView } from './views/HomeView'
import { ProductDetailView, type ProductDetailViewProps } from './views/ProductDetailView'
import { ProductListView, type ProductListViewProps } from './views/ProductListView'

// /__design 화면 상태 갤러리 (개발 전용, app/dev만 import한다). 검토 패널의 상태를 props 조합으로 만든다.

const noop = () => {}

// ─── 홈 ──────────────────────────────────────────────────

const home = (props: Partial<Parameters<typeof HomeView>[0]> = {}) => (
  <HomeView
    status="success"
    items={productCardItems}
    farms={farmItems}
    onToggleLike={noop}
    onToggleFollow={noop}
    onRetry={noop}
    {...props}
  />
)

// ─── 목록 ────────────────────────────────────────────────

const list = (props: Partial<ProductListViewProps> = {}) => (
  <ProductListView
    status="success"
    items={productCardItems}
    totalCount={productCardItems.length}
    categories={categoryOptions}
    onRegionChange={noop}
    hideSoldOut={false}
    onHideSoldOutChange={noop}
    onToggleLike={noop}
    onRetry={noop}
    {...props}
  />
)

const fruits = productCardItems.filter(({ product }) => product.category === ProductCategory.FRUIT)

// ─── 상세 ────────────────────────────────────────────────

const apple = productDetailOf(101)

const detail = (props: Partial<ProductDetailViewProps> = {}) => (
  <ProductDetailView
    status="success"
    product={apple}
    seller={sellers.cheongsong}
    harvestDate="2026-10-08"
    reviews={appleReviews}
    hasMoreReviews
    currentMemberId={MY_MEMBER_ID}
    onAddToCart={noop}
    onToggleLike={noop}
    onToggleFollow={noop}
    onDeleteReview={noop}
    onLoadMoreReviews={noop}
    onRetry={noop}
    {...props}
  />
)

const appleWith = (patch: Partial<NonNullable<typeof apple>>) =>
  apple ? { ...apple, ...patch } : undefined

export const productPreviews: ScreenPreview[] = [
  {
    id: 'home',
    title: 'B-01 홈',
    layout: 'public',
    path: '/',
    mobileHeader: true,
    tabBar: true,
    states: [
      {
        id: 'not-connected',
        label: '연결 전 (지금 화면: 농가·하트·팔로우)',
        render: () =>
          home({ farms: undefined, onToggleLike: undefined, onToggleFollow: undefined }),
      },
      { id: 'default', label: '기본', render: () => home() },
      {
        id: 'guest',
        label: '비회원 (관심 → 로그인)',
        session: 'guest',
        render: () => home({ loginPrompt: 'like' }),
      },
      { id: 'loading', label: '로딩', render: () => home({ status: 'pending' }) },
      { id: 'error', label: '불러오기 실패', render: () => home({ status: 'error' }) },
      { id: 'empty', label: '상품 없음', render: () => home({ items: [], farms: [] }) },
      {
        id: 'liked',
        label: '관심 담음 토스트',
        toast: { message: '관심 상품에 담았어요' },
        render: () => home(),
      },
    ],
  },
  {
    id: 'product-list',
    title: '상품 목록 · 검색',
    layout: 'public',
    path: '/products?category=FRUIT',
    tabBar: true,
    states: [
      {
        id: 'category',
        label: '결과 있음 (과일)',
        render: () =>
          list({ category: ProductCategory.FRUIT, items: fruits, totalCount: fruits.length }),
      },
      { id: 'all', label: '전체', render: () => list() },
      {
        id: 'not-connected',
        label: '연결 전 (지금 화면: 하트 없음)',
        render: () => list({ onToggleLike: undefined }),
      },
      {
        id: 'empty-category',
        label: '빈 카테고리',
        render: () => list({ category: ProductCategory.GRAIN, items: [], totalCount: 0 }),
      },
      {
        id: 'region-empty',
        label: '산지 필터 결과 없음',
        render: () =>
          list({
            category: ProductCategory.FRUIT,
            region: ProductRegion.GYEONGGI,
            items: [],
            totalCount: 0,
          }),
      },
      {
        id: 'no-result',
        label: '검색 결과 없음',
        render: () => list({ query: '샤인머스캣', onClearQuery: noop, items: [], totalCount: 0 }),
      },
      {
        id: 'sold-out-hidden',
        label: '품절 제외로 0개',
        render: () =>
          list({
            category: ProductCategory.VEGETABLE,
            region: ProductRegion.GANGWON,
            items: [],
            totalCount: 0,
            hideSoldOut: true,
            hiddenSoldOutCount: 1,
          }),
      },
      { id: 'loading', label: '로딩', render: () => list({ status: 'pending' }) },
      { id: 'error', label: '불러오기 실패', render: () => list({ status: 'error' }) },
      {
        id: 'more',
        label: '더 보기',
        render: () => list({ hasMore: true, onLoadMore: noop, totalCount: 32 }),
      },
    ],
  },
  {
    id: 'product-detail',
    title: 'B-02 상품 상세',
    layout: 'public',
    path: '/products/101',
    mobileHeader: true,
    states: [
      {
        id: 'not-connected',
        label: '연결 전 (지금 화면: 판매자·관심·팔로우)',
        render: () =>
          detail({ seller: undefined, onToggleLike: undefined, onToggleFollow: undefined }),
      },
      { id: 'on-sale', label: '판매 중', render: () => detail() },
      {
        id: 'option-sold-out',
        label: '옵션 일부 품절',
        render: () =>
          detail({
            product: appleWith({
              options: apple?.options.map((o, i) => (i === 0 ? { ...o, soldOut: true } : o)),
            }),
          }),
      },
      {
        id: 'sold-out',
        label: '일시 품절',
        render: () =>
          detail({
            product: appleWith({
              soldOut: true,
              options: apple?.options.map((o) => ({ ...o, soldOut: true })),
            }),
          }),
      },
      {
        id: 'upcoming',
        label: '판매 예정',
        render: () => detail({ product: appleWith({ status: ProductStatus.READY }) }),
      },
      {
        id: 'ended',
        label: '판매 종료',
        render: () => detail({ product: appleWith({ status: ProductStatus.ENDED }) }),
      },
      {
        id: 'suspended',
        label: '정지된 판매자',
        render: () => detail({ seller: { ...sellers.cheongsong, suspended: true } }),
      },
      { id: 'owner', label: '내 상품', session: 'seller', render: () => detail({ isOwner: true }) },
      {
        id: 'guest',
        label: '비회원 담기 → 로그인',
        session: 'guest',
        render: () => detail({ loginPrompt: 'cart', currentMemberId: undefined }),
      },
      {
        id: 'added',
        label: '담기 성공 토스트',
        toast: { message: '장바구니에 담았어요', actionLabel: '장바구니 보기' },
        render: () => detail({ liked: true, following: true }),
      },
      {
        id: 'max-quantity',
        label: '수량 한도',
        render: () => detail({ defaultQuantity: 99 }),
      },
      {
        id: 'no-review',
        label: '리뷰 0개',
        render: () =>
          detail({
            product: appleWith({ reviewCount: 0, averageRating: 0 }),
            reviews: [],
            hasMoreReviews: false,
          }),
      },
      { id: 'loading', label: '로딩', render: () => detail({ status: 'pending' }) },
      { id: 'error', label: '불러오기 실패', render: () => detail({ status: 'error' }) },
      {
        id: 'not-found',
        label: '없는 상품',
        render: () => detail({ status: 'notFound', product: undefined }),
      },
    ],
  },
]
