import {
  ProductCategory,
  ProductRegion,
  ProductStatus,
  type SellerProfile,
} from '@/shared/api/types'
import type { ProductCardItem } from '@/shared/ui'

// 1단계 샘플 데이터. products/fixtures.ts의 농가·상품과 같은 값이다(feature끼리 import하지 않아 따로 둔다).

export const MY_SELLER_ID = 7

export const farmSellers: SellerProfile[] = [
  {
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
  {
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
]

// TODO(api): 판매자별 상품 목록 API가 없다(GET /products에 sellerId 파라미터 없음)
export const farmProducts: Record<number, ProductCardItem[]> = {
  7: [
    {
      product: {
        productId: 101,
        name: '청송 꿀사과 부사',
        thumbnailUrl: '',
        minSalePrice: 12900,
        minPriceListPrice: 14500,
        discountRate: 11,
        category: ProductCategory.FRUIT,
        region: ProductRegion.GYEONGBUK,
        status: ProductStatus.ON_SALE,
        soldOut: false,
        reviewCount: 128,
        averageRating: 4.8,
      },
      sellerName: '청송 햇살농원',
      optionCount: 3,
    },
    {
      product: {
        productId: 106,
        name: '청송 사과즙 100% (30포)',
        thumbnailUrl: '',
        minSalePrice: 29900,
        minPriceListPrice: 35000,
        discountRate: 14,
        category: ProductCategory.PROCESSED_AGRI,
        region: ProductRegion.GYEONGBUK,
        status: ProductStatus.ON_SALE,
        soldOut: false,
        reviewCount: 12,
        averageRating: 4.9,
      },
      sellerName: '청송 햇살농원',
      optionCount: 1,
    },
  ],
  8: [
    {
      product: {
        productId: 102,
        name: '해남 꿀고구마 베니하루카',
        thumbnailUrl: '',
        minSalePrice: 15900,
        minPriceListPrice: 15900,
        discountRate: 0,
        category: ProductCategory.ROOT_CROP,
        region: ProductRegion.JEONNAM,
        status: ProductStatus.ON_SALE,
        soldOut: false,
        reviewCount: 86,
        averageRating: 4.6,
      },
      sellerName: '땅끝고구마농장',
      optionCount: 2,
    },
  ],
}
