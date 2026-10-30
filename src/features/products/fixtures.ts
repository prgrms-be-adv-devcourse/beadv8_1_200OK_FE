import {
  ProductCategory,
  ProductCategoryGroup,
  type ProductDetail,
  type ProductOption,
  ProductRegion,
  type ProductReview,
  ProductStatus,
  type ProductSummary,
  ReviewMediaType,
  type SellerProfile,
} from '@/shared/api/types'
import { categoryLabels } from '@/shared/lib/labels'
import type { ProductCardItem } from '@/shared/ui'
import type { CategoryOption, FarmItem } from './types'

// 1단계 샘플 데이터. 시안 값을 그대로 옮기지 않고 화면끼리 맞게 다시 만들었다(DECISIONS.md E).
// 금액·할인율은 API 규칙대로 계산했다: minSalePrice = 옵션 중 최저 판매가, minPriceListPrice·discountRate = 그 옵션 값.
// farms/fixtures.ts의 농가와 같은 값을 쓴다(feature끼리 import하지 않아 따로 둔다).

export const MY_MEMBER_ID = 21

export const categoryOptions: CategoryOption[] = Object.values(ProductCategory).map((code) => ({
  code,
  label: categoryLabels[code],
}))

// ─── 농가 ────────────────────────────────────────────────

export const sellers = {
  cheongsong: {
    sellerId: 7,
    storeName: '청송 햇살농원',
    representativeName: '김영수',
    region: ProductRegion.GYEONGBUK,
    introduction: '3대째 사과만 키우는 청송 부남면 과수원이에요.',
    customerServicePhone: '054-873-2210',
    profileImageUrl: null,
    followerCount: 1284,
    suspended: false,
  },
  haenam: {
    sellerId: 8,
    storeName: '땅끝고구마농장',
    representativeName: '박정희',
    region: ProductRegion.JEONNAM,
    introduction: '해남 황토밭에서 고구마와 감자를 길러요.',
    customerServicePhone: '061-532-1180',
    profileImageUrl: null,
    followerCount: 962,
    suspended: false,
  },
  seogwipo: {
    sellerId: 9,
    storeName: '서귀포 귤빛농장',
    representativeName: '고은비',
    region: ProductRegion.JEJU,
    introduction: '노지에서 햇볕을 듬뿍 받은 감귤만 보내요.',
    customerServicePhone: '064-733-4021',
    profileImageUrl: null,
    followerCount: 731,
    suspended: false,
  },
  daegwallyeong: {
    sellerId: 10,
    storeName: '대관령 고원농장',
    representativeName: '최태호',
    region: ProductRegion.GANGWON,
    introduction: '해발 700m 고랭지에서 배추와 감자를 키워요.',
    customerServicePhone: '033-336-5502',
    profileImageUrl: null,
    followerCount: 418,
    suspended: false,
  },
  jindo: {
    sellerId: 11,
    storeName: '진도 바닷바람농원',
    representativeName: '이순자',
    region: ProductRegion.JEONNAM,
    introduction: '바닷바람 맞고 자란 대파와 표고를 길러요.',
    customerServicePhone: '061-542-7731',
    profileImageUrl: null,
    followerCount: 205,
    suspended: false,
  },
} satisfies Record<string, SellerProfile>

export const farmItems: FarmItem[] = [
  { seller: sellers.cheongsong, following: true },
  { seller: sellers.haenam, following: false },
  { seller: sellers.seogwipo, following: false },
]

// ─── 상품 ────────────────────────────────────────────────

const summary = (
  base: Omit<ProductSummary, 'minSalePrice' | 'minPriceListPrice' | 'discountRate' | 'soldOut'>,
  options: ProductOption[],
): ProductSummary => {
  const cheapest = options.reduce((min, option) =>
    option.salePrice < min.salePrice ? option : min,
  )
  return {
    ...base,
    minSalePrice: cheapest.salePrice,
    minPriceListPrice: cheapest.listPrice,
    discountRate: cheapest.discountRate,
    soldOut: options.every((option) => option.soldOut),
  }
}

