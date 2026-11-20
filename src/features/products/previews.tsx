import { ProductCategory, ProductRegion, ProductSort, ProductStatus } from '@/shared/api/types'
import { WISH_ADMIN_REASON } from '@/shared/api/wishes'
import type { ScreenPreview } from '@/shared/lib/screenPreview'
import {
  appleLowStockOptions,
  appleManyLowStockOptions,
  appleReviewKeywordIds,
  appleReviewKeywords,
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
    onSearch={noop}
    onSortChange={noop}
    hideSoldOut={false}
    onHideSoldOutChange={noop}
    onToggleLike={noop}
    onRetry={noop}
    {...props}
  />
)

const fruits = productCardItems.filter(({ product }) => product.category === ProductCategory.FRUIT)
const apples = productCardItems.filter(({ product }) => product.name.includes('사과'))
const byPriceAsc = [...productCardItems].sort(
  (a, b) => a.product.minSalePrice - b.product.minSalePrice,
)

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
    reviewKeywords={appleReviewKeywords.keywords}
    onSelectReviewKeyword={noop}
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
        label: '연결 전 (지금 화면: 농가·팔로우)',
        render: () => home({ farms: undefined, onToggleFollow: undefined }),
      },
      {
        id: 'admin',
        label: '관리자 (하트 없음)',
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
        toast: { message: '관심 상품에 담았어요', actionLabel: '관심 상품 보기' },
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
        id: 'admin',
        label: '관리자 (하트 없음)',
        render: () => list({ onToggleLike: undefined }),
      },
      {
        id: 'guest-like',
        label: '비회원 관심 → 로그인',
        session: 'guest',
        render: () => list({ loginPrompt: 'like' }),
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
        id: 'search',
        label: '검색 결과 (사과, 관련도순)',
        path: '/products?q=사과',
        render: () =>
          list({ query: '사과', onClearQuery: noop, items: apples, totalCount: apples.length }),
      },
      {
        id: 'sort-price',
        label: '정렬: 낮은 가격순',
        path: '/products?sort=PRICE_ASC',
        render: () => list({ sort: ProductSort.PRICE_ASC, items: byPriceAsc }),
      },
      {
        id: 'no-result',
        label: '검색 결과 없음',
        path: '/products?q=샤인머스캣',
        render: () => list({ query: '샤인머스캣', onClearQuery: noop, items: [], totalCount: 0 }),
      },
      {
        id: 'no-result-filtered',
        label: '검색 결과 없음 (산지 조건)',
        path: '/products?q=사과&region=JEJU',
        render: () =>
          list({
            query: '사과',
            region: ProductRegion.JEJU,
            onClearQuery: noop,
            items: [],
            totalCount: 0,
          }),
      },
      {
        id: 'suggestion',
        label: '오타 제안 (고추가루 → 고춧가루)',
        path: '/products?q=고추가루',
        render: () =>
          list({
            query: '고추가루',
            suggestion: '고춧가루',
            onClearQuery: noop,
            items: [],
            totalCount: 0,
          }),
      },
      {
        id: 'suggestion-with-results',
        label: '오타 제안 + 결과 있음',
        path: '/products?q=사가',
        render: () =>
          list({
            query: '사가',
            suggestion: '사과',
            onClearQuery: noop,
            items: apples,
            totalCount: apples.length,
          }),
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
        label: '연결 전 (지금 화면: 판매자·팔로우)',
        render: () => detail({ seller: undefined, onToggleFollow: undefined }),
      },
      {
        id: 'liked',
        label: '관심 담음',
        toast: { message: '관심 상품에 담았어요', actionLabel: '관심 상품 보기' },
        render: () => detail({ seller: undefined, onToggleFollow: undefined, liked: true }),
      },
      {
        id: 'like-failed',
        label: '관심 실패 (되돌림)',
        toast: {
          message: '관심 상품에 담지 못했어요. 잠시 뒤 다시 시도해 주세요',
          actionLabel: '다시 시도',
        },
        render: () => detail({ seller: undefined, onToggleFollow: undefined }),
      },
      {
        id: 'admin',
        label: '관리자 (관심 막힘)',
        render: () =>
          detail({
            seller: undefined,
            onToggleLike: undefined,
            likeDisabledReason: WISH_ADMIN_REASON,
            onToggleFollow: undefined,
          }),
      },
      {
        id: 'guest-like',
        label: '비회원 관심 → 로그인',
        session: 'guest',
        render: () =>
          detail({ seller: undefined, loginPrompt: 'like', currentMemberId: undefined }),
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
        id: 'option-low-stock',
        label: '옵션 일부 품절 임박 (카드)',
        render: () => detail({ product: appleWith({ options: appleLowStockOptions }) }),
      },
      {
        id: 'option-low-stock-select',
        label: '옵션 일부 품절 임박 (6개 이상 Select)',
        render: () => detail({ product: appleWith({ options: appleManyLowStockOptions }) }),
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
      { id: 'review-keywords', label: '리뷰 키워드 칩', render: () => detail() },
      {
        id: 'review-keyword-selected',
        label: '리뷰 키워드 고름',
        render: () =>
          detail({
            selectedReviewKeywordId: 'C02',
            reviews: appleReviews.filter((r) => appleReviewKeywordIds[r.reviewId]?.includes('C02')),
            hasMoreReviews: false,
          }),
      },
      {
        id: 'review-keywords-empty',
        label: '리뷰 키워드 없음',
        render: () => detail({ reviewKeywords: [] }),
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
