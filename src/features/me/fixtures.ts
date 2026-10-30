import {
  ProductCategory,
  ProductRegion,
  ProductStatus,
  type ShippingAddress,
} from '@/shared/api/types'
import type { ProductCardItem } from '@/shared/ui'
import type { FollowedFarm, MyProfile, OrderCounts } from './types'

// 1단계 샘플 데이터. 다른 feature fixtures와 같은 값이다(DECISIONS.md E):
// 잔액 128,000원(wallet, 미리보기·테스트 전용 — 화면은 GET /wallets/me/balance), 주문 현황(orders: 준비 중 2 · 배송 중 1 · 배송 완료 1), 배송지(checkout·orders)

export const myProfile: MyProfile = {
  loginId: 'seoyeon88',
  email: 'seoyeon88@example.com',
  name: '이서연',
  nickname: '주말장보기',
}

export const MY_BALANCE = 128000

export const myOrderCounts: OrderCounts = { preparing: 2, shipping: 1, delivered: 1 }

export const myAddress: ShippingAddress = {
  recipientName: '이서연',
  recipientPhone: '010-2468-1357',
  zipCode: '04524',
  address: '서울 중구 세종대로 110',
  addressDetail: '3층 301호',
}

const product = (
  productId: number,
  name: string,
  category: ProductCategory,
  region: ProductRegion,
  price: number,
  extra: Partial<ProductCardItem['product']> = {},
): ProductCardItem['product'] => ({
  productId,
  name,
  thumbnailUrl: '',
  minSalePrice: price,
  minPriceListPrice: price,
  discountRate: 0,
  category,
  region,
  status: ProductStatus.ON_SALE,
  soldOut: false,
  reviewCount: 0,
  averageRating: 0,
  ...extra,
})

export const likedProducts: ProductCardItem[] = [
  {
    product: product(
      101,
      '청송 꿀사과 부사',
      ProductCategory.FRUIT,
      ProductRegion.GYEONGBUK,
      12900,
      {
        minPriceListPrice: 14500,
        discountRate: 11,
        reviewCount: 128,
        averageRating: 4.8,
      },
    ),
    sellerName: '청송 햇살농원',
    optionCount: 3,
  },
  {
    product: product(103, '제주 노지 조생 감귤', ProductCategory.FRUIT, ProductRegion.JEJU, 13900, {
      reviewCount: 54,
      averageRating: 4.7,
    }),
    sellerName: '서귀포 귤빛농장',
    optionCount: 2,
  },
  {
    product: product(
      104,
      '평창 고랭지 알배기배추',
      ProductCategory.VEGETABLE,
      ProductRegion.GANGWON,
      9900,
      {
        soldOut: true,
        reviewCount: 31,
        averageRating: 4.5,
      },
    ),
    sellerName: '대관령 고원농장',
    optionCount: 2,
  },
  {
    product: product(
      107,
      '대관령 햇감자 수미',
      ProductCategory.ROOT_CROP,
      ProductRegion.GANGWON,
      17900,
      {
        status: ProductStatus.ENDED,
        reviewCount: 40,
        averageRating: 4.4,
      },
    ),
    sellerName: '대관령 고원농장',
    optionCount: 1,
  },
]

export const followedFarms: FollowedFarm[] = [
  {
    seller: {
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
    productCount: 2,
  },
  {
    seller: {
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
    productCount: 1,
  },
  {
    seller: {
      sellerId: 10,
      storeName: '대관령 고원농장',
      representativeName: '최태호',
      region: ProductRegion.GANGWON,
      introduction: '해발 700m 고랭지에서 배추와 감자를 키워요.',
      customerServicePhone: '033-336-5502',
      profileImageUrl: null,
      followerCount: 418,
      suspended: true,
    },
    productCount: 0,
  },
]