const option = (
  optionId: number,
  name: string,
  salePrice: number,
  listPrice = salePrice,
  soldOut = false,
): ProductOption => ({
  optionId,
  name,
  salePrice,
  listPrice,
  discountRate: Math.floor(((listPrice - salePrice) / listPrice) * 100),
  soldOut,
})

export const appleOptions: ProductOption[] = [
  option(1011, '1kg (5~6과)', 12900, 14500),
  option(1012, '2kg (11~13과)', 23900, 27000),
  option(1013, '3kg (16~18과)', 33900, 38000),
]

type Entry = { summary: ProductSummary; options: ProductOption[]; seller: SellerProfile }

const entry = (
  base: Parameters<typeof summary>[0],
  options: ProductOption[],
  seller: SellerProfile,
): Entry => ({ summary: summary(base, options), options, seller })

const entries: Entry[] = [
  entry(
    {
      productId: 101,
      name: '청송 꿀사과 부사',
      thumbnailUrl: '',
      category: ProductCategory.FRUIT,
      region: ProductRegion.GYEONGBUK,
      status: ProductStatus.ON_SALE,
      reviewCount: 128,
      averageRating: 4.8,
    },
    appleOptions,
    sellers.cheongsong,
  ),
  entry(
    {
      productId: 102,
      name: '해남 꿀고구마 베니하루카',
      thumbnailUrl: '',
      category: ProductCategory.ROOT_CROP,
      region: ProductRegion.JEONNAM,
      status: ProductStatus.ON_SALE,
      reviewCount: 86,
      averageRating: 4.6,
    },
    [option(1021, '3kg 한입 크기', 15900), option(1022, '5kg 중간 크기', 23900)],
    sellers.haenam,
  ),
  entry(
    {
      productId: 103,
      name: '제주 노지 조생 감귤',
      thumbnailUrl: '',
      category: ProductCategory.FRUIT,
      region: ProductRegion.JEJU,
      status: ProductStatus.ON_SALE,
      reviewCount: 54,
      averageRating: 4.7,
    },
    [option(1031, '3kg (S~M)', 13900), option(1032, '5kg (S~M)', 19900, 22000)],
    sellers.seogwipo,
  ),
  entry(
    {
      productId: 104,
      name: '평창 고랭지 알배기배추',
      thumbnailUrl: '',
      category: ProductCategory.VEGETABLE,
      region: ProductRegion.GANGWON,
      status: ProductStatus.ON_SALE,
      reviewCount: 31,
      averageRating: 4.5,
    },
    [option(1041, '2포기', 9900, 9900, true), option(1042, '4포기', 17900, 17900, true)],
    sellers.daegwallyeong,
  ),
  entry(
    {
      productId: 105,
      name: '무농약 흙대파',
      thumbnailUrl: '',
      category: ProductCategory.VEGETABLE,
      region: ProductRegion.JEONNAM,
      status: ProductStatus.ON_SALE,
      reviewCount: 0,
      averageRating: 0,
    },
    [option(1051, '1단 (약 1kg)', 6900)],
    sellers.jindo,
  ),
  entry(
    {
      productId: 106,
      name: '청송 사과즙 100% (30포)',
      thumbnailUrl: '',
      category: ProductCategory.PROCESSED_AGRI,
      region: ProductRegion.GYEONGBUK,
      status: ProductStatus.ON_SALE,
      reviewCount: 12,
      averageRating: 4.9,
    },
    [option(1061, '120ml × 30포', 29900, 35000)],
    sellers.cheongsong,
  ),
  entry(
    {
      productId: 107,
      name: '대관령 햇감자 수미',
      thumbnailUrl: '',
      category: ProductCategory.ROOT_CROP,
      region: ProductRegion.GANGWON,
      status: ProductStatus.ENDED,
      reviewCount: 40,
      averageRating: 4.4,
    },
    [option(1071, '5kg', 17900)],
    sellers.daegwallyeong,
  ),
  entry(
    {
      productId: 108,
      name: '진도 참나무 원목 표고버섯',
      thumbnailUrl: '',
      category: ProductCategory.MUSHROOM,
      region: ProductRegion.JEONNAM,
      status: ProductStatus.READY,
      reviewCount: 0,
      averageRating: 0,
    },
    [option(1081, '생표고 500g', 14900), option(1082, '건표고 200g', 21900)],
    sellers.jindo,
  ),
]

