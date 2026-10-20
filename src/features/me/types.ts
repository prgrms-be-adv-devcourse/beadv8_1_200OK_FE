import type { SellerProfile } from '@/shared/api/types'

// TODO(api): ❌ 내 정보·배송지·관심·팔로우·탈퇴 API 없음. 필드는 시안 기준 임시.

/** 📝 GET /members/me */
export type MyProfile = {
  loginId: string
  email: string
  name: string
  nickname: string
}

/** 판매자 상태 (마이 홈 배지·판매자 안내 카드). 상점 이름은 판매자 프로필을 등록했을 때만 안다 */
export type MySellerStatus =
  | { status: 'none' }
  | { status: 'applying' }
  | { status: 'approved'; storeName?: string }

/** 주문 현황 숫자 */
export type OrderCounts = { preparing: number; shipping: number; delivered: number }

/** 팔로우한 농가 (📝 GET /members/me/followings) */
export type FollowedFarm = { seller: SellerProfile; productCount: number }

/** 탈퇴를 막는 이유 (C-13) */
export type WithdrawBlock = 'balance' | 'pending' | 'seller'

/** 📝 POST /members/me/withdrawal */
export enum WithdrawReason {
  RARELY_USED = 'RARELY_USED',
  NO_PRODUCT = 'NO_PRODUCT',
  PRICE = 'PRICE',
  ETC = 'ETC',
}
