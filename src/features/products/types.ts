import type { ProductCategory, SellerProfile } from '@/shared/api/types'

// 화면 전용 타입. API 타입은 shared/api/types.ts를 그대로 쓰고, API에 없는 값만 여기서 정한다.

/** 목록·홈 데이터 영역의 상태 (QueryState status 중 목록이 쓰는 것) */
export type ListStatus = 'pending' | 'error' | 'success'

/** 카테고리 탭 한 칸. GET /products/categories 응답의 code·description */
export type CategoryOption = { code: ProductCategory; label: string }

// TODO(api): 인기 농가 목록 API 없음(❌), 팔로우 여부는 📝 GET /members/me/followings
export type FarmItem = { seller: SellerProfile; following: boolean }

/** 장바구니 담기 값 */
export type CartSelection = { optionId: number; quantity: number }