export const productSummaries: ProductSummary[] = entries.map((e) => e.summary)

// TODO(api): 판매자 상호·옵션 수·관심 여부는 상품 목록 API에 없다(A-2). 2단계에서 보강 방법을 정한다.
export const productCardItems: ProductCardItem[] = entries.map((e) => ({
  product: e.summary,
  sellerName: e.seller.storeName,
  optionCount: e.options.length,
  liked: e.summary.productId === 103,
}))

/** 상품 상세 경로 → 판매자 (TODO(api): 상세 API에 판매자가 없다) */
export function sellerOfProduct(productId: number): SellerProfile | undefined {
  return entries.find((e) => e.summary.productId === productId)?.seller
}

export function productDetailOf(productId: number): ProductDetail | undefined {
  const found = entries.find((e) => e.summary.productId === productId)
  if (!found) return undefined
  const { summary: s, options } = found
  return {
    productId: s.productId,
    name: s.name,
    descriptionHtml:
      s.productId === 101 ? appleDescription : `<p>${found.seller.storeName}에서 보내 드려요.</p>`,
    categoryGroup: ProductCategoryGroup.AGRICULTURE,
    category: s.category,
    region: s.region,
    status: s.status,
    minSalePrice: s.minSalePrice,
    minPriceListPrice: s.minPriceListPrice,
    discountRate: s.discountRate,
    soldOut: s.soldOut,
    reviewCount: s.reviewCount,
    averageRating: s.averageRating,
    imageUrls: ['', '', '', '', ''],
    options,
    createdAt: '2026-10-08T09:00:00Z',
    updatedAt: '2026-10-12T09:00:00Z',
  }
}

const appleDescription = [
  '<p>3대째 사과만 키우는 청송 부남면 과수원이에요. 10월 8일에 수확한 부사를 크기별로 골라 상자에 담아 보내 드려요.</p>',
  '<p>받으신 뒤 바로 냉장 보관하면 더 오래 아삭하게 드실 수 있어요.</p>',
].join('')

// ─── 리뷰 (최신순) ───────────────────────────────────────

export const appleReviews: ProductReview[] = [
  {
    reviewId: 5003,
    productId: 101,
    productOptionId: 1012,
    optionName: '2kg (11~13과)',
    memberId: MY_MEMBER_ID,
    rating: 9,
    content: '아이 간식으로 깎아 줬는데 아삭하고 단맛이 진해요. 크기도 고르게 왔어요.',
    media: [
      { type: ReviewMediaType.IMAGE, url: '' },
      { type: ReviewMediaType.IMAGE, url: '' },
    ],
    createdAt: '2026-10-12T10:20:00Z',
    updatedAt: '2026-10-12T10:20:00Z',
  },
  {
    reviewId: 5002,
    productId: 101,
    productOptionId: 1013,
    optionName: '3kg (16~18과)',
    memberId: 34,
    rating: 10,
    content:
      '멍든 것 없이 칸칸이 잘 포장돼 있었어요. 가게에서 쓰려고 3kg로 샀는데 다음에도 주문할게요.',
    media: [{ type: ReviewMediaType.VIDEO, url: '' }],
    createdAt: '2026-10-12T08:05:00Z',
    updatedAt: '2026-10-12T08:05:00Z',
  },
  {
    reviewId: 5001,
    productId: 101,
    productOptionId: 1011,
    optionName: '1kg (5~6과)',
    memberId: 45,
    rating: 8,
    content: '둘이 먹기에 1kg가 딱 좋아요. 냉장고에 넣어 두고 하나씩 꺼내 먹고 있어요.',
    media: [],
    createdAt: '2026-10-11T19:40:00Z',
    updatedAt: '2026-10-11T19:40:00Z',
  },
]
